const USER_ID_KEY = 'p2p_chat_user_id';

export function generateUserId(): string {
    const letters = Array.from({ length: 3 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');

    const digits = Array.from({ length: 3 }, () =>
        Math.floor(Math.random() * 10)
    ).join('');

    return `${letters}-${digits}`;
}

export function getUserId(): string {
    let userId = localStorage.getItem(USER_ID_KEY);

    if (!userId) {
        userId = generateUserId();
        localStorage.setItem(USER_ID_KEY, userId);
    }

    return userId;
}

export function resetUserId(): string {
    const newId = generateUserId();
    localStorage.setItem(USER_ID_KEY, newId);
    return newId;
}
