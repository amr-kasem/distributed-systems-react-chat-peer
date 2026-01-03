import React, { useState } from 'react';
import type { Contact } from '../types';

interface ContactModalProps {
    onSave: (peerId: string, name: string) => void;
    onClose: () => void;
    initialContact?: Contact | null;
}

export const ContactModal: React.FC<ContactModalProps> = ({ onSave, onClose, initialContact }) => {
    const [peerId, setPeerId] = useState(initialContact?.peerId ?? '');
    const [name, setName] = useState(initialContact?.name ?? '');

    const handleSubmit = () => {
        if (peerId && name) {
            onSave(peerId, name);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>{initialContact ? 'Edit Contact' : 'Add New Contact'}</h3>
                <p className="modal-description">
                    {initialContact
                        ? 'Update the display name for this contact.'
                        : "Enter your friend's unique ID to start a direct P2P connection."}
                </p>

                <div className="input-group">
                    <label>Peer ID</label>
                    <input
                        placeholder="e.g., ABC-123"
                        value={peerId}
                        onChange={(e) => setPeerId(e.target.value.toUpperCase())}
                        maxLength={7}
                        disabled={!!initialContact} // Peer ID shouldn't be changeable usually as it's the primary key
                    />
                </div>

                <div className="input-group">
                    <label>Display Name</label>
                    <input
                        placeholder="Friend's Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="modal-actions">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="save-btn"
                        onClick={handleSubmit}
                        disabled={!peerId || !name}
                    >
                        {initialContact ? 'Save Changes' : 'Add Friend'}
                    </button>
                </div>
            </div>
        </div>
    );
};
