import React, { useState } from 'react';

interface DialogModalProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    defaultValue?: string;
    onConfirmWithValue?: (value: string) => void;
}

export const DialogModal: React.FC<DialogModalProps> = ({
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel,
    onConfirm,
    onCancel,
    defaultValue,
    onConfirmWithValue
}) => {
    const [inputValue, setInputValue] = useState(defaultValue || '');

    const handleConfirm = () => {
        if (onConfirmWithValue) {
            onConfirmWithValue(inputValue);
        } else {
            onConfirm();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>{title}</h3>
                <p className="modal-description">{message}</p>
                {defaultValue !== undefined && (
                    <div className="modal-input-container">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="modal-input"
                            autoFocus
                            onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                    </div>
                )}
                <div className="modal-actions">
                    {cancelLabel && (
                        <button className="cancel-btn" onClick={onCancel}>
                            {cancelLabel}
                        </button>
                    )}
                    <button className="save-btn" onClick={handleConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
