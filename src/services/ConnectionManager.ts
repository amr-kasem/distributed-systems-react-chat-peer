import {
    type IConnectionManager,
    type ISignalingService,
    type IWebRTCService,
    type SignalingMessage,
} from '../types';
import { Logger } from '../utils/Logger';
import {
    ReconnectionManager,
    RetryConfigs,
    withTimeout,
} from '../utils/RetryHelper';

type ConnectionManagerState =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'failed';

// SOLID: Single Responsibility - Manages WebRTC connection lifecycle
// SOLID: Interface Segregation - Implements focused IConnectionManager interface
export class ConnectionManager implements IConnectionManager {
    private readonly logger = new Logger('ConnectionManager');
    private readonly signalingService: ISignalingService;
    private readonly webrtcService: IWebRTCService;
    private readonly userId: string;

    private currentPeerId: string | null = null;
    private isChatOpen = false;
    private state: ConnectionManagerState = 'disconnected';

    // Timers
    private presenceInterval: ReturnType<typeof setInterval> | null = null;
    private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

    // Retry management
    private connectionAttempt = 0;
    private readonly maxConnectionAttempts = 5;
    private reconnectionManager = new ReconnectionManager();

    // Configuration
    private readonly presenceIntervalMs = 10000;
    private readonly healthCheckIntervalMs = 5000;

    private connectionStateCallbacks: ((state: string) => void)[] = [];

    constructor(
        signalingService: ISignalingService,
        webrtcService: IWebRTCService,
        userId: string
    ) {
        this.signalingService = signalingService;
        this.webrtcService = webrtcService;
        this.userId = userId;
    }

    async connectToPeer(peerId: string): Promise<void> {
        const connectionState = this.webrtcService.getConnectionState();

        // Skip if already connected
        if (
            this.currentPeerId === peerId &&
            (connectionState === 'connected' || connectionState === 'connecting')
        ) {
            this.logger.i(
                `Already connected/connecting to ${peerId} (State: ${connectionState}). Skipping.`
            );
            return;
        }

        // Skip if already connecting
        if (this.state === 'connecting') {
            this.logger.i('Already connecting. Skipping duplicate request.');
            return;
        }

        const signalingState = this.webrtcService.getSignalingState();
        if (signalingState !== 'stable') {
            this.logger.i(
                `Signaling state is '${signalingState}'. Negotiation in progress. Skipping.`
            );
            return;
        }

        this.currentPeerId = peerId;
        this.setState('connecting');
        this.connectionAttempt = 0;

        await this.attemptConnection(peerId);
    }

    private async attemptConnection(peerId: string): Promise<void> {
        this.connectionAttempt++;
        this.logger.i(
            `Connection attempt ${this.connectionAttempt}/${this.maxConnectionAttempts} to ${peerId}`
        );

        try {
            const offer = await withTimeout(
                () => this.webrtcService.createOffer(),
                10000,
                'Create offer'
            );

            const message: SignalingMessage = {
                runtimeType: 'offer',
                from: this.userId,
                to: peerId,
                sdp: offer,
            };

            this.signalingService.sendSignalingMessage(message, peerId);
            this.logger.i(`Sent offer to ${peerId}`);
        } catch (error) {
            this.logger.e('Failed to create/send offer:', error);
            await this.handleConnectionFailure(peerId);
        }
    }

    private async handleConnectionFailure(peerId: string): Promise<void> {
        if (this.connectionAttempt < this.maxConnectionAttempts) {
            this.setState('reconnecting');

            // Calculate backoff delay (quadratic)
            const delayMs = Math.min(
                1000 * this.connectionAttempt * this.connectionAttempt,
                30000
            );

            this.logger.i(
                `Retrying connection in ${Math.round(delayMs / 1000)}s (attempt ${this.connectionAttempt})`
            );

            await new Promise((resolve) => setTimeout(resolve, delayMs));

            // Check if still should reconnect
            if (this.isChatOpen && this.currentPeerId === peerId) {
                await this.attemptConnection(peerId);
            }
        } else {
            this.logger.e('Max connection attempts reached');
            this.setState('failed');
        }
    }

    setChatOpened(peerId: string, opened: boolean): void {
        this.isChatOpen = opened;

        if (!opened) {
            this.stopTimers();
            this.sendPresence(peerId, false);
            this.webrtcService.close();
            this.setState('disconnected');
            this.currentPeerId = null;
        } else {
            this.currentPeerId = peerId;
            this.startPresenceHeartbeat(peerId);
            this.startHealthCheck();
        }
    }

    onConnectionStateChange(callback: (state: string) => void): void {
        this.connectionStateCallbacks.push(callback);

        this.webrtcService.onConnectionStateChange((state) => {
            this.handleWebRTCStateChange(state);
        });
    }

    private handleWebRTCStateChange(state: RTCPeerConnectionState): void {
        let stateStr: string;

        switch (state) {
            case 'connected':
                this.setState('connected');
                this.connectionAttempt = 0;
                stateStr = 'Connected';
                break;
            case 'connecting':
                stateStr = 'Connecting';
                break;
            case 'disconnected':
                stateStr = 'Disconnected';
                this.handleDisconnection();
                break;
            case 'failed':
                this.setState('failed');
                stateStr = 'Failed';
                this.handleConnectionFailed();
                break;
            case 'closed':
                this.setState('disconnected');
                stateStr = 'Disconnected';
                break;
            default:
                stateStr = 'Connecting...';
        }

        this.connectionStateCallbacks.forEach((cb) => cb(stateStr));
    }

    private handleDisconnection(): void {
        if (this.isChatOpen && this.currentPeerId) {
            this.logger.i('Disconnected, will attempt recovery');
            // Health check will handle reconnection if needed
        }
    }

    private handleConnectionFailed(): void {
        if (this.isChatOpen && this.currentPeerId) {
            this.logger.i('Connection failed, attempting reconnection');
            this.triggerReconnection();
        }
    }

    private triggerReconnection(): void {
        if (this.state === 'reconnecting') return;
        if (!this.currentPeerId) return;

        this.setState('reconnecting');
        this.connectionStateCallbacks.forEach((cb) => cb('Reconnecting'));

        const peerId = this.currentPeerId;

        this.reconnectionManager.reconnectWithBackoff({
            connectFn: async () => {
                if (!this.currentPeerId || !this.isChatOpen) return false;

                this.webrtcService.close();
                await this.connectToPeer(peerId);

                // Wait a bit for connection to establish
                await new Promise((resolve) => setTimeout(resolve, 3000));

                return this.webrtcService.getConnectionState() === 'connected';
            },
            config: RetryConfigs.webrtc,
            onAttempt: (attempt) => {
                this.logger.i(`Reconnect attempt ${attempt}`);
                this.connectionStateCallbacks.forEach((cb) =>
                    cb(`Reconnecting (${attempt})`)
                );
            },
            onSuccess: () => {
                this.logger.i('Reconnected successfully');
                this.setState('connected');
                this.connectionStateCallbacks.forEach((cb) => cb('Connected'));
            },
            onGiveUp: (attempts) => {
                this.logger.e(`Gave up reconnecting after ${attempts} attempts`);
                this.setState('failed');
                this.connectionStateCallbacks.forEach((cb) => cb('Failed'));
            },
        });
    }

    private sendPresence(peerId: string, isOpened: boolean): void {
        try {
            const message: SignalingMessage = {
                runtimeType: 'chatPresence',
                from: this.userId,
                to: peerId,
                isOpened,
            };
            this.signalingService.sendSignalingMessage(message, peerId);
        } catch (e) {
            this.logger.w('Presence send failed:', e);
            // Don't throw - presence is best effort
        }
    }

    private startPresenceHeartbeat(peerId: string): void {
        this.stopPresenceHeartbeat();

        // Send initial presence
        this.sendPresence(peerId, true);

        this.presenceInterval = setInterval(() => {
            if (this.isChatOpen && this.currentPeerId === peerId) {
                this.sendPresence(peerId, true);
            } else {
                this.stopPresenceHeartbeat();
            }
        }, this.presenceIntervalMs);
    }

    private stopPresenceHeartbeat(): void {
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
            this.presenceInterval = null;
        }
    }

    private startHealthCheck(): void {
        this.stopHealthCheck();

        this.healthCheckInterval = setInterval(() => {
            if (!this.isChatOpen || !this.currentPeerId) {
                this.stopHealthCheck();
                return;
            }

            const connectionState = this.webrtcService.getConnectionState();

            // Check if connection is stale
            if (
                connectionState === 'disconnected' ||
                connectionState === 'failed'
            ) {
                if (this.state !== 'reconnecting') {
                    this.logger.w('Health check detected disconnection');
                    this.triggerReconnection();
                }
            }
        }, this.healthCheckIntervalMs);
    }

    private stopHealthCheck(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    private stopTimers(): void {
        this.stopPresenceHeartbeat();
        this.stopHealthCheck();
        this.reconnectionManager.cancelReconnection();
    }

    private setState(newState: ConnectionManagerState): void {
        if (this.state !== newState) {
            this.logger.i(`State change ${this.state} -> ${newState}`);
            this.state = newState;
        }
    }

    dispose(): void {
        this.stopTimers();
    }
}