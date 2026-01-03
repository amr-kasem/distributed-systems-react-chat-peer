import { useState, useEffect, useRef } from 'react';
import { ServiceFactory } from '../services/ServiceFactory';
import type { Message, IChatCoordinator, Contact } from '../types';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { ContactModal } from './ContactModal';
import { DialogModal } from './DialogModal';
import './ChatApp.css';

// SOLID: Single Responsibility - UI coordination only
// SOLID: Dependency Inversion - Uses factory for service creation
function ChatApp() {
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [chatStatus, setChatStatus] = useState('Initializing...');
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isSidebarHidden, setIsSidebarHidden] = useState(false);
    const [userId, setUserId] = useState('Loading...');
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [dialog, setDialog] = useState<{
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm: () => void;
        onCancel?: () => void;
        defaultValue?: string;
        onConfirmWithValue?: (value: string) => void;
    } | null>(null);

    const coordinatorRef = useRef<IChatCoordinator | null>(null);

    const handleIncomingContactRequest = (_from: string, _name: string) => {
        if (!coordinatorRef.current) return;

        setContacts(coordinatorRef.current.getAllContacts());
    };

    const handleContactResponse = (_from: string, accepted: boolean, _name?: string) => {
        if (!coordinatorRef.current) return;

        setContacts(coordinatorRef.current.getAllContacts());

        setDialog({
            title: 'Contact Response',
            message: accepted
                ? `Contact request accepted!`
                : `Contact request rejected.`,
            onConfirm: () => setDialog(null)
        });
    };

    useEffect(() => {
        const initializeApp = async () => {
            try {
                // SOLID: Dependency Inversion - Factory creates and wires all dependencies
                const coordinator = ServiceFactory.createChatCoordinator();
                coordinatorRef.current = coordinator;

                // Set up event handlers
                coordinator.onMessageReceived((message) => {
                    setMessages(prev => {
                        const index = prev.findIndex(m => m.id === message.id);
                        if (index !== -1) {
                            const newMessages = [...prev];
                            newMessages[index] = message;
                            return newMessages;
                        }
                        return [...prev, message];
                    });
                });

                coordinator.onConnectionStateChange((state) => {
                    setChatStatus(state);
                });

                coordinator.onContactRequest(handleIncomingContactRequest);
                coordinator.onContactResponse(handleContactResponse);

                // Initial contacts load
                setContacts(coordinator.getAllContacts());

                // Set user ID from coordinator
                setUserId(coordinator.getUserId());

                // Initialize coordinator (connects to MQTT)
                await coordinator.initialize();

                setChatStatus('Ready'); // connected var is void
            } catch (error) {
                console.error('Failed to initialize chat:', error);
                setChatStatus('Initialization Error');
            }
        };

        initializeApp();

        return () => {
            if (coordinatorRef.current) {
                console.log('ChatApp: Disposing coordinator');
                coordinatorRef.current.dispose();
                coordinatorRef.current = null;
            }
        };
    }, []);

    const handleSelectContact = async (contact: Contact) => {
        setSelectedContact(contact);
        if (coordinatorRef.current) {
            const messageHistory = coordinatorRef.current.getMessages(contact.peerId);
            setMessages(messageHistory);
            await coordinatorRef.current.selectContact(contact);
        }
        if (window.innerWidth <= 768) setIsSidebarHidden(true);
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedContact || !coordinatorRef.current) return;

        const content = messageInput;
        setMessageInput('');

        await coordinatorRef.current.sendMessage(content);
    };

    const handleSaveContact = async (peerId: string, name: string) => {
        if (!coordinatorRef.current) return;

        if (editingContact) {
            // Coordinator updateContact logic if available, otherwise just refresh
            setContacts(coordinatorRef.current.getAllContacts());
        } else {
            const success = await coordinatorRef.current.addContact(peerId.trim(), name.trim());
            if (!success) {
                setDialog({
                    title: 'Error',
                    message: 'A contact with this Peer ID already exists.',
                    onConfirm: () => setDialog(null)
                });
                return;
            }
        }
        setContacts(coordinatorRef.current.getAllContacts());
        setShowModal(false);
        setEditingContact(null);
    };

    const handleEditContact = (contact: Contact) => {
        setEditingContact(contact);
        setShowModal(true);
    };

    const handleRemoveContact = async (peerId: string) => {
        if (!coordinatorRef.current) return;

        const contact = coordinatorRef.current.getAllContacts().find(c => c.peerId === peerId);
        setDialog({
            title: 'Remove Contact',
            message: `Are you sure you want to remove ${contact?.name || 'this contact'}?`,
            confirmLabel: 'Remove',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                await coordinatorRef.current!.removeContact(peerId);
                setContacts(coordinatorRef.current!.getAllContacts());
                if (selectedContact?.peerId === peerId) {
                    setSelectedContact(null);
                }
                setDialog(null);
            },
            onCancel: () => setDialog(null)
        });
    };

    const handleAcceptContact = async (peerId: string) => {
        if (!coordinatorRef.current) return;

        const contact = coordinatorRef.current.getAllContacts().find(c => c.peerId === peerId);
        if (!contact) return;

        setDialog({
            title: 'Accept Contact Request',
            message: `Enter a name for this contact(${peerId}): `,
            defaultValue: contact.name,
            confirmLabel: 'Accept & Save',
            cancelLabel: 'Cancel',
            onConfirmWithValue: async (name: string) => {
                await coordinatorRef.current!.acceptContact(peerId, name);
                setContacts(coordinatorRef.current!.getAllContacts());
                const updated = coordinatorRef.current!.getAllContacts().find(c => c.peerId === peerId);
                if (updated) setSelectedContact(updated);
                setDialog(null);
            },
            onCancel: () => setDialog(null),
            onConfirm: () => { }
        });
    };

    const handleDeclineContact = async (peerId: string) => {
        if (!coordinatorRef.current) return;

        await coordinatorRef.current.declineContact(peerId);
        setContacts(coordinatorRef.current.getAllContacts());
        if (selectedContact?.peerId === peerId) {
            setSelectedContact(null);
        }
    };

    const handleBack = () => {
        setIsSidebarHidden(false);
    };

    return (
        <div className="chat-app">
            <Sidebar
                userId={userId}
                contacts={contacts}
                selectedContactId={selectedContact?.peerId}
                onSelectContact={handleSelectContact}
                onAddContact={() => { setEditingContact(null); setShowModal(true); }}
                onEditContact={handleEditContact}
                onRemoveContact={handleRemoveContact}
                isHidden={isSidebarHidden}
            />

            <ChatArea
                selectedContact={selectedContact}
                messages={messages}
                userId={userId}
                chatStatus={chatStatus}
                messageInput={messageInput}
                onMessageInputChange={setMessageInput}
                onSendMessage={handleSendMessage}
                onBack={handleBack}
                onAccept={handleAcceptContact}
                onDecline={handleDeclineContact}
            />

            {showModal && (
                <ContactModal
                    onSave={handleSaveContact}
                    onClose={() => { setShowModal(false); setEditingContact(null); }}
                    initialContact={editingContact}
                />
            )}

            {dialog && (
                <DialogModal
                    title={dialog.title}
                    message={dialog.message}
                    confirmLabel={dialog.confirmLabel}
                    cancelLabel={dialog.cancelLabel}
                    onConfirm={dialog.onConfirm}
                    onCancel={dialog.onCancel}
                    defaultValue={dialog.defaultValue}
                    onConfirmWithValue={dialog.onConfirmWithValue}
                />
            )}
        </div>
    );
}

export default ChatApp;
