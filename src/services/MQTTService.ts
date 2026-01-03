import mqtt from 'mqtt';
import type { SignalingMessage, ISignalingService } from '../types';
import {
    ReconnectionManager,
    RetryConfigs,
    type ConnectionState,
} from '../utils/RetryHelper';

interface PendingSignalingMessage {
    message: SignalingMessage;
    targetId: string;
    queuedAt: Date;
}

// SOLID: Single Responsibility - Only handles MQTT signaling
// SOLID: Interface Segregation - Implements focused ISignalingService interface
export class MQTTService implements ISignalingService {
    private client: mqtt.MqttClient | null = null;
    private readonly _userId: string;
    private readonly broker = 'ws://broker.hivemq.com:8000/mqtt';

    private signalingCallbacks: ((message: SignalingMessage) => void)[] = [];
    private connectionStateCallbacks: ((state: ConnectionState) => void)[] = [];

    // Offline message queue
    private pendingMessages: PendingSignalingMessage[] = [];
    private readonly maxQueueSize = 100;

    // Connection state management
    private connectionState: ConnectionState = 'disconnected';
    private isManualDisconnect = false;
    private reconnectionManager = new ReconnectionManager();

    // Heartbeat for connection health
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private readonly heartbeatIntervalMs = 30000;

    constructor(userId: string) {
        this._userId = userId;
    }

    async connect(): Promise<boolean> {
        this.isManualDisconnect = false;
        this.setConnectionState('connecting');

        return new Promise((resolve) => {
            console.log('MQTT: Connecting to', this.broker);

            const connectTimeout = setTimeout(() => {
                console.error('MQTT: Connection timeout');
                this.setConnectionState('disconnected');
                resolve(false);
            }, 10000);

            try {
                this.client = mqtt.connect(this.broker, {
                    clientId: `react_client_${this._userId}`,
                    clean: true,
                    reconnectPeriod: 0, // We handle reconnection ourselves
                    connectTimeout: 10000,
                });

                this.client.on('connect', () => {
                    clearTimeout(connectTimeout);
                    console.log('MQTT: Connected successfully');

                    const topic = `p2p-chat/signaling/${this._userId}`;
                    this.client?.subscribe(topic, { qos: 1 }, (err) => {
                        if (err) {
                            console.error('MQTT: Subscription error:', err);
                            this.setConnectionState('failed');
                            resolve(false);
                        } else {
                            console.log('MQTT: Subscribed to', topic);
                            this.setConnectionState('connected');
                            this.reconnectionManager.reset();
                            this.startHeartbeat();
                            this.flushPendingMessages();
                            resolve(true);
                        }
                    });
                });

                this.client.on('message', (_topic, payload) => {
                    try {
                        const message = JSON.parse(
                            payload.toString()
                        ) as SignalingMessage;
                        console.log(
                            'MQTT: Received signaling message:',
                            message.runtimeType
                        );
                        this.signalingCallbacks.forEach((cb) => cb(message));
                    } catch (e) {
                        console.error('MQTT: Failed to parse message:', e);
                    }
                });

                this.client.on('error', (error) => {
                    clearTimeout(connectTimeout);
                    console.error('MQTT: Connection error:', error);
                    this.setConnectionState('failed');
                    resolve(false);
                });

                this.client.on('close', () => {
                    console.log('MQTT: Connection closed');
                    this.stopHeartbeat();
                    this.setConnectionState('disconnected');

                    // Auto-reconnect if not manually disconnected
                    if (
                        !this.isManualDisconnect &&
                        !this.reconnectionManager.getIsReconnecting()
                    ) {
                        this.startReconnection();
                    }
                });

                this.client.on('offline', () => {
                    console.log('MQTT: Client went offline');
                    this.setConnectionState('disconnected');
                });
            } catch (e) {
                clearTimeout(connectTimeout);
                console.error('MQTT: Failed to create client:', e);
                this.setConnectionState('failed');
                resolve(false);
            }
        });
    }

    sendSignalingMessage(message: SignalingMessage, targetId: string): void {
        if (!this.client?.connected) {
            console.warn('MQTT: Not connected, queueing message for', targetId);
            this.queueMessage(message, targetId);

            // Trigger reconnection if not already in progress
            if (
                !this.reconnectionManager.getIsReconnecting() &&
                !this.isManualDisconnect
            ) {
                this.startReconnection();
            }
            return;
        }

        const topic = `p2p-chat/signaling/${targetId}`;
        const payload = JSON.stringify(message);

        this.client.publish(topic, payload, { qos: 1 }, (err) => {
            if (err) {
                console.error('MQTT: Publish error:', err);
                this.queueMessage(message, targetId);
            } else {
                console.log('MQTT: Sent signaling message to', targetId);
            }
        });
    }

    onSignalingMessage(callback: (message: SignalingMessage) => void): void {
        this.signalingCallbacks.push(callback);
    }

    onConnectionStateChange(callback: (state: ConnectionState) => void): void {
        this.connectionStateCallbacks.push(callback);
    }

    disconnect(): void {
        console.log('MQTT: Disconnecting');
        this.isManualDisconnect = true;
        this.reconnectionManager.cancelReconnection();
        this.stopHeartbeat();
        this.client?.end();
        this.setConnectionState('disconnected');
    }

    get userId(): string {
        return this._userId;
    }

    get isConnected(): boolean {
        return this.connectionState === 'connected' && !!this.client?.connected;
    }

    get pendingMessageCount(): number {
        return this.pendingMessages.length;
    }

    private setConnectionState(state: ConnectionState): void {
        if (this.connectionState !== state) {
            this.connectionState = state;
            this.connectionStateCallbacks.forEach((cb) => cb(state));
        }
    }

    private queueMessage(message: SignalingMessage, targetId: string): void {
        // Remove oldest messages if queue is full
        while (this.pendingMessages.length >= this.maxQueueSize) {
            this.pendingMessages.shift();
            console.warn('MQTT: Queue full, dropping oldest message');
        }

        this.pendingMessages.push({
            message,
            targetId,
            queuedAt: new Date(),
        });

        console.log(
            `MQTT: Message queued (${this.pendingMessages.length} pending)`
        );
    }

    private async flushPendingMessages(): Promise<void> {
        if (this.pendingMessages.length === 0) return;

        console.log(
            `MQTT: Flushing ${this.pendingMessages.length} pending messages`
        );

        // Copy and clear queue
        const toSend = [...this.pendingMessages];
        this.pendingMessages = [];

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        for (const pending of toSend) {
            // Skip stale messages
            if (pending.queuedAt < fiveMinutesAgo) {
                console.warn(
                    'MQTT: Dropping stale message to',
                    pending.targetId
                );
                continue;
            }

            try {
                if (this.client?.connected) {
                    const topic = `p2p-chat/signaling/${pending.targetId}`;
                    const payload = JSON.stringify(pending.message);

                    await new Promise<void>((resolve, reject) => {
                        this.client?.publish(
                            topic,
                            payload,
                            { qos: 1 },
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                } else {
                    // Re-queue if not connected
                    this.pendingMessages.push(pending);
                }
            } catch (e) {
                console.error('MQTT: Failed to flush message, re-queuing:', e);
                this.pendingMessages.push(pending);
            }
        }
    }

    private startReconnection(): void {
        this.setConnectionState('reconnecting');

        this.reconnectionManager.reconnectWithBackoff({
            connectFn: async () => {
                // Need to close and recreate client
                this.client?.end(true);
                return await this.connect();
            },
            config: RetryConfigs.mqtt,
            onAttempt: (attempt, delayMs) => {
                console.log(
                    `MQTT: Reconnection attempt ${attempt}, next in ${Math.round(delayMs / 1000)}s`
                );
            },
            onSuccess: () => {
                console.log('MQTT: Reconnected successfully');
            },
            onGiveUp: (attempts) => {
                console.error(
                    `MQTT: Gave up reconnecting after ${attempts} attempts`
                );
                this.setConnectionState('failed');
            },
        });
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.client?.connected) {
                // Client library handles ping/pong internally
                // This is just for monitoring
                console.debug('MQTT: Heartbeat - connection healthy');
            } else {
                console.warn('MQTT: Heartbeat - connection lost');
                this.stopHeartbeat();
                if (!this.isManualDisconnect) {
                    this.startReconnection();
                }
            }
        }, this.heartbeatIntervalMs);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
}
