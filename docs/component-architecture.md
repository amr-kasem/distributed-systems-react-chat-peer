# Component Architecture

## System Architecture Overview

```mermaid
graph TB
    subgraph "Presentation Layer"
        UI[React Components]
        ChatApp[ChatApp]
        ChatArea[ChatArea]
        Sidebar[Sidebar]
        Modals[Modals]
    end
    
    subgraph "Coordination Layer"
        Coordinator[ChatCoordinator]
    end
    
    subgraph "Service Layer"
        MQTTSvc[MQTTService]
        WebRTCSvc[WebRTCService]
        ConnMgr[ConnectionManager]
        MsgSvc[MessagingService]
        ContactSvc[ContactService]
    end
    
    subgraph "Repository Layer"
        MsgRepo[MessageRepository]
        ContactRepo[ContactRepository]
    end
    
    subgraph "Infrastructure Layer"
        IndexedDB[(IndexedDB)]
        MQTT[MQTT Broker]
        WebRTC[WebRTC]
    end
    
    UI --> Coordinator
    ChatApp --> Coordinator
    ChatArea --> Coordinator
    Sidebar --> Coordinator
    Modals --> Coordinator
    
    Coordinator --> MQTTSvc
    Coordinator --> WebRTCSvc
    Coordinator --> ConnMgr
    Coordinator --> MsgSvc
    Coordinator --> ContactSvc
    
    ConnMgr --> MQTTSvc
    ConnMgr --> WebRTCSvc
    MsgSvc --> WebRTCSvc
    MsgSvc --> MsgRepo
    ContactSvc --> ContactRepo
    
    MsgRepo --> IndexedDB
    ContactRepo --> IndexedDB
    MQTTSvc --> MQTT
    WebRTCSvc --> WebRTC
    
    style Coordinator fill:#4fc3f7
    style MQTTSvc fill:#ffb74d
    style WebRTCSvc fill:#81c784
    style IndexedDB fill:#ba68c8
```

## Component Details

### 1. Presentation Layer

#### ChatApp Component
```mermaid
graph LR
    ChatApp[ChatApp Component]
    ChatApp --> State[Application State]
    ChatApp --> Coord[ChatCoordinator]
    ChatApp --> Sidebar
    ChatApp --> ChatArea
    ChatApp --> Modals
    
    State --> |contacts| Sidebar
    State --> |messages| ChatArea
    State --> |selectedContact| ChatArea
    State --> |connectionStatus| ChatArea
```

**Responsibilities:**
- Main application container
- Manages global application state
- Coordinates UI components
- Handles user interactions
- Displays modals and dialogs

**State:**
- `contacts`: List of all contacts
- `selectedContact`: Currently selected contact
- `messages`: Messages for selected contact
- `connectionStatus`: Current connection state
- `showContactModal`: Contact dialog visibility

#### ChatArea Component
```mermaid
graph TB
    ChatArea[ChatArea Component]
    ChatArea --> Header[Chat Header]
    ChatArea --> Messages[Message List]
    ChatArea --> Input[Message Input]
    
    Header --> Status[Connection Status]
    Header --> ContactName[Contact Name]
    
    Messages --> MsgItem1[Message Item]
    Messages --> MsgItem2[Message Item]
    Messages --> MsgItemN[...]
    
    Input --> TextArea[Text Area]
    Input --> SendBtn[Send Button]
```

**Responsibilities:**
- Displays chat messages
- Shows connection status
- Handles message input
- Auto-scrolls to latest message
- Shows typing indicators

#### Sidebar Component
```mermaid
graph TB
    Sidebar[Sidebar Component]
    Sidebar --> UserInfo[User Info]
    Sidebar --> ContactList[Contact List]
    Sidebar --> AddBtn[Add Contact Button]
    
    ContactList --> Contact1[Contact Item]
    ContactList --> Contact2[Contact Item]
    ContactList --> ContactN[...]
    
    Contact1 --> Avatar[Avatar]
    Contact1 --> Name[Name]
    Contact1 --> Status[Status Indicator]
    Contact1 --> LastMsg[Last Message]
```

**Responsibilities:**
- Displays contact list
- Shows user information
- Provides add contact functionality
- Indicates connection status per contact
- Shows last message preview

### 2. Coordination Layer

#### ChatCoordinator
```mermaid
graph TB
    Coordinator[ChatCoordinator]
    
    subgraph "Dependencies"
        MQTT[MQTTService]
        WebRTC[WebRTCService]
        ConnMgr[ConnectionManager]
        MsgSvc[MessagingService]
        ContactSvc[ContactService]
        MsgRepo[MessageRepository]
        ContactRepo[ContactRepository]
    end
    
    Coordinator --> MQTT
    Coordinator --> WebRTC
    Coordinator --> ConnMgr
    Coordinator --> MsgSvc
    Coordinator --> ContactSvc
    Coordinator --> MsgRepo
    Coordinator --> ContactRepo
    
    Coordinator --> |Events| UI[UI Components]
    
    style Coordinator fill:#4fc3f7
```

**Responsibilities:**
- Orchestrates all services
- Provides unified API for UI
- Manages service lifecycle
- Handles cross-service coordination
- Implements event aggregation

**Key Methods:**
- `initialize()`: Initialize all services
- `sendMessage(content)`: Send a message
- `selectContact(contact)`: Select a contact to chat with
- `addContact(peerId, name)`: Add new contact
- `acceptContact(peerId, name)`: Accept contact request
- `dispose()`: Clean up resources

### 3. Service Layer

#### MQTTService
```mermaid
graph TB
    MQTT[MQTTService]
    
    MQTT --> Connect[connect]
    MQTT --> Disconnect[disconnect]
    MQTT --> Send[sendSignalingMessage]
    MQTT --> Listen[onSignalingMessage]
    MQTT --> Queue[Message Queue]
    MQTT --> Reconnect[ReconnectionManager]
    
    Connect --> Broker[MQTT Broker]
    Send --> Broker
    Broker --> Listen
    
    Queue --> |flush| Send
    Reconnect --> Connect
    
    style MQTT fill:#ffb74d
```

**Responsibilities:**
- MQTT broker connection management
- Signaling message transmission
- Message queuing when offline
- Automatic reconnection
- Heartbeat monitoring

**Configuration:**
- Broker URL: `ws://localhost:9001`
- Topics: `user/{userId}`
- QoS: 1 (at least once delivery)
- Reconnection: Exponential backoff

#### WebRTCService
```mermaid
graph TB
    WebRTC[WebRTCService]
    
    WebRTC --> PC[RTCPeerConnection]
    WebRTC --> DC[Data Channel]
    WebRTC --> ICE[ICE Handling]
    
    PC --> Offer[createOffer]
    PC --> Answer[createAnswer]
    PC --> SetRemote[setRemoteDescription]
    
    DC --> Send[sendMessage]
    DC --> Receive[onMessage]
    
    ICE --> Candidate[onIceCandidate]
    ICE --> AddCandidate[addIceCandidate]
    
    style WebRTC fill:#81c784
```

**Responsibilities:**
- WebRTC peer connection management
- SDP offer/answer creation
- ICE candidate handling
- Data channel management
- Message transmission

**Configuration:**
- ICE Servers: STUN/TURN servers
- Data Channel: Reliable, ordered
- Connection timeout: 30 seconds

#### ConnectionManager
```mermaid
graph TB
    ConnMgr[ConnectionManager]
    
    ConnMgr --> Connect[connectToPeer]
    ConnMgr --> Monitor[Connection Monitoring]
    ConnMgr --> Reconnect[Reconnection Logic]
    ConnMgr --> Presence[Presence Management]
    ConnMgr --> Health[Health Check]
    
    Monitor --> State[State Change Handler]
    Reconnect --> Retry[Retry Manager]
    Presence --> Heartbeat[Heartbeat Timer]
    Health --> Check[Health Check Timer]
    
    State --> |failed| Reconnect
    Retry --> |attempt| Connect
```

**Responsibilities:**
- Connection lifecycle management
- Connection health monitoring
- Automatic reconnection
- Presence heartbeat
- Connection state tracking

**Timers:**
- Presence heartbeat: 30 seconds
- Health check: 10 seconds
- Connection timeout: 30 seconds

#### MessagingService
```mermaid
graph TB
    MsgSvc[MessagingService]
    
    MsgSvc --> Send[sendMessage]
    MsgSvc --> Receive[onMessageReceived]
    MsgSvc --> Persist[Message Persistence]
    MsgSvc --> Pending[Pending Queue]
    MsgSvc --> Status[Status Updates]
    
    Send --> WebRTC[WebRTCService]
    Send --> Persist
    Receive --> Persist
    Pending --> |flush| Send
    
    Persist --> Repo[MessageRepository]
    Status --> Repo
```

**Responsibilities:**
- Message sending/receiving
- Message persistence
- Pending message queue
- Delivery status tracking
- Message validation

#### ContactService
```mermaid
graph TB
    ContactSvc[ContactService]
    
    ContactSvc --> Add[addContact]
    ContactSvc --> Accept[acceptContact]
    ContactSvc --> Decline[declineContact]
    ContactSvc --> Remove[removeContact]
    ContactSvc --> Request[Contact Requests]
    
    Add --> MQTT[MQTTService]
    Accept --> MQTT
    Decline --> MQTT
    
    Add --> Repo[ContactRepository]
    Accept --> Repo
    Remove --> Repo
```

**Responsibilities:**
- Contact management
- Contact request handling
- Contact persistence
- Contact validation

### 4. Repository Layer

#### MessageRepository
```mermaid
graph TB
    MsgRepo[MessageRepository]
    
    MsgRepo --> Save[saveMessage]
    MsgRepo --> Get[getMessages]
    MsgRepo --> Update[updateMessageStatus]
    MsgRepo --> Pending[getPendingMessages]
    
    Save --> DB[(IndexedDB)]
    Get --> DB
    Update --> DB
    Pending --> DB
    
    DB --> Store[messages Store]
```

**Schema:**
```typescript
interface Message {
  id: string;
  userId: string;
  contactId: string;
  content: string;
  timestamp: Date;
  isSent: boolean;
  status: 'pending' | 'delivered' | 'failed';
}
```

#### ContactRepository
```mermaid
graph TB
    ContactRepo[ContactRepository]
    
    ContactRepo --> GetAll[getAll]
    ContactRepo --> Get[get]
    ContactRepo --> Add[add]
    ContactRepo --> Update[update]
    ContactRepo --> Delete[softDelete]
    
    GetAll --> DB[(IndexedDB)]
    Get --> DB
    Add --> DB
    Update --> DB
    Delete --> DB
    
    DB --> Store[contacts Store]
```

**Schema:**
```typescript
interface Contact {
  id: string;
  name: string;
  status: 'pending' | 'accepted' | 'declined';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Data Flow

### Message Send Flow
```mermaid
graph LR
    UI[UI Component] -->|sendMessage| Coord[ChatCoordinator]
    Coord -->|sendMessage| MsgSvc[MessagingService]
    MsgSvc -->|saveMessage| MsgRepo[MessageRepository]
    MsgRepo -->|store| DB[(IndexedDB)]
    MsgSvc -->|sendMessage| WebRTC[WebRTCService]
    WebRTC -->|data channel| Peer[Peer]
    
    style UI fill:#e1f5ff
    style Coord fill:#4fc3f7
    style WebRTC fill:#81c784
```

### Connection Establishment Flow
```mermaid
graph LR
    UI[UI Component] -->|selectContact| Coord[ChatCoordinator]
    Coord -->|connectToPeer| ConnMgr[ConnectionManager]
    ConnMgr -->|createOffer| WebRTC[WebRTCService]
    WebRTC -->|SDP| ConnMgr
    ConnMgr -->|sendSignalingMessage| MQTT[MQTTService]
    MQTT -->|publish| Broker[MQTT Broker]
    Broker -->|forward| PeerMQTT[Peer MQTT]
    
    style UI fill:#e1f5ff
    style Coord fill:#4fc3f7
    style MQTT fill:#ffb74d
    style WebRTC fill:#81c784
```

## Interface Definitions

All services implement well-defined interfaces following the Interface Segregation Principle:

- `ISignalingService`: MQTT signaling operations
- `IWebRTCService`: WebRTC peer connection operations
- `IConnectionManager`: Connection lifecycle management
- `IMessageService`: Messaging operations
- `IContactService`: Contact management
- `IMessageRepository`: Message persistence
- `IContactRepository`: Contact persistence
- `IChatCoordinator`: Main coordinator interface

This ensures loose coupling and makes the system highly testable and maintainable.
