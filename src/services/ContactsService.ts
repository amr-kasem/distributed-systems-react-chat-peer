import { type Contact, type IContactRepository } from '../types';

// SOLID: Single Responsibility - Only handles contact storage
// SOLID: Interface Segregation - Implements focused IContactRepository interface
export class ContactsService implements IContactRepository {
    private readonly STORAGE_KEY = 'p2p_chat_contacts';

    getAll(): Contact[] {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) return [];

        const contacts = JSON.parse(data);
        return contacts.map((c: { peerId: string; name: string; addedAt: string; status: string; autoAccept: boolean }) => ({
            ...c,
            addedAt: new Date(c.addedAt),
        }));
    }

    add(contact: Omit<Contact, 'addedAt' | 'autoAccept' | 'status'>, status: Contact['status'] = 'request_sent'): boolean {
        const contacts = this.getAll();
        const existingIndex = contacts.findIndex(c => c.peerId === contact.peerId);

        if (existingIndex !== -1) {
            // If contact exists but is 'deleted', we can re-add it
            if (contacts[existingIndex].status === 'deleted' || contacts[existingIndex].status === 'remotely_deleted') {
                contacts[existingIndex] = {
                    ...contacts[existingIndex],
                    ...contact,
                    status,
                };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts));
                return true;
            }
            return false;
        }

        const newContact: Contact = {
            ...contact,
            addedAt: new Date(),
            status,
        };
        contacts.push(newContact);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts));
        return true;
    }

    softDelete(peerId: string): void {
        const contacts = this.getAll().map(c =>
            c.peerId === peerId ? { ...c, status: 'deleted' as const } : c
        );
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts));
    }

    remove(peerId: string): void {
        const contacts = this.getAll().filter(c => c.peerId !== peerId);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts));
    }

    isContact(peerId: string): boolean {
        return this.getAll().some(c => c.peerId === peerId);
    }

    get(peerId: string): Contact | null {
        return this.getAll().find(c => c.peerId === peerId) || null;
    }

    update(peerId: string, updates: Partial<Contact>): void {
        const contacts = this.getAll().map(c =>
            c.peerId === peerId ? { ...c, ...updates } : c
        );
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts));
    }
}
