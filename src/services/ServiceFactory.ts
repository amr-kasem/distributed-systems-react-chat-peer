import {
    type IChatCoordinator,
    type ISignalingService,
    type IWebRTCService,
    type IMessageRepository,
    type IContactRepository,
    type IConnectionManager,
    type IMessageService,
    type IContactService,
} from '../types';
import { ChatCoordinator } from './ChatCoordinator';
import { MQTTService } from './MQTTService';
import { WebRTCService } from './WebRTCService';
import { MessageService } from './MessageService';
import { ContactsService } from './ContactsService';
import { ConnectionManager } from './ConnectionManager';
import { MessagingService } from './MessagingService';
import { ContactService } from './ContactService';
import { getUserId } from '../utils/idGenerator';

// SOLID: Dependency Inversion - Factory creates and wires dependencies
export class ServiceFactory {
    static createChatCoordinator(userId?: string): IChatCoordinator {
        const actualUserId = userId || getUserId();

        // Create low-level services
        const signalingService: ISignalingService = new MQTTService(actualUserId);
        const webrtcService: IWebRTCService = new WebRTCService();

        // Create repositories
        const messageRepository: IMessageRepository = new MessageService();
        const contactRepository: IContactRepository = new ContactsService();

        // Create domain services
        const connectionManager: IConnectionManager = new ConnectionManager(
            signalingService,
            webrtcService,
            actualUserId
        );

        const messagingService: IMessageService = new MessagingService(
            webrtcService,
            messageRepository,
            actualUserId
        );

        const contactService: IContactService = new ContactService(
            signalingService,
            contactRepository
        );

        // Create coordinator
        return new ChatCoordinator(
            signalingService,
            webrtcService,
            messageRepository,
            contactRepository,
            connectionManager,
            messagingService,
            contactService,
            actualUserId
        );
    }
}