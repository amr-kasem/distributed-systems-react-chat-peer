/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    addJitter: boolean;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
    value?: T;
    error?: Error;
    attempts: number;
    success: boolean;
}

/**
 * Predefined retry configurations
 */
export const RetryConfigs = {
    mqtt: {
        maxAttempts: 10,
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        backoffMultiplier: 2.0,
        addJitter: true,
    } as RetryConfig,

    webrtc: {
        maxAttempts: 3,
        initialDelayMs: 500,
        maxDelayMs: 10000,
        backoffMultiplier: 2.0,
        addJitter: true,
    } as RetryConfig,

    message: {
        maxAttempts: 3,
        initialDelayMs: 2000,
        maxDelayMs: 15000,
        backoffMultiplier: 2.0,
        addJitter: true,
    } as RetryConfig,

    default: {
        maxAttempts: 5,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2.0,
        addJitter: true,
    } as RetryConfig,
};

/**
 * Sleep utility
 */
export const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculate delay with optional jitter
 */
function calculateDelay(baseDelayMs: number, config: RetryConfig): number {
    if (!config.addJitter) return baseDelayMs;

    // Add jitter of ±25%
    const jitterFactor = 0.75 + Math.random() * 0.5;
    return Math.floor(baseDelayMs * jitterFactor);
}

/**
 * Execute an operation with retry logic and exponential backoff
 */
export async function retry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = RetryConfigs.default,
    options?: {
        retryIf?: (error: Error) => boolean;
        onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
    }
): Promise<RetryResult<T>> {
    let attempt = 0;
    let currentDelayMs = config.initialDelayMs;

    while (attempt < config.maxAttempts) {
        attempt++;
        try {
            const result = await operation();
            return { value: result, attempts: attempt, success: true };
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));

            // Check if we should retry this error
            if (options?.retryIf && !options.retryIf(error)) {
                return { error, attempts: attempt, success: false };
            }

            // Check if we've exhausted retries
            if (attempt >= config.maxAttempts) {
                return { error, attempts: attempt, success: false };
            }

            // Calculate delay with optional jitter
            const delay = calculateDelay(currentDelayMs, config);
            options?.onRetry?.(attempt, error, delay);

            // Wait before next attempt
            await sleep(delay);

            // Update delay for next attempt
            currentDelayMs = Math.min(
                currentDelayMs * config.backoffMultiplier,
                config.maxDelayMs
            );
        }
    }

    return {
        error: new Error('Retry exhausted without success'),
        attempts: attempt,
        success: false,
    };
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName?: string
): Promise<T> {
    return Promise.race([
        operation(),
        new Promise<T>((_, reject) =>
            setTimeout(
                () =>
                    reject(
                        new Error(
                            `${operationName || 'Operation'} timed out after ${timeoutMs}ms`
                        )
                    ),
                timeoutMs
            )
        ),
    ]);
}

/**
 * Connection state for services
 */
export type ConnectionState =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'failed';

/**
 * Class for managing reconnection logic
 */
export class ReconnectionManager {
    private reconnectAttempt = 0;
    private isReconnecting = false;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    getReconnectAttempt(): number {
        return this.reconnectAttempt;
    }

    getIsReconnecting(): boolean {
        return this.isReconnecting;
    }

    async reconnectWithBackoff(options: {
        connectFn: () => Promise<boolean>;
        config: RetryConfig;
        onAttempt?: (attempt: number, delayMs: number) => void;
        onSuccess?: () => void;
        onGiveUp?: (totalAttempts: number) => void;
    }): Promise<boolean> {
        if (this.isReconnecting) return false;

        this.isReconnecting = true;
        this.reconnectAttempt = 0;
        let delayMs = options.config.initialDelayMs;

        while (
            this.reconnectAttempt < options.config.maxAttempts &&
            this.isReconnecting
        ) {
            this.reconnectAttempt++;
            options.onAttempt?.(this.reconnectAttempt, delayMs);

            try {
                const connected = await options.connectFn();
                if (connected) {
                    this.isReconnecting = false;
                    this.reconnectAttempt = 0;
                    options.onSuccess?.();
                    return true;
                }
            } catch {
                // Continue to retry
            }

            if (this.reconnectAttempt >= options.config.maxAttempts) {
                this.isReconnecting = false;
                options.onGiveUp?.(this.reconnectAttempt);
                return false;
            }

            // Wait before next attempt
            await sleep(delayMs);

            // Calculate next delay with backoff
            delayMs = Math.min(
                delayMs * options.config.backoffMultiplier,
                options.config.maxDelayMs
            );
        }

        this.isReconnecting = false;
        return false;
    }

    cancelReconnection(): void {
        this.isReconnecting = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    reset(): void {
        this.reconnectAttempt = 0;
        this.isReconnecting = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }
}
