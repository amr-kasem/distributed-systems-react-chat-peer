import React, { useRef, useEffect } from 'react';
import type { Message, Contact } from '../types';

interface ChatAreaProps {
    selectedContact: Contact | null;
    messages: Message[];
    userId: string;
    chatStatus: string;
    messageInput: string;
    onMessageInputChange: (value: string) => void;
    onSendMessage: () => void;
    onBack: () => void;
    onAccept: (peerId: string) => void;
    onDecline: (peerId: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
    selectedContact,
    messages,
    userId,
    chatStatus,
    messageInput,
    onMessageInputChange,
    onSendMessage,
    onBack,
    onAccept,
    onDecline
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!selectedContact) {
        return (
            <div className="empty-chat">
                <div className="empty-chat-icon">💬</div>
                <h2>Welcome to P2P Chat</h2>
                <p>Select a conversation from the sidebar to start messaging.</p>
            </div>
        );
    }


    return (
        <main className="chat-main">
            <header className="chat-header">
                <div className="active-contact-info">
                    <button className="back-btn" onClick={onBack}>←</button>
                    <div className="user-avatar header-avatar">
                        {selectedContact.name[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="contact-name">{selectedContact.name}</div>
                        <div className="connection-status">
                            {selectedContact.status === 'accepted'
                                ? chatStatus
                                : selectedContact.status.replace('_', ' ')}
                        </div>
                    </div>
                </div>
            </header>

            {selectedContact.status !== 'accepted' ? (
                <div className="acceptance-banner">
                    <div className="banner-content">
                        {selectedContact.status === 'pending' && (
                            <>
                                <div className="banner-icon">👋</div>
                                <h3>New Contact Request</h3>
                                <p>{selectedContact.name} ({selectedContact.peerId}) wants to chat with you.</p>
                                <div className="banner-actions">
                                    <button className="decline-btn" onClick={() => onDecline(selectedContact.peerId)}>Decline</button>
                                    <button className="accept-btn" onClick={() => onAccept(selectedContact.peerId)}>Accept Request</button>
                                </div>
                            </>
                        )}
                        {selectedContact.status === 'request_sent' && (
                            <>
                                <div className="banner-icon">⏳</div>
                                <h3>Request Sent</h3>
                                <p>Waiting for {selectedContact.name} to accept your request.</p>
                                <div className="banner-actions">
                                    <button className="decline-btn" onClick={() => onDecline(selectedContact.peerId)}>Cancel Request</button>
                                </div>
                            </>
                        )}
                        {selectedContact.status === 'deleted' && (
                            <>
                                <div className="banner-icon">📁</div>
                                <h3>Chat Preserved (Private)</h3>
                                <p>You have removed this contact. History is preserved for you.</p>
                                <div className="banner-actions">
                                    <button className="accept-btn" onClick={() => onAccept(selectedContact.peerId)}>Re-add Contact</button>
                                </div>
                            </>
                        )}
                        {selectedContact.status === 'remotely_deleted' && (
                            <>
                                <div className="banner-icon">🚫</div>
                                <h3>User Disconnected</h3>
                                <p>{selectedContact.name} has removed you from their contacts.</p>
                                <div className="banner-actions">
                                    <button className="decline-btn" onClick={() => onDecline(selectedContact.peerId)}>Stop Chat (Hide)</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="messages-container">
                        {messages.map(msg => (
                            <div key={msg.id} className={`message ${msg.senderId === userId ? 'sent' : 'received'} `}>
                                <div className="message-text">{msg.content}</div>
                                <div className="message-time">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {msg.senderId === userId && (
                                        <span className={`status - icon ${msg.status} `}>
                                            {msg.status === 'pending' && ' 🕒'}
                                            {msg.status === 'sent' && ' ✓'}
                                            {msg.status === 'delivered' && ' ✓✓'}
                                            {msg.status === 'read' && ' ✓✓'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="composer">
                        <input
                            type="text"
                            placeholder="Type your message..."
                            value={messageInput}
                            onChange={(e) => onMessageInputChange(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
                        />
                        <button
                            className="send-btn"
                            onClick={onSendMessage}
                            disabled={!messageInput.trim()}
                            title="Send"
                        >
                            ➤
                        </button>
                    </div>
                </>
            )}
        </main>
    );
};
