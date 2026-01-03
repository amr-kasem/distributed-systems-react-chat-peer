
export class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    i(message: string, ...args: any[]): void {
        console.log(`[I] [${this.context}] ${message}`, ...args);
    }

    w(message: string, ...args: any[]): void {
        console.warn(`[W] [${this.context}] ${message}`, ...args);
    }

    e(message: string, ...args: any[]): void {
        console.error(`[E] [${this.context}] ${message}`, ...args);
    }

    d(message: string, ...args: any[]): void {
        console.debug(`[D] [${this.context}] ${message}`, ...args);
    }
}
