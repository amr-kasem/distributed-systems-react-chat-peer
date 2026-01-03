import {
    type IMessageService,
    type IWebRTCService,
    type Message,
    type IMessageRepository,
} from '../types';
import { Logger } from '../utils/Logger';

// SOLID: Single Responsibility - Handles message sending and receiving operations
// SOLID: Interface Segregation - Implements focused IMessageService interface
export class MessagingService implements IMessageService {
    private readonly logger = new Logger('Messaging');
    private peerId: string = '';
    private readonly webrtcService: IWebRTCService;
    private readonly messageRepository: IMessageRepository;
    private readonly userId: string;

    private messageCallbacks: ((message: Message) => void)[] = [];
    private statusCallbacks: ((messageId: string, status: Message['status']) => void)[] = [];

    // Retry configuration
    private readonly maxMessageRetries = 3;
    private retryCount: Map<string, number> = new Map();
    private retryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

    constructor(
        webrtcService: IWebRTCService,
        messageRepository: IMessageRepository,
        userId: string
    ) {
        this.webrtcService = webrtcService;
        this.messageRepository = messageRepository;
        this.userId = userId;
    }

    setCurrentPeer(peerId: string): void {
        this.peerId = peerId;
        // Clear retry state when peer changes
        this.cancelAllRetries();
    }

    async flushPendingMessages(): Promise<void> {
        if (!this.peerId) return;

        const pendingMessages = this.messageRepository.getPendingMessages(
            this.userId,
            this.peerId
        );

        if (pendingMessages.length === 0) return;

        this.logger.i(
            `Flushing ${pendingMessages.length} pending messages to ${this.peerId}`
        );

        for (const message of pendingMessages) {
            await this.sendWithRetry(message);
        }
    }

    async sendMessage(content: string): Promise<void> {
        // 1. Create message model
        const message: Message = {
            id: `msg_${Date.now()}`,
            senderId: this.userId,
            receiverId: this.peerId,
            content,
            timestamp: new Date(),
            status: 'pending',
        };

        // 2. Save as pending
        this.messageRepository.saveMessage(this.userId, this.peerId, message);

        // 3. Emit to UI
        this.messageCallbacks.forEach((cb) => cb(message));

        // 4. Send with retry logic
        await this.sendWithRetry(message);
    }

    private async sendWithRetry(message: Message): Promise<void> {
        const messageId = message.id;

        // Check if already retrying
        if (this.retryTimers.has(messageId)) {
            return;
        }

        // Initialize retry count
        if (!this.retryCount.has(messageId)) {
            this.retryCount.set(messageId, 0);
        }

        if (this.webrtcService.getConnectionState() !== 'connected') {
            this.logger.d(
                `Not connected, message ${messageId} will be sent when connected`
            );
            return;
        }

        try {
            this.webrtcService.sendMessage(message.content);

            // Update status to sent
            this.messageRepository.updateMessageStatus(
                this.userId,
                this.peerId,
                messageId,
                'sent'
            );

            // Emit updates
            const sentMessage: Message = { ...message, status: 'sent' };
            this.messageCallbacks.forEach((cb) => cb(sentMessage));
            this.statusCallbacks.forEach((cb) => cb(messageId, 'sent'));

            // Clear retry state
            this.retryCount.delete(messageId);
            const timer = this.retryTimers.get(messageId);
            if (timer) clearTimeout(timer);
            this.retryTimers.delete(messageId);

            this.logger.d(`Message ${messageId} sent successfully`);
        } catch (e) {
            this.logger.e(`Failed to send message ${messageId}:`, e);
            this.handleSendFailure(message);
        }
    }

    private handleSendFailure(message: Message): void {
        const messageId = message.id;
        const attempts = (this.retryCount.get(messageId) || 0) + 1;
        this.retryCount.set(messageId, attempts);

        if (attempts >= this.maxMessageRetries) {
            this.logger.e(
                `Message ${messageId} failed after ${attempts} attempts`
            );

            // Mark as failed
            this.messageRepository.updateMessageStatus(
                this.userId,
                this.peerId,
                messageId,
                'failed'
            );

            const failedMessage: Message = { ...message, status: 'failed' };
            this.messageCallbacks.forEach((cb) => cb(failedMessage));
            this.statusCallbacks.forEach((cb) => cb(messageId, 'failed'));

            // Clear retry state
            this.retryCount.delete(messageId);
            this.retryTimers.delete(messageId);
            return;
        }

        // Calculate backoff delay (quadratic)
        const delayMs = Math.min(1000 * attempts * attempts, 15000);

        this.logger.i(
            `Retrying message ${messageId} in ${Math.round(delayMs / 1000)}s (attempt ${attempts})`
        );

        // Clear existing timer
        const existingTimer = this.retryTimers.get(messageId);
        if (existingTimer) clearTimeout(existingTimer);

        // Schedule retry
        const timer = setTimeout(() => {
            this.retryTimers.delete(messageId);
            this.sendWithRetry(message);
        }, delayMs);

        this.retryTimers.set(messageId, timer);
    }

    onMessageReceived(callback: (message: Message) => void): void {
        this.messageCallbacks.push(callback);

        this.webrtcService.onMessage((content) => {
            const message: Message = {
                id: `msg_${Date.now()}`,
                senderId: this.peerId,
                receiverId: this.userId,
                content,
                timestamp: new Date(),
                status: 'delivered',
            };

            this.messageRepository.saveMessage(this.userId, this.peerId, message);
            this.messageCallbacks.forEach((cb) => cb(message));
        });
    }

    /**
     * Optional callback for message status updates
     */
    onMessageStatusUpdate(
        callback: (messageId: string, status: Message['status']) => void
    ): void {
        this.statusCallbacks.push(callback);
    }

    private cancelAllRetries(): void {
        for (const timer of this.retryTimers.values()) {
            clearTimeout(timer);
        }
        this.retryTimers.clear();
        this.retryCount.clear();
    }

    dispose(): void {
        this.cancelAllRetries();
    }
}