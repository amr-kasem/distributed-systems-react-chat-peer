export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  status: 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface SignalingMessage {
  runtimeType: 'offer' | 'answer' | 'iceCandidate' | 'contactRequest' | 'contactResponse' | 'chatPresence' | 'contactDeleted';
  from: string;
  to: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  name?: string;     // For contactRequest/contactResponse
  accepted?: boolean; // For contactResponse
  isOpened?: boolean; // For chatPresence
}

export interface Contact {
  peerId: string;
  name: string;
  status: 'pending' | 'accepted' | 'request_sent' | 'deleted' | 'remotely_deleted';
  addedAt?: Date;
}

// SOLID Principles: Interface Segregation + Dependency Inversion
export interface IMessageRepository {
  saveMessage(userId: string, contactId: string, message: Message): void;
  getMessages(userId: string, contactId: string): Message[];
  updateMessageStatus(userId: string, contactId: string, messageId: string, status: Message['status']): void;
  getPendingMessages(userId: string, contactId: string): Message[];
}

export interface IContactRepository {
  add(contact: Contact, status: Contact['status']): boolean;
  get(id: string): Contact | null;
  getAll(): Contact[];
  update(id: string, updates: Partial<Contact>): void;
  remove(id: string): void;
  softDelete(id: string): void;
}

export interface ISignalingService {
  connect(): Promise<boolean>;
  disconnect(): void;
  sendSignalingMessage(message: SignalingMessage, targetId: string): void;
  onSignalingMessage(callback: (message: SignalingMessage) => void): void;
  get userId(): string;
}

export interface IWebRTCService {
  createOffer(): Promise<RTCSessionDescriptionInit>;
  createAnswer(): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
  addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>;
  sendMessage(content: string): void;
  close(): void;
  getConnectionState(): RTCPeerConnectionState;
  getSignalingState(): RTCSignalingState;
  onMessage(callback: (content: string) => void): void;
  onIceCandidate(callback: (candidate: RTCIceCandidate) => void): void;
  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void;
}

export interface IMessageService {
  sendMessage(content: string): Promise<void>;
  onMessageReceived(callback: (message: Message) => void): void;
  setCurrentPeer(peerId: string): void;
  flushPendingMessages(): Promise<void>;
}

export interface IContactService {
  addContact(peerId: string, name: string): Promise<boolean>;
  acceptContact(peerId: string, name: string): Promise<void>;
  declineContact(peerId: string): Promise<void>;
  removeContact(peerId: string): Promise<void>;
  sendContactRequest(peerId: string, name: string): Promise<void>;
  onContactRequest(callback: (from: string, name: string) => void): void;
  onContactResponse(callback: (from: string, accepted: boolean, name?: string) => void): void;
}

export interface IConnectionManager {
  connectToPeer(peerId: string): Promise<void>;
  setChatOpened(peerId: string, opened: boolean): void;
  onConnectionStateChange(callback: (state: string) => void): void;
}

export interface IChatCoordinator {
  initialize(): Promise<void>;
  sendMessage(content: string): Promise<void>;
  selectContact(contact: Contact): Promise<void>;
  addContact(peerId: string, name: string): Promise<boolean>;
  acceptContact(peerId: string, name: string): Promise<void>;
  declineContact(peerId: string): Promise<void>;
  removeContact(peerId: string): Promise<void>;
  dispose(): void;
  onMessageReceived(callback: (message: Message) => void): void;
  onConnectionStateChange(callback: (state: string) => void): void;
  onContactRequest(callback: (from: string, name: string) => void): void;
  onContactResponse(callback: (from: string, accepted: boolean, name?: string) => void): void;
  getUserId(): string;
  getAllContacts(): Contact[];
  getMessages(peerId: string): Message[];
}