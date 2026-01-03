# Distributed Systems Visual Diagrams

## For Postgraduate Students - Visual Learning Guide

This document provides comprehensive visual diagrams to illustrate distributed systems concepts in the P2P chat application.

---

## Diagram 1: System Evolution - Centralized to Distributed

### Evolution of Chat Architectures

```mermaid
graph TB
    subgraph "Generation 1: Centralized (1990s)"
        C1_User1[User 1] --> C1_Server[Central Server<br/>Single Point of Failure]
        C1_User2[User 2] --> C1_Server
        C1_User3[User 3] --> C1_Server
        C1_Server --> C1_DB[(Database)]
        
        C1_Problems[Problems:<br/>- Server bottleneck<br/>- Single point of failure<br/>- High latency<br/>- Privacy concerns<br/>- Scaling costs O(N^2)]
    end
    
    subgraph "Generation 2: Federated (2000s)"
        F1_User1[User 1] --> F1_Server1[Server A]
        F1_User2[User 2] --> F1_Server1
        F1_User3[User 3] --> F1_Server2[Server B]
        F1_User4[User 4] --> F1_Server2
        
        F1_Server1 <--> F1_Server2
        
        F1_Problems[Problems:<br/>- Still server-dependent<br/>- Complex federation<br/>- Trust issues<br/>- Moderate latency]
    end
    
    subgraph "Generation 3: Pure P2P (2010s)"
        P1_User1[User 1] <--> P1_User2[User 2]
        P1_User1 <--> P1_User3[User 3]
        P1_User2 <--> P1_User3
        P1_User2 <--> P1_User4[User 4]
        
        P1_Problems[Problems:<br/>- NAT traversal difficult<br/>- Peer discovery complex<br/>- No guaranteed delivery<br/>- Bootstrap problem]
    end
    
    subgraph "Generation 4: Hybrid P2P (Our Approach - 2020s)"
        H1_User1[User 1] <-->|Data| H1_User2[User 2]
        H1_User1 <-->|Data| H1_User3[User 3]
        H1_User2 <-->|Data| H1_User3
        
        H1_User1 -.->|Signaling| H1_Broker[MQTT Broker<br/>Lightweight]
        H1_User2 -.->|Signaling| H1_Broker
        H1_User3 -.->|Signaling| H1_Broker
        
        H1_Benefits[Benefits:<br/>[OK] Low latency (P2P data)<br/>[OK] Reliable signaling (MQTT)<br/>[OK] NAT traversal (WebRTC)<br/>[OK] Scalable O(N)<br/>[OK] Privacy preserved]
    end
    
    style C1_Server fill:#ef5350
    style F1_Server1 fill:#ff9800
    style F1_Server2 fill:#ff9800
    style H1_Broker fill:#ffb74d
    style H1_User1 fill:#81c784
    style H1_User2 fill:#81c784
    style H1_User3 fill:#81c784
    style H1_Benefits fill:#c8e6c9
```

---

## Diagram 2: Complete Distributed System Architecture

### Layered Architecture with Distributed Components

```mermaid
graph TB
    subgraph "User Space - Peer A"
        A_App[Application Layer<br/>Chat UI]
        A_State[State Management<br/>Local Database]
        A_Service[Service Layer<br/>Business Logic]
        
        A_App --> A_State
        A_State --> A_Service
    end
    
    subgraph "Communication Layer - Peer A"
        A_MQTT[MQTT Client<br/>Signaling]
        A_WebRTC[WebRTC Engine<br/>P2P Data]
        
        A_Service --> A_MQTT
        A_Service --> A_WebRTC
    end
    
    subgraph "Network Infrastructure"
        MQTT_Broker[MQTT Broker<br/>Publish-Subscribe<br/>Signaling Only]
        
        STUN[STUN Server<br/>NAT Discovery]
        TURN[TURN Server<br/>Relay Fallback]
        
        Internet[Internet<br/>Best-Effort Network]
    end
    
    subgraph "Communication Layer - Peer B"
        B_MQTT[MQTT Client<br/>Signaling]
        B_WebRTC[WebRTC Engine<br/>P2P Data]
    end
    
    subgraph "User Space - Peer B"
        B_Service[Service Layer<br/>Business Logic]
        B_State[State Management<br/>Local Database]
        B_App[Application Layer<br/>Chat UI]
        
        B_Service --> B_State
        B_State --> B_App
    end
    
    A_MQTT <-.->|MQTT Protocol<br/>QoS 1| MQTT_Broker
    B_MQTT <-.->|MQTT Protocol<br/>QoS 1| MQTT_Broker
    
    A_WebRTC -.->|ICE Discovery| STUN
    B_WebRTC -.->|ICE Discovery| STUN
    
    A_WebRTC -.->|Relay Fallback| TURN
    B_WebRTC -.->|Relay Fallback| TURN
    
    A_WebRTC <===>|Direct P2P<br/>DTLS/SCTP/UDP<br/>Low Latency| B_WebRTC
    
    MQTT_Broker --> Internet
    STUN --> Internet
    TURN --> Internet
    
    style A_App fill:#e3f2fd
    style B_App fill:#e3f2fd
    style A_State fill:#fff9c4
    style B_State fill:#fff9c4
    style MQTT_Broker fill:#ffb74d
    style STUN fill:#4fc3f7
    style TURN fill:#ef5350
    style A_WebRTC fill:#81c784
    style B_WebRTC fill:#81c784
```

### Component Responsibilities

| Layer | Component | Distributed Systems Role | CAP Choice |
|-------|-----------|--------------------------|------------|
| **Application** | Chat UI | User interface, local rendering | - |
| **State** | Local Database | Eventually consistent storage | **AP** |
| **Service** | Business Logic | Coordination, message handling | - |
| **Signaling** | MQTT Client | Reliable message delivery | **CP** |
| **Data Transfer** | WebRTC | Low-latency P2P communication | **AP** |
| **Infrastructure** | MQTT Broker | Centralized signaling router | **CP** |
| **Infrastructure** | STUN/TURN | NAT traversal assistance | **AP** |

---

## Diagram 3: Message Flow - Complete Lifecycle

### From User Input to Peer Delivery

```mermaid
sequenceDiagram
    autonumber
    
    participant U1 as User A<br/>(Human)
    participant A_UI as Peer A<br/>UI Layer
    participant A_State as Peer A<br/>State/DB
    participant A_WebRTC as Peer A<br/>WebRTC
    participant Network as Internet<br/>Network
    participant B_WebRTC as Peer B<br/>WebRTC
    participant B_State as Peer B<br/>State/DB
    participant B_UI as Peer B<br/>UI Layer
    participant U2 as User B<br/>(Human)
    
    rect rgb(200, 230, 201)
        Note over U1,A_State: Phase 1: Local Processing (Peer A)
        U1->>A_UI: Types message "Hello"
        A_UI->>A_UI: Validate input
        A_UI->>A_State: Save message (status: pending)
        A_State->>A_State: Generate UUID, timestamp
        A_State-->>A_UI: Message saved locally
        A_UI-->>U1: Show message (sending...)
    end
    
    rect rgb(255, 249, 196)
        Note over A_State,Network: Phase 2: Network Transmission
        A_State->>A_WebRTC: Send message
        A_WebRTC->>A_WebRTC: Serialize to JSON
        A_WebRTC->>A_WebRTC: Encrypt (DTLS)
        A_WebRTC->>Network: UDP packets
        
        Note over Network: Packets traverse Internet<br/>May arrive out of order<br/>Best-effort delivery
        
        Network->>B_WebRTC: UDP packets arrive
        B_WebRTC->>B_WebRTC: Decrypt (DTLS)
        B_WebRTC->>B_WebRTC: Deserialize JSON
    end
    
    rect rgb(227, 242, 253)
        Note over B_WebRTC,U2: Phase 3: Remote Processing (Peer B)
        B_WebRTC->>B_State: Deliver message
        B_State->>B_State: Validate message
        B_State->>B_State: Save to database
        B_State->>B_UI: Notify new message
        B_UI->>B_UI: Update UI
        B_UI-->>U2: Display "Hello"
    end
    
    rect rgb(255, 224, 178)
        Note over B_State,A_State: Phase 4: Acknowledgment (Optional)
        B_WebRTC->>Network: Send ACK
        Network->>A_WebRTC: ACK received
        A_WebRTC->>A_State: Update status
        A_State->>A_State: Mark as delivered
        A_State->>A_UI: Update UI
        A_UI-->>U1: Show checkmark (delivered)
    end
```

### Distributed Systems Concepts Illustrated

1. **Asynchronous Communication** (Steps 1-8): No blocking, local-first
2. **Network Uncertainty** (Steps 9-10): Packets may be lost, reordered
3. **End-to-End Encryption** (Steps 7, 11): Security in untrusted network
4. **Eventually Consistent** (Steps 12-15): Both databases eventually match
5. **Acknowledgment Protocol** (Steps 16-21): Reliability through feedback

---

## Diagram 4: Failure Scenarios and Recovery

### Comprehensive Failure Handling

```mermaid
stateDiagram-v2
    [*] --> Connected: Initial connection
    
    state Connected {
        [*] --> Healthy
        Healthy --> Sending: User sends message
        Sending --> Healthy: Message delivered
    }
    
    Connected --> NetworkFailure: Network drops
    Connected --> PeerCrash: Peer crashes
    Connected --> BrokerFailure: MQTT broker down
    
    state NetworkFailure {
        [*] --> Detected: Heartbeat timeout
        Detected --> Queuing: Queue messages locally
        Queuing --> Retrying: Exponential backoff retry
        Retrying --> Reconnecting: Network restored
        Reconnecting --> Flushing: Send queued messages
        Flushing --> [*]: All messages sent
    }
    
    state PeerCrash {
        [*] --> Timeout: No response
        Timeout --> Offline: Mark peer offline
        Offline --> Waiting: Wait for peer
        Waiting --> PeerReturns: Peer comes back
        PeerReturns --> Syncing: Sync missed messages
        Syncing --> [*]: Sync complete
    }
    
    state BrokerFailure {
        [*] --> SignalingDown: Cannot send signals
        SignalingDown --> ExistingOK: Existing connections OK
        ExistingOK --> NewBlocked: New connections blocked
        NewBlocked --> BrokerReturns: Broker restored
        BrokerReturns --> [*]: Resume signaling
    }
    
    NetworkFailure --> Connected: Recovery complete
    PeerCrash --> Connected: Peer reconnected
    BrokerFailure --> Connected: Broker restored
    
    Connected --> Failed: Max retries exceeded
    Failed --> [*]: Give up
    
    note right of NetworkFailure
        Distributed Systems Concept:
        Fault Tolerance
        - Detect failures
        - Queue operations
        - Retry with backoff
        - Eventual recovery
    end note
    
    note right of PeerCrash
        Distributed Systems Concept:
        Partial Failures
        - System continues
        - Graceful degradation
        - Eventual consistency
    end note
    
    note right of BrokerFailure
        Distributed Systems Concept:
        Separation of Concerns
        - Data path independent
        - Signaling path separate
        - Resilience through design
    end note
```

### Failure Recovery Timeline

```mermaid
gantt
    title Failure Recovery Timeline (Exponential Backoff)
    dateFormat X
    axisFormat %Ss
    
    section Normal Operation
    Connected :active, 0, 5
    
    section Failure Detected
    Failure occurs :crit, 5, 1
    
    section Retry Attempts
    Attempt 1 (1s delay) :retry1, 6, 1
    Wait 1s :7, 1
    Attempt 2 (2s delay) :retry2, 8, 1
    Wait 2s :9, 2
    Attempt 3 (4s delay) :retry3, 11, 1
    Wait 4s :12, 4
    Attempt 4 (8s delay) :retry4, 16, 1
    Wait 8s :17, 8
    Attempt 5 (16s delay) :retry5, 25, 1
    
    section Recovery
    Connection restored :done, 26, 2
    Flush queued messages :done, 28, 3
    Normal operation :active, 31, 5
```

---

## Diagram 5: Scalability Analysis

### Cost Comparison: Centralized vs P2P

```mermaid
graph TB
    subgraph "Centralized Architecture"
        C_Users[N Users]
        C_Server[Central Server]
        C_Connections[N^2 connections through server]
        C_Bandwidth[Server Bandwidth: O(N^2)]
        C_Cost[Monthly Cost: $$$$$]
        
        C_Users --> C_Server
        C_Server --> C_Connections
        C_Connections --> C_Bandwidth
        C_Bandwidth --> C_Cost
        
        C_Example[Example: 1000 users<br/>= 1,000,000 message pairs<br/>= All through server<br/>= Very expensive]
    end
    
    subgraph "P2P Architecture (Our Approach)"
        P_Users[N Users]
        P_Broker[MQTT Broker<br/>Signaling Only]
        P_Direct[Direct P2P Connections]
        P_Bandwidth[Broker Bandwidth: O(N)]
        P_Cost[Monthly Cost: $]
        
        P_Users --> P_Broker
        P_Users --> P_Direct
        P_Broker --> P_Bandwidth
        P_Bandwidth --> P_Cost
        
        P_Example[Example: 1000 users<br/>= 1000 signaling messages<br/>= Data via P2P (free)<br/>= Very cheap]
    end
    
    style C_Cost fill:#ef5350
    style P_Cost fill:#81c784
    style C_Server fill:#ef5350
    style P_Broker fill:#ffb74d
```

### Scaling Metrics

| Users | Centralized Server Load | P2P Broker Load | Cost Ratio |
|-------|-------------------------|-----------------|------------|
| 10 | 100 msg/s | 10 msg/s | 10:1 |
| 100 | 10,000 msg/s | 100 msg/s | 100:1 |
| 1,000 | 1,000,000 msg/s | 1,000 msg/s | 1000:1 |
| 10,000 | 100,000,000 msg/s | 10,000 msg/s | 10000:1 |

**Key Insight**: P2P architecture scales **linearly** O(N) while centralized scales **quadratically** O(N^2)

---

## Diagram 6: CAP Theorem in Practice

### CAP Theorem Trade-offs

```mermaid
graph TB
    CAP[CAP Theorem<br/>Choose 2 of 3]
    
    CAP --> C[Consistency<br/>All nodes see same data]
    CAP --> A[Availability<br/>System always responds]
    CAP --> P[Partition Tolerance<br/>Works despite network failures]
    
    C --> CP[CP Systems]
    P --> CP
    CP --> CP_Ex[Examples:<br/>- Banking systems<br/>- MQTT broker<br/>- Distributed databases]
    
    A --> AP[AP Systems]
    P --> AP
    AP --> AP_Ex[Examples:<br/>- DNS<br/>- Cassandra<br/>- Our P2P Chat]
    
    C --> CA[CA Systems]
    A --> CA
    CA --> CA_Ex[Examples:<br/>- Single-server databases<br/>- Not partition-tolerant<br/>- Rare in distributed systems]
    
    style AP fill:#81c784
    style CP fill:#4fc3f7
    style CA fill:#ef5350
```

### Our Choice: AP (Availability + Partition Tolerance)

```mermaid
sequenceDiagram
    participant P1_DB as Peer 1 Database
    participant Network
    participant P2_DB as Peer 2 Database
    
    rect rgb(200, 230, 201)
        Note over P1_DB,P2_DB: Normal Operation (Consistent)
        P1_DB->>P1_DB: Messages: [A, B, C]
        P2_DB->>P2_DB: Messages: [A, B, C]
    end
    
    rect rgb(255, 205, 210)
        Note over Network: Network Partition Occurs
        P1_DB->>P1_DB: User sends message D
        P1_DB->>P1_DB: Local DB: [A, B, C, D]
        
        Note over Network: [X] Cannot sync
        
        P2_DB->>P2_DB: User sends message E
        P2_DB->>P2_DB: Local DB: [A, B, C, E]
        
        Note over P1_DB,P2_DB: Inconsistent State<br/>P1 has D, P2 has E<br/>But both systems AVAILABLE
    end
    
    rect rgb(255, 249, 196)
        Note over Network: Network Restored
        P1_DB->>Network: Sync message D
        Network->>P2_DB: Deliver D
        P2_DB->>P2_DB: Merge: [A, B, C, D, E]
        
        P2_DB->>Network: Sync message E
        Network->>P1_DB: Deliver E
        P1_DB->>P1_DB: Merge: [A, B, C, D, E]
    end
    
    rect rgb(200, 230, 201)
        Note over P1_DB,P2_DB: Eventually Consistent<br/>Both have: [A, B, C, D, E]
    end
```

**Why AP over CP?**
- ✅ Users can always send messages (Availability)
- ✅ Works during network failures (Partition Tolerance)
- ✅ Messages sync when connection restored (Eventual Consistency)
- [X] Temporary inconsistency acceptable for chat (Trade-off)

---

## Diagram 7: Consensus Without Coordinator

### Polite Peer Pattern (Distributed Consensus)

```mermaid
sequenceDiagram
    participant A as Peer A<br/>(ID: alice)
    participant B as Peer B<br/>(ID: bob)
    
    Note over A,B: Scenario: Both try to connect simultaneously
    
    rect rgb(255, 249, 196)
        Note over A,B: Phase 1: Simultaneous Offers (Glare)
        
        par Peer A creates offer
            A->>A: createOffer()
            A->>A: setLocalDescription(offer_A)
        and Peer B creates offer
            B->>B: createOffer()
            B->>B: setLocalDescription(offer_B)
        end
        
        par Send offers
            A->>B: Send offer_A
        and
            B->>A: Send offer_B
        end
    end
    
    rect rgb(255, 205, 210)
        Note over A,B: Phase 2: Glare Detected
        
        A->>A: Receive offer_B while waiting
        A->>A: Glare detected!
        
        B->>B: Receive offer_A while waiting
        B->>B: Glare detected!
    end
    
    rect rgb(200, 230, 201)
        Note over A,B: Phase 3: Deterministic Resolution
        
        A->>A: Compare IDs: "alice" < "bob"
        A->>A: I am POLITE (lower ID)
        A->>A: rollback() my offer
        A->>A: setRemoteDescription(offer_B)
        A->>A: createAnswer()
        A->>B: Send answer_A
        
        B->>B: Compare IDs: "bob" > "alice"
        B->>B: I am IMPOLITE (higher ID)
        B->>B: Ignore offer_A
        B->>B: Wait for answer
        B->>B: Receive answer_A
        B->>B: setRemoteDescription(answer_A)
    end
    
    rect rgb(227, 242, 253)
        Note over A,B: Phase 4: Connection Established
        A->>B: ICE candidates
        B->>A: ICE candidates
        Note over A,B: [OK] Connection successful<br/>[OK] No coordinator needed<br/>[OK] Deterministic outcome
    end
```

**Distributed Systems Principles**:
1. **No Central Coordinator**: Peers resolve conflict themselves
2. **Deterministic**: Same inputs always produce same outcome
3. **Symmetric Algorithm**: Both peers run same logic
4. **Lexicographic Ordering**: Simple, universal comparison

---

## Diagram 8: Security in Distributed Systems

### End-to-End Security Layers

```mermaid
graph TB
    subgraph "Application Layer"
        PlainText[Plain Text Message<br/>"Hello, World!"]
    end
    
    subgraph "Encryption Layers"
        direction TB
        
        subgraph "WebRTC Security"
            DTLS[DTLS Encryption<br/>TLS 1.2+<br/>AES-128-GCM]
            SRTP[SRTP for Media<br/>AES encryption]
        end
        
        subgraph "MQTT Security"
            TLS[TLS/WSS<br/>Transport encryption]
            Auth[Authentication<br/>Username/Password]
        end
    end
    
    subgraph "Network Layer"
        Encrypted[Encrypted Packets<br/>Unreadable by intermediaries]
    end
    
    subgraph "Threat Model"
        Eavesdropper[Eavesdropper<br/>[X] Cannot read]
        MITM[Man-in-the-Middle<br/>[X] Cannot modify]
        Replay[Replay Attack<br/>[X] Detected by sequence numbers]
    end
    
    PlainText --> DTLS
    PlainText --> TLS
    
    DTLS --> Encrypted
    SRTP --> Encrypted
    TLS --> Encrypted
    Auth --> TLS
    
    Encrypted -.->|Blocked| Eavesdropper
    Encrypted -.->|Blocked| MITM
    Encrypted -.->|Blocked| Replay
    
    style DTLS fill:#ef5350
    style TLS fill:#ef5350
    style Encrypted fill:#4fc3f7
    style Eavesdropper fill:#bdbdbd
    style MITM fill:#bdbdbd
    style Replay fill:#bdbdbd
```

### Security Properties

| Layer | Protocol | Protection | Distributed Systems Benefit |
|-------|----------|------------|----------------------------|
| **Data Transfer** | DTLS | End-to-end encryption | Privacy in untrusted network |
| **Signaling** | TLS/WSS | Transport encryption | Secure peer discovery |
| **Authentication** | MQTT Auth | Identity verification | Trust establishment |
| **Integrity** | HMAC | Tamper detection | Message authenticity |
| **Replay Protection** | Sequence Numbers | Prevent replay attacks | Temporal ordering |

---

## Summary: Distributed Systems Concepts Demonstrated

### Concept Checklist

| Concept | Implementation | Diagram Reference |
|---------|----------------|-------------------|
| ✅ **Decentralization** | P2P data transfer | Diagram 1, 2 |
| ✅ **Fault Tolerance** | Retry mechanisms | Diagram 4 |
| ✅ **Scalability** | Linear cost growth | Diagram 5 |
| ✅ **Consistency** | Eventual consistency | Diagram 6 |
| ✅ **Consensus** | Polite peer pattern | Diagram 7 |
| ✅ **Security** | End-to-end encryption | Diagram 8 |
| ✅ **Transparency** | NAT traversal | Diagram 2 |
| ✅ **Asynchrony** | Message queuing | Diagram 3 |
| ✅ **Heterogeneity** | Cross-platform | Diagram 2 |
| ✅ **Concurrency** | Multiple connections | Diagram 3 |

### Teaching Points for Students

1. **Hybrid Architectures**: Combining centralized and decentralized approaches
2. **Trade-offs**: CAP theorem in practice (AP over CP)
3. **Protocol Selection**: MQTT for reliability, WebRTC for performance
4. **Failure Handling**: Exponential backoff, graceful degradation
5. **Consensus**: Distributed agreement without coordinator
6. **Scalability**: Linear vs quadratic cost growth
7. **Security**: Defense in depth with multiple layers
8. **Real-World Constraints**: NAT traversal, network uncertainty

---

**For Instructors**: These diagrams can be used in lectures to illustrate distributed systems concepts with a concrete, working example. The P2P chat application demonstrates how theoretical concepts translate into practical systems.
