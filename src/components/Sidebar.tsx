import React from 'react';
import type { Contact } from '../types';

interface SidebarProps {
    userId: string;
    contacts: Contact[];
    selectedContactId?: string;
    onSelectContact: (contact: Contact) => void;
    onAddContact: () => void;
    onEditContact: (contact: Contact) => void;
    onRemoveContact: (peerId: string) => void;
    isHidden: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
    userId,
    contacts,
    selectedContactId,
    onSelectContact,
    onAddContact,
    onEditContact,
    onRemoveContact,
    isHidden
}) => {
    return (
        <aside className={`sidebar ${isHidden ? 'hidden' : ''}`}>
            <div className="sidebar-header">
                <div className="user-profile">
                    <div className="user-avatar">{userId.substring(0, 1).toUpperCase()}</div>
                    <div className="user-info">
                        <div className="me-label">My ID</div>
                        <div className="my-id">
                            {userId}
                            <button
                                className="copy-icon-btn"
                                title="Copy ID"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(userId);
                                }}
                            >
                                📋
                            </button>
                        </div>
                    </div>
                </div>
                <button className="add-btn" onClick={onAddContact}>
                    <span>+</span> Add New Contact
                </button>
            </div>

            <div className="contacts-list">
                {contacts.filter(c => c.status !== 'deleted').map(contact => (
                    <div
                        key={contact.peerId}
                        className={`contact-item ${selectedContactId === contact.peerId ? 'active' : ''}`}
                        onClick={() => onSelectContact(contact)}
                    >
                        <div className="avatar">
                            {contact.name[0].toUpperCase()}
                            <div className={`status-indicator ${contact.status === 'accepted' ? 'online' : 'offline'}`}></div>
                        </div>
                        <div className="contact-details">
                            <div className="contact-name">
                                {contact.name}
                                {contact.status === 'pending' && <span className="status-badge pending">Pending</span>}
                                {contact.status === 'request_sent' && <span className="status-badge sent">Sent</span>}
                                {contact.status === 'remotely_deleted' && <span className="status-badge disconnected">Disconnected</span>}
                            </div>
                            <div className="contact-last-msg">{contact.peerId}</div>
                        </div>
                        <div className="contact-actions">
                            <button
                                className="action-btn"
                                title="Edit"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditContact(contact);
                                }}
                            >
                                ✏️
                            </button>
                            <button
                                className="action-btn delete"
                                title="Remove"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveContact(contact.peerId);
                                }}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
                {contacts.length === 0 && (
                    <div className="empty-sidebar-state">
                        <p>No contacts yet.</p>
                        <p className="hint">Add a friend to start chatting</p>
                    </div>
                )}
            </div>
        </aside>
    );
};
