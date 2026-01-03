import {
    type IChatCoordinator,
    type ISignalingService,
    type IWebRTCService,
    type IMessageRepository,
    type IContactRepository,
    type IConnectionManager,
    type IMessageService,
    type IContactService,
    type Message,
    type Contact,
    type SignalingMessage,
} from '../types';
import { Logger } from '../utils/Logger';
import { withTimeout } from '../utils/RetryHelper';

// SOLID: Single Responsibility - Coordinates all chat services
// SOLID: Dependency Inversion - Depends on abstractions, not concretions
export class ChatCoordinator implements IChatCoordinator {
    private readonly logger = new Logger('Coordinator');

    private messageCallbacks: ((message: Message) => void)[] = [];
    private connectionStateCallbacks: ((state: string) => void)[] = [];
    private contactRequestCallbacks: ((from: string, name: string) => void)[] = [];
    private contactResponseCallbacks: ((from: string, accepted: boolean, name?: string) => void)[] = [];
    private errorCallbacks: ((error: string) => void)[] = [];

    private readonly signalingService: ISignalingService;
    private readonly webrtcService: IWebRTCService;
    private readonly messageRepository: IMessageRepository;
    private readonly contactRepository: IContactRepository;
    private readonly connectionManager: IConnectionManager;
    private readonly messagingService: IMessageService;
    private readonly contactService: IContactService;
    private readonly userId: string;
    private currentPeerId: string | null = null;

    // Operation timeout
    private readonly operationTimeoutMs = 30000;

    constructor(
        signalingService: ISignalingService,
        webrtcService: IWebRTCService,
        messageRepository: IMessageRepository,
        contactRepository: IContactRepository,
        connectionManager: IConnectionManager,
        messagingService: IMessageService,
        contactService: IContactService,
        userId: string
    ) {
        this.signalingService = signalingService;
        this.webrtcService = webrtcService;
        this.messageRepository = messageRepository;
        this.contactRepository = contactRepository;
        this.connectionManager = connectionManager;
        this.messagingService = messagingService;
        this.contactService = contactService;
        this.userId = userId;
    }

    async initialize(): Promise<void> {
        this.setupSignalingHandlers();
        this.setupWebRTCHandlers();
        this.setupMessagingHandlers();

        try {
            const connected = await withTimeout(
                () => this.signalingService.connect(),
                15000,
                'Signaling connect'
            );

            if (!connected) {
                throw new Error('Failed to connect to signaling service');
            }
        } catch (error) {
            this.logger.e('Initialization failed:', error);
            this.emitError(`Initialization failed: ${error}`);
            throw error;
        }
    }

    async sendMessage(content: string): Promise<void> {
        try {
            await withTimeout(
                () => this.messagingService.sendMessage(content),
                this.operationTimeoutMs,
                'Send message'
            );
        } catch (error) {
            this.logger.e('Failed to send message:', error);
            this.emitError(`Failed to send message: ${error}`);
            throw error;
        }
    }

    async selectContact(contact: Contact): Promise<void> {
        try {
            this.currentPeerId = contact.peerId;
            this.connectionManager.setChatOpened(contact.peerId, true);
            this.messagingService.setCurrentPeer(contact.peerId);
            await this.connectionManager.connectToPeer(contact.peerId);
        } catch (error) {
            this.logger.e('Failed to select contact:', error);
            this.emitError(`Failed to open chat: ${error}`);
            throw error;
        }
    }

    getMessages(peerId: string): Message[] {
        return this.messageRepository.getMessages(this.userId, peerId);
    }

    async addContact(peerId: string, name: string): Promise<boolean> {
        try {
            const success = await this.contactService.addContact(peerId, name);
            if (success) {
                await this.contactService.sendContactRequest(peerId, name);
            }
            return success;
        } catch (error) {
            this.logger.e('Failed to add contact:', error);
            this.emitError(`Failed to add contact: ${error}`);
            return false;
        }
    }

    async acceptContact(peerId: string, name: string): Promise<void> {
        try {
            await this.contactService.acceptContact(peerId, name);
        } catch (error) {
            this.logger.e('Failed to accept contact:', error);
            this.emitError(`Failed to accept contact: ${error}`);
            throw error;
        }
    }

    async declineContact(peerId: string): Promise<void> {
        try {
            await this.contactService.declineContact(peerId);
        } catch (error) {
            this.logger.e('Failed to decline contact:', error);
            this.emitError(`Failed to decline contact: ${error}`);
            throw error;
        }
    }

    async removeContact(peerId: string): Promise<void> {
        try {
            await this.contactService.removeContact(peerId);
        } catch (error) {
            this.logger.e('Failed to remove contact:', error);
            this.emitError(`Failed to remove contact: ${error}`);
            throw error;
        }
    }

    dispose(): void {
        try {
            this.signalingService.disconnect();
            this.webrtcService.close();
        } catch (error) {
            this.logger.e('Error during dispose:', error);
        }
    }

    onMessageReceived(callback: (message: Message) => void): void {
        this.messageCallbacks.push(callback);
    }

    onConnectionStateChange(callback: (state: string) => void): void {
        this.connectionStateCallbacks.push(callback);
    }

    onContactRequest(callback: (from: string, name: string) => void): void {
        this.contactRequestCallbacks.push(callback);
    }

    onContactResponse(callback: (from: string, accepted: boolean, name?: string) => void): void {
        this.contactResponseCallbacks.push(callback);
    }

    /**
     * Subscribe to error events for UI notification
     */
    onError(callback: (error: string) => void): void {
        this.errorCallbacks.push(callback);
    }

    private emitError(error: string): void {
        this.errorCallbacks.forEach((cb) => cb(error));
    }

    private setupSignalingHandlers(): void {
        this.signalingService.onSignalingMessage((message) => {
            this.handleSignalingMessageSafe(message);
        });
    }

    private setupWebRTCHandlers(): void {
        this.webrtcService.onIceCandidate((candidate) => {
            this.safeAsync(async () => {
                if (this.currentPeerId) {
                    const message: SignalingMessage = {
                        runtimeType: 'iceCandidate',
                        from: this.userId,
                        to: this.currentPeerId,
                        candidate: candidate.toJSON(),
                    };
                    this.signalingService.sendSignalingMessage(message, this.currentPeerId);
                }
            });
        });

        this.connectionManager.onConnectionStateChange((state) => {
            this.connectionStateCallbacks.forEach((cb) => cb(state));
            if (state === 'Connected') {
                this.safeAsync(() => this.messagingService.flushPendingMessages());
            }
        });
    }

    private setupMessagingHandlers(): void {
        this.messagingService.onMessageReceived((message) => {
            this.messageCallbacks.forEach((cb) => cb(message));
        });
    }

    /**
     * Wrapper for async operations with error boundary
     */
    private safeAsync(operation: () => Promise<void>): void {
        operation().catch((error) => {
            this.logger.e('Async operation failed:', error);
            this.emitError(`Operation failed: ${error}`);
        });
    }

    private handleSignalingMessageSafe(message: SignalingMessage): void {
        try {
            // Auto-add unknown peers (except for deletion/response)
            if (message.runtimeType !== 'contactDeleted' && message.runtimeType !== 'contactResponse') {
                this.ensureContactExists(message.from, message.name);
            }
            this.handleSignalingMessage(message);
        } catch (error) {
            this.logger.e('Failed to handle signaling message:', error);
            this.emitError(`Signaling error: ${error}`);
        }
    }

    private ensureContactExists(peerId: string, name?: string): void {
        const existing = this.contactRepository.get(peerId);
        if (!existing || existing.status === 'deleted' || existing.status === 'remotely_deleted') {
            this.logger.i(`Ensuring contact exists for peer ${peerId}`);
            this.contactRepository.add({
                peerId: peerId,
                name: name || peerId,
                status: 'pending',
                addedAt: new Date(),
            }, 'pending');

            // Trigger UI refresh
            this.contactRequestCallbacks.forEach((cb) =>
                cb(peerId, name || peerId)
            );
        }
    }

    private handleSignalingMessage(message: SignalingMessage): void {
        switch (message.runtimeType) {
            case 'offer':
                this.safeAsync(() => this.handleOffer(message));
                break;
            case 'answer':
                this.safeAsync(() => this.handleAnswer(message));
                break;
            case 'iceCandidate':
                this.safeAsync(() => this.handleIceCandidate(message));
                break;
            case 'contactRequest':
                // Handled by handleSignalingMessageSafe -> ensureContactExists
                break;
            case 'contactResponse':
                if (message.accepted) {
                    this.contactRepository.update(message.from, {
                        status: 'accepted',
                        name: message.name,
                    });
                } else {
                    this.contactRepository.update(message.from, { status: 'deleted' });
                }
                this.contactResponseCallbacks.forEach((cb) =>
                    cb(message.from, message.accepted || false, message.name)
                );
                break;
            case 'chatPresence':
                if (message.isOpened) {
                    this.safeAsync(() => this.connectionManager.connectToPeer(message.from));
                }
                break;
        }
    }

    private async handleOffer(message: SignalingMessage): Promise<void> {
        if (!message.sdp) return;

        try {
            // Polite Peer Pattern: Handle Glare
            const signalingState = this.webrtcService.getSignalingState();
            if (signalingState === 'have-local-offer') {
                const isImpolite = this.userId > message.from;
                if (isImpolite) {
                    this.logger.i(
                        `Glare detected. I am Impolite (${this.userId} > ${message.from}). Ignoring their offer.`
                    );
                    return;
                } else {
                    this.logger.i(
                        `Glare detected. I am Polite (${this.userId} < ${message.from}). Accepting their offer.`
                    );
                    await this.webrtcService.setLocalDescription({ type: 'rollback' });
                }
            }

            this.currentPeerId = message.from;
            this.messagingService.setCurrentPeer(message.from);

            await this.webrtcService.setRemoteDescription(message.sdp);
            const answer = await this.webrtcService.createAnswer();

            const answerMsg: SignalingMessage = {
                runtimeType: 'answer',
                from: this.userId,
                to: message.from,
                sdp: answer,
            };
            this.signalingService.sendSignalingMessage(answerMsg, message.from);
        } catch (error) {
            this.logger.e('Failed to handle offer:', error);
            this.emitError(`Failed to process offer: ${error}`);
        }
    }

    private async handleAnswer(message: SignalingMessage): Promise<void> {
        if (!message.sdp) return;

        try {
            await this.webrtcService.setRemoteDescription(message.sdp);
        } catch (error) {
            this.logger.e('Failed to handle answer:', error);
            this.emitError(`Failed to process answer: ${error}`);
        }
    }

    private async handleIceCandidate(message: SignalingMessage): Promise<void> {
        if (!message.candidate) return;

        try {
            await this.webrtcService.addIceCandidate(message.candidate);
        } catch (error) {
            // Don't emit error for ICE candidates as they're often transient
            this.logger.e('Failed to add ICE candidate:', error);
        }
    }

    getUserId(): string {
        return this.userId;
    }

    getAllContacts(): Contact[] {
        return this.contactRepository.getAll();
    }
}