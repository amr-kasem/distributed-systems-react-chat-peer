import { type IContactService, type ISignalingService, type Contact, type SignalingMessage, type IContactRepository } from '../types';

// SOLID: Single Responsibility - Handles contact management operations
// SOLID: Interface Segregation - Implements focused IContactService interface
export class ContactService implements IContactService {
    private readonly signalingService: ISignalingService;
    private readonly contactRepository: IContactRepository;

    constructor(
        signalingService: ISignalingService,
        contactRepository: IContactRepository
    ) {
        this.signalingService = signalingService;
        this.contactRepository = contactRepository;
    }

    async addContact(peerId: string, name: string): Promise<boolean> {
        const contact: Contact = {
            peerId,
            name,
            status: 'request_sent',
            addedAt: new Date(),
        };

        // Persist contact first
        return this.contactRepository.add(contact, 'request_sent');
    }

    async acceptContact(peerId: string, name: string): Promise<void> {
        this.contactRepository.update(peerId, { name, status: 'accepted' });

        const message: SignalingMessage = {
            runtimeType: 'contactResponse',
            from: this.signalingService.userId,
            to: peerId,
            accepted: true,
            name: this.signalingService.userId,
        };
        this.signalingService.sendSignalingMessage(message, peerId);
    }

    async declineContact(peerId: string): Promise<void> {
        this.contactRepository.update(peerId, { status: 'deleted' });

        const message: SignalingMessage = {
            runtimeType: 'contactResponse',
            from: this.signalingService.userId,
            to: peerId,
            accepted: false,
            name: this.signalingService.userId,
        };
        this.signalingService.sendSignalingMessage(message, peerId);
    }

    async removeContact(peerId: string): Promise<void> {
        this.contactRepository.update(peerId, { status: 'deleted' });
    }

    async sendContactRequest(peerId: string, name: string): Promise<void> {
        const message: SignalingMessage = {
            runtimeType: 'contactRequest',
            from: this.signalingService.userId,
            to: peerId,
            name: name,
        };
        this.signalingService.sendSignalingMessage(message, peerId);
    }

    onContactRequest(_callback: (from: string, name: string) => void): void {
        // This would be handled by the coordinator that has access to signaling messages
    }

    onContactResponse(_callback: (from: string, accepted: boolean, name?: string) => void): void {
        // This would be handled by the coordinator that has access to signaling messages
    }
}