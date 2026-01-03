import { type IWebRTCService } from '../types';
import { Logger } from '../utils/Logger';
import { retry, RetryConfigs } from '../utils/RetryHelper';

// SOLID: Single Responsibility - Only handles WebRTC peer connections
// SOLID: Interface Segregation - Implements focused IWebRTCService interface
export class WebRTCService implements IWebRTCService {
    private readonly logger = new Logger('WebRTC');
    private peerConnection: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private pendingCandidates: RTCIceCandidateInit[] = [];

    private messageCallbacks: ((message: string) => void)[] = [];
    private connectionStateCallbacks: ((state: RTCPeerConnectionState) => void)[] = [];
    private iceCandidateCallbacks: ((candidate: RTCIceCandidate) => void)[] = [];

    // Stability improvements
    private connectionTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private iceRestartAttempts = 0;
    private readonly maxIceRestartAttempts = 3;
    private readonly connectionTimeoutMs = 30000;
    private isClosing = false;

    private configuration: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10,
    };

    async initialize() {
        this.logger.i('Initializing');
        this.peerConnection = new RTCPeerConnection(this.configuration);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.logger.d('ICE candidate generated');
                this.iceCandidateCallbacks.forEach((cb) => cb(event.candidate!));
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection?.connectionState;
            this.logger.i('Connection state changed to', state);
            if (state) {
                this.handleConnectionState(state);
            }
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection?.iceConnectionState;
            this.logger.i('ICE connection state changed to', state);
            if (state) {
                this.handleIceConnectionState(state);
            }
        };

        this.peerConnection.ondatachannel = (event) => {
            this.logger.i('Data channel received');
            this.setupDataChannel(event.channel);
        };
    }

    async setLocalDescription(
        description: RTCSessionDescriptionInit
    ): Promise<void> {
        if (!this.peerConnection) {
            await this.initialize();
        }
        this.logger.i('Setting local description', description.type);
        await this.peerConnection!.setLocalDescription(description);
    }

    async createOffer(): Promise<RTCSessionDescriptionInit> {
        this.cancelConnectionTimeout();

        if (!this.peerConnection) {
            await this.initialize();
        }

        // Create data channel for the initiator
        this.dataChannel = this.peerConnection!.createDataChannel('chat', {
            ordered: true,
        });
        this.setupDataChannel(this.dataChannel);

        this.logger.i('Creating offer');
        const offer = await this.peerConnection!.createOffer();
        await this.setLocalDescription(offer);
        this.logger.i('Created Offer SDP:', offer.sdp);

        this.startConnectionTimeout();
        return offer;
    }

    async createAnswer(): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            await this.initialize();
        }

        this.logger.i('Creating answer');
        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);
        this.logger.i('Created Answer SDP:', answer.sdp);
        return answer;
    }

    async setRemoteDescription(sdp: RTCSessionDescriptionInit) {
        if (!this.peerConnection) {
            await this.initialize();
        }

        this.logger.i('Setting remote description', sdp.type);
        this.logger.d('Remote SDP:', sdp.sdp);

        try {
            await this.setRemoteDescriptionWithRetry(sdp);
        } catch (error) {
            this.logger.e('Failed to set remote description after retries:', error);
            throw error;
        }

        // Flush pending candidates
        await this.drainPendingCandidates();
    }

    private async setRemoteDescriptionWithRetry(
        sdp: RTCSessionDescriptionInit
    ): Promise<void> {
        const result = await retry(
            async () => {
                await this.peerConnection!.setRemoteDescription(
                    new RTCSessionDescription(sdp)
                );
            },
            RetryConfigs.webrtc,
            {
                retryIf: (error) => {
                    const errorStr = error.message || '';
                    // Retry on SDP mismatch errors for offers
                    return (
                        sdp.type === 'offer' &&
                        (errorStr.includes('m-lines') ||
                            errorStr.includes('Failed to set remote'))
                    );
                },
                onRetry: async (attempt, error) => {
                    this.logger.w(
                        `Retrying setRemoteDescription (attempt ${attempt}): ${error.message}`
                    );

                    // Reset connection before retry
                    const savedCandidates = [...this.pendingCandidates];
                    await this.resetConnection();
                    this.pendingCandidates = savedCandidates;
                    await this.initialize();
                },
            }
        );

        if (!result.success) {
            throw result.error || new Error('Failed to set remote description');
        }
    }

    private async drainPendingCandidates(): Promise<void> {
        while (this.pendingCandidates.length > 0) {
            const candidate = this.pendingCandidates.shift();
            if (candidate) {
                try {
                    this.logger.i('Adding queued ICE candidate');
                    await this.peerConnection!.addIceCandidate(
                        new RTCIceCandidate(candidate)
                    );
                } catch (e) {
                    this.logger.e('Failed to add queued candidate:', e);
                }
            }
        }
    }

    async addIceCandidate(candidate: RTCIceCandidateInit) {
        if (!this.peerConnection || !this.peerConnection.remoteDescription) {
            this.logger.i('Queuing ICE candidate (not ready)');
            this.pendingCandidates.push(candidate);
            return;
        }

        try {
            this.logger.d('Adding ICE candidate');
            await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate)
            );
        } catch (e) {
            this.logger.e('Failed to add ICE candidate:', e);
            // Buffer the candidate in case of error
            this.pendingCandidates.push(candidate);
        }
    }

    sendMessage(message: string) {
        if (!this.dataChannel) {
            this.logger.e('Cannot send message - no data channel');
            throw new Error('Data channel not available');
        }

        if (this.dataChannel.readyState !== 'open') {
            this.logger.e(
                `Cannot send message - data channel not open (state: ${this.dataChannel.readyState})`
            );
            throw new Error('Data channel not open');
        }

        this.logger.d('Sending message');
        this.dataChannel.send(message);
    }

    private setupDataChannel(channel: RTCDataChannel) {
        this.dataChannel = channel;

        this.dataChannel.onmessage = (event) => {
            this.logger.d('Message received');
            this.messageCallbacks.forEach((cb) => cb(event.data));
        };

        this.dataChannel.onopen = () => {
            this.logger.i('Data channel opened');
        };

        this.dataChannel.onclose = () => {
            this.logger.i('Data channel closed');
            this.connectionStateCallbacks.forEach((cb) => cb('disconnected'));
        };

        this.dataChannel.onerror = (event) => {
            this.logger.e('Data channel error:', event);
        };
    }

    onMessage(callback: (content: string) => void): void {
        this.messageCallbacks.push(callback);
    }

    onConnectionStateChange(
        callback: (state: RTCPeerConnectionState) => void
    ): void {
        this.connectionStateCallbacks.push(callback);
    }

    onIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
        this.iceCandidateCallbacks.push(callback);
    }

    close() {
        if (this.isClosing) return;
        this.isClosing = true;

        this.logger.i('Closing connection');
        this.cancelConnectionTimeout();
        this.iceRestartAttempts = 0;

        try {
            this.dataChannel?.close();
        } catch (e) {
            this.logger.e('Error closing data channel:', e);
        }

        try {
            this.peerConnection?.close();
        } catch (e) {
            this.logger.e('Error closing peer connection:', e);
        }

        this.dataChannel = null;
        this.peerConnection = null;
        this.pendingCandidates = [];
        this.isClosing = false;
    }

    private async resetConnection(): Promise<void> {
        this.cancelConnectionTimeout();
        this.close();
    }

    /**
     * Restart ICE to recover from connection failures
     */
    async restartIce(): Promise<void> {
        if (!this.peerConnection) {
            this.logger.w('Cannot restart ICE - no peer connection');
            return;
        }

        if (this.iceRestartAttempts >= this.maxIceRestartAttempts) {
            this.logger.e('Max ICE restart attempts reached');
            this.connectionStateCallbacks.forEach((cb) => cb('failed'));
            return;
        }

        this.iceRestartAttempts++;
        this.logger.i(`Restarting ICE (attempt ${this.iceRestartAttempts})`);

        try {
            this.peerConnection.restartIce();
            this.startConnectionTimeout();
        } catch (e) {
            this.logger.e('ICE restart failed:', e);
        }
    }

    isConnected(): boolean {
        return this.peerConnection?.connectionState === 'connected';
    }

    getConnectionState(): RTCPeerConnectionState {
        return this.peerConnection?.connectionState || 'closed';
    }

    getSignalingState(): RTCSignalingState {
        return this.peerConnection?.signalingState || 'stable';
    }

    private handleConnectionState(state: RTCPeerConnectionState): void {
        switch (state) {
            case 'connected':
                this.cancelConnectionTimeout();
                this.iceRestartAttempts = 0;
                break;
            case 'failed':
                this.cancelConnectionTimeout();
                // Attempt ICE restart on failure
                this.restartIce();
                break;
            case 'closed':
                this.cancelConnectionTimeout();
                break;
        }

        this.connectionStateCallbacks.forEach((cb) => cb(state));
    }

    private handleIceConnectionState(state: RTCIceConnectionState): void {
        switch (state) {
            case 'failed':
                this.logger.w('ICE connection failed, attempting restart');
                this.restartIce();
                break;
            case 'disconnected':
                this.logger.w('ICE disconnected, waiting for recovery...');
                // Give it some time to recover before restarting
                setTimeout(() => {
                    if (
                        this.peerConnection?.iceConnectionState ===
                        'disconnected'
                    ) {
                        this.restartIce();
                    }
                }, 5000);
                break;
        }
    }

    private startConnectionTimeout(): void {
        this.cancelConnectionTimeout();
        this.connectionTimeoutId = setTimeout(() => {
            this.logger.w('Connection timeout');
            if (this.peerConnection?.connectionState !== 'connected') {
                this.connectionStateCallbacks.forEach((cb) =>
                    cb('failed' as RTCPeerConnectionState)
                );
                // Try ICE restart as recovery
                this.restartIce();
            }
        }, this.connectionTimeoutMs);
    }

    private cancelConnectionTimeout(): void {
        if (this.connectionTimeoutId) {
            clearTimeout(this.connectionTimeoutId);
            this.connectionTimeoutId = null;
        }
    }
}
