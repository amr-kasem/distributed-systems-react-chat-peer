# Sequence Diagrams - Distributed Systems Interactions

## Academic Overview

This document presents sequence diagrams illustrating the temporal interactions between distributed system components in the P2P chat application. These diagrams demonstrate key distributed systems concepts including asynchronous communication, message passing, consensus protocols, and failure recovery.

---

## Diagram 1: System Initialization (Distributed Bootstrapping)

### Concept: Service Discovery and Registration

```mermaid
sequenceDiagram
    participant User
    participant LocalNode as Local Peer Node
    participant MQTT as MQTT Broker<br/>(Discovery Service)
    participant Storage as Local Storage<br/>(IndexedDB)
    
    Note over User,Storage: Distributed System Bootstrapping
    
    User->>LocalNode: Initialize (userId)
    
    rect rgb(255, 249, 196)
        Note over LocalNode,MQTT: Phase 1: Connect to Discovery Service
        LocalNode->>MQTT: CONNECT (clientId: userId)
        MQTT-->>LocalNode: CONNACK (session present)
        LocalNode->>MQTT: SUBSCRIBE user/{userId}/*
        MQTT-->>LocalNode: SUBACK
    end
    
    rect rgb(227, 242, 253)
        Note over LocalNode,Storage: Phase 2: Load Local State
        LocalNode->>Storage: Load contacts
        Storage-->>LocalNode: Contact list
        LocalNode->>Storage: Load message history
        Storage-->>LocalNode: Messages
    end
    
    rect rgb(200, 230, 201)
        Note over LocalNode: Phase 3: Ready State
        LocalNode-->>User: System Ready
    end
    
    Note right of LocalNode: Distributed Systems Concepts:<br/>• Asynchronous initialization<br/>• Decoupled service discovery<br/>• Local-first architecture
```

**Distributed Systems Principles**:
- **Asynchronous Operations**: Non-blocking initialization
- **Service Registration**: MQTT topic subscription for discovery
- **Local State**: Each node maintains independent state
- **No Coordination**: Peers initialize independently

---

## Diagram 2: Peer Discovery and Contact Addition

### Concept: Distributed Peer Discovery via Publish-Subscribe

```mermaid
sequenceDiagram
    participant UserA
    participant PeerA as Peer A Node
    participant Broker as MQTT Broker<br/>(Message Router)
    participant PeerB as Peer B Node
    participant UserB
    
    Note over UserA,UserB: Distributed Peer Discovery
    
    rect rgb(255, 249, 196)
        Note over UserA,PeerA: Initiator Side
        UserA->>PeerA: Add contact (peerB_id, name)
        PeerA->>PeerA: Create contact request message
        PeerA->>Broker: PUBLISH user/peerB/contactRequest
    end
    
    rect rgb(255, 224, 178)
        Note over Broker: Message Routing (O(1) lookup)
        Broker->>Broker: Route to subscribers
    end
    
    rect rgb(227, 242, 253)
        Note over PeerB,UserB: Receiver Side
        Broker->>PeerB: FORWARD contactRequest
        PeerB->>PeerB: Validate message
        PeerB->>PeerB: Store pending request
        PeerB-->>UserB: Show contact request dialog
    end
    
    Note right of Broker: Distributed Systems Concepts:<br/>• Publish-subscribe decoupling<br/>• Asynchronous messaging<br/>• No direct peer addressing<br/>• Broker-mediated discovery
```

**Distributed Systems Principles**:
- **Loose Coupling**: Peers don't need direct addresses
- **Publish-Subscribe**: Broker routes messages to subscribers
- **Asynchronous**: Fire-and-forget messaging
- **Scalability**: O(1) routing complexity

---

## Diagram 3: WebRTC Connection Establishment (Distributed Consensus)

### Concept: SDP Offer/Answer Exchange and ICE Negotiation

```mermaid
sequenceDiagram
    participant PeerA as Peer A<br/>(Initiator)
    participant SignalA as Signaling<br/>(MQTT)
    participant Broker as MQTT Broker
    participant SignalB as Signaling<br/>(MQTT)
    participant PeerB as Peer B<br/>(Responder)
    
    Note over PeerA,PeerB: Distributed Connection Negotiation
    
    rect rgb(255, 249, 196)
        Note over PeerA,SignalA: Phase 1: Offer Creation
        PeerA->>PeerA: createOffer() → SDP
        PeerA->>PeerA: setLocalDescription(offer)
        PeerA->>SignalA: Send offer
        SignalA->>Broker: PUBLISH user/peerB/offer
    end
    
    rect rgb(255, 224, 178)
        Note over Broker: Reliable Message Delivery (QoS 1)
        Broker->>SignalB: FORWARD offer (with ACK)
    end
    
    rect rgb(227, 242, 253)
        Note over SignalB,PeerB: Phase 2: Answer Creation
        SignalB->>PeerB: Deliver offer
        PeerB->>PeerB: setRemoteDescription(offer)
        PeerB->>PeerB: createAnswer() → SDP
        PeerB->>PeerB: setLocalDescription(answer)
        PeerB->>SignalB: Send answer
        SignalB->>Broker: PUBLISH user/peerA/answer
    end
    
    rect rgb(200, 230, 201)
        Note over Broker,PeerA: Phase 3: Answer Delivery
        Broker->>SignalA: FORWARD answer
        SignalA->>PeerA: Deliver answer
        PeerA->>PeerA: setRemoteDescription(answer)
    end
    
    rect rgb(255, 249, 196)
        Note over PeerA,PeerB: Phase 4: ICE Candidate Exchange
        
        par ICE Gathering (Parallel)
            PeerA->>PeerA: Gather ICE candidates
            PeerA->>Broker: PUBLISH candidates
            Broker->>PeerB: FORWARD candidates
            PeerB->>PeerB: addIceCandidate()
        and
            PeerB->>PeerB: Gather ICE candidates
            PeerB->>Broker: PUBLISH candidates
            Broker->>PeerA: FORWARD candidates
            PeerA->>PeerA: addIceCandidate()
        end
    end
    
    rect rgb(200, 230, 201)
        Note over PeerA,PeerB: Phase 5: Direct P2P Connection
        PeerA<->>PeerB: WebRTC Connection Established
        Note over PeerA,PeerB: Signaling complete,<br/>data flows peer-to-peer
    end
    
    Note right of PeerB: Distributed Systems Concepts:<br/>• Two-phase commit (offer/answer)<br/>• Reliable signaling (MQTT QoS 1)<br/>• Parallel ICE gathering<br/>• NAT traversal (STUN/TURN)
```

**Distributed Systems Principles**:
- **Two-Phase Protocol**: Offer/answer handshake
- **Reliable Messaging**: QoS 1 guarantees delivery
- **Concurrent Operations**: Parallel ICE gathering
- **Network Transparency**: NAT traversal abstraction

---

## Diagram 4: Message Transmission (P2P Data Transfer)

### Concept: Direct Peer-to-Peer Communication

```mermaid
sequenceDiagram
    participant UserA
    participant NodeA as Peer A Node
    participant StorageA as Local DB A
    participant DataChannel as WebRTC<br/>Data Channel
    participant StorageB as Local DB B
    participant NodeB as Peer B Node
    participant UserB
    
    Note over UserA,UserB: Distributed Message Delivery
    
    rect rgb(255, 249, 196)
        Note over UserA,StorageA: Phase 1: Local Processing (Peer A)
        UserA->>NodeA: Send message "Hello"
        NodeA->>NodeA: Create message object<br/>(id, timestamp, content)
        NodeA->>StorageA: Save (status: pending)
        StorageA-->>NodeA: Persisted
        NodeA-->>UserA: Show message (sending...)
    end
    
    rect rgb(255, 224, 178)
        Note over NodeA,DataChannel: Phase 2: P2P Transmission
        NodeA->>DataChannel: Send via DTLS/SCTP
        Note over DataChannel: Direct P2P<br/>No broker involved<br/>Low latency (~10-50ms)
    end
    
    rect rgb(227, 242, 253)
        Note over DataChannel,UserB: Phase 3: Remote Processing (Peer B)
        DataChannel->>NodeB: Receive message
        NodeB->>NodeB: Validate & deserialize
        NodeB->>StorageB: Save message
        StorageB-->>NodeB: Persisted
        NodeB-->>UserB: Display "Hello"
    end
    
    rect rgb(200, 230, 201)
        Note over NodeB,UserA: Phase 4: Acknowledgment
        NodeB->>DataChannel: Send ACK
        DataChannel->>NodeA: Deliver ACK
        NodeA->>StorageA: Update status: delivered
        NodeA-->>UserA: Show checkmark
    end
    
    Note right of DataChannel: Distributed Systems Concepts:<br/>• Peer-to-peer (no intermediary)<br/>• Eventually consistent storage<br/>• Asynchronous acknowledgment<br/>• Local-first architecture
```

**Distributed Systems Principles**:
- **Direct Communication**: Bypasses central server
- **Local-First**: Save locally before transmission
- **Eventually Consistent**: Both databases converge
- **Asynchronous ACK**: Non-blocking confirmation

---

## Diagram 5: Failure Detection and Recovery

### Concept: Fault Tolerance with Exponential Backoff

```mermaid
sequenceDiagram
    participant Node as Peer Node
    participant WebRTC as WebRTC Connection
    participant Retry as Retry Manager
    participant MQTT as MQTT Signaling
    participant UI as User Interface
    
    Note over Node,UI: Distributed Failure Handling
    
    rect rgb(255, 205, 210)
        Note over WebRTC: Network Failure Occurs
        WebRTC->>Node: onConnectionStateChange(failed)
        Node->>Node: Detect failure
        Node->>UI: Update status: Reconnecting
    end
    
    rect rgb(255, 249, 196)
        Note over Node,Retry: Exponential Backoff Algorithm
        Node->>Retry: Start retry sequence
        
        loop Retry Attempts (max 5)
            Retry->>Retry: Calculate delay: 2^attempt seconds
            Note over Retry: Attempt 1: wait 1s
            Retry->>Node: Attempt reconnection
            
            alt MQTT Disconnected
                Node->>MQTT: Reconnect MQTT first
                MQTT-->>Node: MQTT connected
            end
            
            Node->>WebRTC: Close old connection
            Node->>WebRTC: Create new offer
            WebRTC-->>Node: New SDP offer
            Node->>MQTT: Send offer via signaling
            
            alt Connection Successful
                WebRTC->>Node: Connection established
                Node->>Retry: Stop retries
                Node->>UI: Update status: Connected
            else Connection Failed
                Note over Retry: Attempt 2: wait 2s
                Note over Retry: Attempt 3: wait 4s
                Note over Retry: Attempt 4: wait 8s
                Note over Retry: Attempt 5: wait 16s
            end
        end
    end
    
    rect rgb(255, 205, 210)
        Note over Retry,UI: Max Retries Reached
        alt Max Retries Exceeded
            Retry->>Node: Give up
            Node->>UI: Update status: Failed
            UI-->>Node: User may retry manually
        end
    end
    
    Note right of Retry: Distributed Systems Concepts:<br/>• Failure detection (heartbeat)<br/>• Exponential backoff<br/>• Automatic recovery<br/>• Graceful degradation
```

**Distributed Systems Principles**:
- **Failure Detection**: Heartbeat timeout mechanism
- **Exponential Backoff**: Prevents network flooding
- **Automatic Recovery**: Self-healing system
- **Graceful Degradation**: System remains usable

---

## Diagram 6: Concurrent Connection Attempts (Glare Resolution)

### Concept: Distributed Consensus Without Coordinator

```mermaid
sequenceDiagram
    participant PeerA as Peer A<br/>(ID: alice)
    participant PeerB as Peer B<br/>(ID: bob)
    
    Note over PeerA,PeerB: Glare Scenario: Simultaneous Connection Attempts
    
    rect rgb(255, 249, 196)
        Note over PeerA,PeerB: Phase 1: Simultaneous Offers
        
        par Both create offers
            PeerA->>PeerA: createOffer()
            PeerA->>PeerA: setLocalDescription(offer_A)
        and
            PeerB->>PeerB: createOffer()
            PeerB->>PeerB: setLocalDescription(offer_B)
        end
        
        par Exchange offers
            PeerA->>PeerB: Send offer_A
        and
            PeerB->>PeerA: Send offer_B
        end
    end
    
    rect rgb(255, 205, 210)
        Note over PeerA,PeerB: Phase 2: Glare Detection
        
        PeerA->>PeerA: Receive offer_B (unexpected)
        PeerA->>PeerA: GLARE DETECTED!
        
        PeerB->>PeerB: Receive offer_A (unexpected)
        PeerB->>PeerB: GLARE DETECTED!
    end
    
    rect rgb(200, 230, 201)
        Note over PeerA,PeerB: Phase 3: Deterministic Resolution
        
        PeerA->>PeerA: Compare: "alice" < "bob"
        PeerA->>PeerA: Role: POLITE (lower ID)
        PeerA->>PeerA: rollback() local offer
        PeerA->>PeerA: setRemoteDescription(offer_B)
        PeerA->>PeerA: createAnswer()
        PeerA->>PeerB: Send answer_A
        
        PeerB->>PeerB: Compare: "bob" > "alice"
        PeerB->>PeerB: Role: IMPOLITE (higher ID)
        PeerB->>PeerB: Ignore offer_A
        PeerB->>PeerB: Wait for answer
        PeerB->>PeerB: Receive answer_A
        PeerB->>PeerB: setRemoteDescription(answer_A)
    end
    
    rect rgb(227, 242, 253)
        Note over PeerA,PeerB: Phase 4: Connection Established
        PeerA<->>PeerB: WebRTC connection successful
    end
    
    Note right of PeerB: Distributed Systems Concepts:<br/>• Distributed consensus<br/>• No central coordinator<br/>• Deterministic algorithm<br/>• Symmetric protocol
```

**Distributed Systems Principles**:
- **Distributed Consensus**: Peers agree without coordinator
- **Deterministic Resolution**: Same inputs → same outcome
- **Symmetric Algorithm**: Both peers run identical logic
- **Conflict Resolution**: Lexicographic ordering

---

## Diagram 7: Message Queuing During Network Partition

### Concept: Eventual Consistency and Offline Operation

```mermaid
sequenceDiagram
    participant User
    participant Node as Peer Node
    participant Queue as Message Queue
    participant Storage as Local Storage
    participant Network as Network Layer
    
    Note over User,Network: Network Partition Scenario
    
    rect rgb(200, 230, 201)
        Note over User,Network: Normal Operation
        User->>Node: Send message 1
        Node->>Storage: Save (status: pending)
        Node->>Network: Transmit
        Network-->>Node: ACK
        Node->>Storage: Update (status: delivered)
    end
    
    rect rgb(255, 205, 210)
        Note over Network: Network Partition Occurs
        Network->>Network: Connection lost
    end
    
    rect rgb(255, 249, 196)
        Note over User,Queue: Offline Mode (Queuing)
        User->>Node: Send message 2
        Node->>Storage: Save (status: pending)
        Node->>Network: Attempt transmit
        Network-->>Node: FAILED
        Node->>Queue: Enqueue message 2
        
        User->>Node: Send message 3
        Node->>Storage: Save (status: pending)
        Node->>Network: Attempt transmit
        Network-->>Node: FAILED
        Node->>Queue: Enqueue message 3
        
        Note over Queue: Messages queued:<br/>[message 2, message 3]
    end
    
    rect rgb(227, 242, 253)
        Note over Network: Network Restored
        Network->>Node: Connection restored
        Node->>Queue: Flush queue
        
        loop For each queued message
            Queue->>Network: Transmit message
            Network-->>Queue: ACK
            Queue->>Storage: Update status: delivered
        end
        
        Queue->>Node: Queue empty
    end
    
    rect rgb(200, 230, 201)
        Note over User,Network: Normal Operation Resumed
        User->>Node: Send message 4
        Node->>Network: Transmit immediately
        Network-->>Node: ACK
    end
    
    Note right of Queue: Distributed Systems Concepts:<br/>• Partition tolerance<br/>• Offline operation<br/>• Message queuing<br/>• Eventual delivery
```

**Distributed Systems Principles**:
- **Partition Tolerance**: System works during network split
- **Offline Operation**: Local-first architecture
- **Message Queuing**: Buffering for reliability
- **Eventual Delivery**: Guaranteed delivery when connected

---

## Diagram 8: Presence and Liveness Detection

### Concept: Distributed Heartbeat Mechanism

```mermaid
sequenceDiagram
    participant NodeA as Peer A Node
    participant MQTT as MQTT Broker
    participant NodeB as Peer B Node
    
    Note over NodeA,NodeB: Distributed Liveness Detection
    
    rect rgb(200, 230, 201)
        Note over NodeA: Chat Opened with Peer B
        NodeA->>NodeA: Start heartbeat timer (30s)
        
        loop Every 30 seconds
            NodeA->>MQTT: PUBLISH user/peerB/presence<br/>{status: "online", chatOpen: true}
            MQTT->>NodeB: FORWARD presence
            NodeB->>NodeB: Update last_seen timestamp
            NodeB->>NodeB: Status: Peer A is online
        end
    end
    
    rect rgb(255, 205, 210)
        Note over NodeA: Network Issue
        NodeA->>NodeA: Heartbeat fails to send
        
        Note over NodeB: Timeout Detection
        NodeB->>NodeB: Check last_seen timestamp
        NodeB->>NodeB: Timeout exceeded (60s)
        NodeB->>NodeB: Status: Peer A is offline
    end
    
    rect rgb(227, 242, 253)
        Note over NodeA: Network Restored
        NodeA->>MQTT: PUBLISH presence (resumed)
        MQTT->>NodeB: FORWARD presence
        NodeB->>NodeB: Update last_seen
        NodeB->>NodeB: Status: Peer A is online
    end
    
    rect rgb(255, 249, 196)
        Note over NodeA: Chat Closed
        NodeA->>NodeA: Stop heartbeat timer
        NodeA->>MQTT: PUBLISH user/peerB/presence<br/>{status: "online", chatOpen: false}
        MQTT->>NodeB: FORWARD presence
        NodeB->>NodeB: Status: Peer A closed chat
    end
    
    Note right of NodeB: Distributed Systems Concepts:<br/>• Heartbeat mechanism<br/>• Failure detection<br/>• Timeout-based liveness<br/>• Soft state
```

**Distributed Systems Principles**:
- **Heartbeat Protocol**: Periodic liveness signals
- **Failure Detection**: Timeout-based detection
- **Soft State**: Presence information expires
- **Eventual Accuracy**: May have temporary false negatives

---

## Summary: Distributed Systems Concepts Illustrated

| Diagram | Primary Concept | Secondary Concepts |
|---------|----------------|-------------------|
| **1. Initialization** | Service Discovery | Asynchronous bootstrapping, local state |
| **2. Peer Discovery** | Publish-Subscribe | Loose coupling, message routing |
| **3. Connection Setup** | Two-Phase Protocol | Reliable messaging, consensus |
| **4. Message Transfer** | P2P Communication | Local-first, eventual consistency |
| **5. Failure Recovery** | Fault Tolerance | Exponential backoff, self-healing |
| **6. Glare Resolution** | Distributed Consensus | Deterministic algorithms |
| **7. Message Queuing** | Partition Tolerance | Offline operation, eventual delivery |
| **8. Presence** | Liveness Detection | Heartbeat, soft state |

---

## Academic Significance

These sequence diagrams demonstrate:

1. **Asynchronous Communication**: All interactions are non-blocking
2. **Message Passing**: No shared memory, only messages
3. **Distributed Coordination**: Consensus without central authority
4. **Fault Tolerance**: Automatic failure detection and recovery
5. **Eventual Consistency**: Temporary inconsistency for availability
6. **Network Transparency**: Complexity hidden from application
7. **Scalability**: O(1) and O(N) operations, no O(N²)

These patterns are fundamental to distributed systems design and appear in many real-world systems (databases, messaging platforms, distributed file systems, etc.).
