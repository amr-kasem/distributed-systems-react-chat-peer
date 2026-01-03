import { type Message, type IMessageRepository } from '../types';

// SOLID: Single Responsibility - Only handles message storage
// SOLID: Interface Segregation - Implements focused IMessageRepository interface
export class MessageService implements IMessageRepository {
    private readonly STORAGE_KEY_PREFIX = 'p2p_chat_messages_';

    getMessages(userId: string, contactId: string): Message[] {
        const key = this.getStorageKey(userId, contactId);
        const data = localStorage.getItem(key);
        if (!data) return [];

        try {
            const messages = JSON.parse(data);
            return messages.map((m: { id: string; senderId: string; receiverId: string; content: string; timestamp: string; status: string }) => ({
                ...m,
                timestamp: new Date(m.timestamp),
            }));
        } catch (e) {
            console.error('Failed to parse messages', e);
            return [];
        }
    }

    saveMessage(userId: string, contactId: string, message: Message): void {
        const messages = this.getMessages(userId, contactId);
        const index = messages.findIndex(m => m.id === message.id);
        if (index > -1) {
            messages[index] = message;
        } else {
            messages.push(message);
        }
        const key = this.getStorageKey(userId, contactId);
        localStorage.setItem(key, JSON.stringify(messages));
    }

    updateMessageStatus(userId: string, contactId: string, messageId: string, status: Message['status']): void {
        const messages = this.getMessages(userId, contactId);
        const msg = messages.find(m => m.id === messageId);
        if (msg) {
            msg.status = status;
            this.saveMessage(userId, contactId, msg);
        }
    }

    getPendingMessages(userId: string, contactId: string): Message[] {
        return this.getMessages(userId, contactId).filter(m => m.senderId === userId && m.status === 'pending');
    }

    clearMessages(userId: string, contactId: string): void {
        const key = this.getStorageKey(userId, contactId);
        localStorage.removeItem(key);
    }

    private getStorageKey(userId: string, contactId: string): string {
        // Use a consistent key regardless of who is sender/receiver
        const ids = [userId, contactId].sort();
        return `${this.STORAGE_KEY_PREFIX}${ids[0]}_${ids[1]}`;
    }
}
