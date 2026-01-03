# State Diagrams

## 1. Application State Machine

```mermaid
stateDiagram-v2
    [*] --> Initializing
    Initializing --> Connecting: Start services
    Connecting --> Ready: All services connected
    Connecting --> Error: Connection failed
    Error --> Connecting: Retry
    Ready --> Active: User interaction
    Active --> Ready: Idle
    Active --> Disconnected: Network loss
    Disconnected --> Reconnecting: Auto reconnect
    Reconnecting --> Active: Reconnected
    Reconnecting --> Failed: Max retries
    Failed --> Connecting: Manual retry
    Active --> Shutdown: User logout
    Shutdown --> [*]
    
    note right of Ready
        MQTT connected
        No active chat
        Waiting for user
    end note
    
    note right of Active
        Chat open
        WebRTC connected
        Messages flowing
    end note
```

## 2. MQTT Service State

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Connecting: connect()
    Connecting --> Authenticating: TCP connected
    Authenticating --> Subscribing: CONNACK received
    Subscribing --> Connected: SUBACK received
    Connecting --> ConnectionError: Connection failed
    Authenticating --> AuthError: Auth failed
    ConnectionError --> Reconnecting: Auto retry
    AuthError --> Reconnecting: Auto retry
    Reconnecting --> Connecting: After delay
    Connected --> Publishing: Send message
    Publishing --> Connected: Message sent
    Connected --> Receiving: Message received
    Receiving --> Connected: Message processed
    Connected --> Disconnecting: Network loss
    Disconnecting --> Reconnecting: Auto reconnect
    Connected --> Closing: disconnect()
    Closing --> Idle: Closed
    Reconnecting --> Failed: Max retries
    Failed --> [*]
    
    note right of Connected
        Heartbeat active
        Queue flushing
        Ready to send/receive
    end note
    
    note right of Reconnecting
        Exponential backoff
        Pending messages queued
        Retry count tracking
    end note
```

## 3. WebRTC Connection State

```mermaid
stateDiagram-v2
    [*] --> New
    New --> Initiating: User A initiates
    New --> Waiting: User B waits
    Initiating --> CreatingOffer: createOffer()
    CreatingOffer --> OfferCreated: SDP offer ready
    OfferCreated --> SendingOffer: Send via MQTT
    SendingOffer --> WaitingAnswer: Offer sent
    Waiting --> ReceivingOffer: Offer received
    ReceivingOffer --> SettingRemote: setRemoteDescription()
    SettingRemote --> CreatingAnswer: createAnswer()
    CreatingAnswer --> AnswerCreated: SDP answer ready
    AnswerCreated --> SendingAnswer: Send via MQTT
    SendingAnswer --> GatheringICE: Answer sent
    WaitingAnswer --> ReceivingAnswer: Answer received
    ReceivingAnswer --> SettingRemoteAnswer: setRemoteDescription()
    SettingRemoteAnswer --> GatheringICE: Remote set
    GatheringICE --> ICEGathering: Collect candidates
    ICEGathering --> ICEComplete: All candidates sent
    ICEComplete --> Connecting: Start connectivity checks
    Connecting --> Connected: ICE success
    Connecting --> Failed: ICE failed
    Connected --> Stable: Data channel open
    Stable --> Disconnected: Network issue
    Disconnected --> Reconnecting: Auto reconnect
    Reconnecting --> Initiating: Retry
    Failed --> Closed: Give up
    Stable --> Closing: close()
    Closing --> Closed: Cleanup
    Closed --> [*]
    
    note right of Stable
        Data channel open
        Messages can flow
        Connection healthy
    end note
    
    note right of Reconnecting
        Old connection closed
        New offer/answer
        ICE restart
    end note
```

## 4. Message State

```mermaid
stateDiagram-v2
    [*] --> Composing
    Composing --> Validating: User sends
    Validating --> Invalid: Validation failed
    Invalid --> Composing: User edits
    Validating --> Pending: Valid
    Pending --> Queued: WebRTC disconnected
    Pending --> Sending: WebRTC connected
    Queued --> Sending: Connection restored
    Sending --> Sent: Send successful
    Sending --> Failed: Send failed
    Failed --> Pending: Retry
    Sent --> Delivered: Ack received
    Delivered --> Read: Read receipt
    Read --> [*]
    Failed --> Cancelled: Max retries
    Cancelled --> [*]
    
    note right of Pending
        Saved to local DB
        Waiting for connection
        Status: pending
    end note
    
    note right of Queued
        Connection lost
        Will retry when online
        Status: queued
    end note
    
    note right of Delivered
        Peer received
        Saved to peer DB
        Status: delivered
    end note
```

## 5. Contact State

```mermaid
stateDiagram-v2
    [*] --> Unknown
    Unknown --> RequestSent: User A adds User B
    RequestSent --> Pending: Request delivered
    Pending --> Accepted: User B accepts
    Pending --> Declined: User B declines
    Pending --> Expired: Timeout
    Accepted --> Active: Connection established
    Active --> Inactive: Connection lost
    Inactive --> Active: Reconnected
    Active --> Blocked: User blocks
    Blocked --> Active: User unblocks
    Active --> Removed: User removes
    Declined --> [*]
    Expired --> [*]
    Removed --> [*]
    
    note right of Pending
        Waiting for response
        Can be cancelled
        Timeout: 24 hours
    end note
    
    note right of Active
        Can chat
        WebRTC connection
        Message history
    end note
```

## 6. Connection Manager State

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Initiating: connectToPeer()
    Initiating --> CheckingExisting: Check for connection
    CheckingExisting --> AlreadyConnected: Connection exists
    AlreadyConnected --> Idle: Skip
    CheckingExisting --> Creating: No connection
    Creating --> Offering: Create offer
    Offering --> OfferSent: Send via MQTT
    OfferSent --> WaitingPeer: Wait for answer
    WaitingPeer --> Negotiating: Answer received
    Negotiating --> ICEChecking: Exchange candidates
    ICEChecking --> Connected: ICE success
    ICEChecking --> Failed: ICE failed
    Connected --> Monitoring: Start health check
    Monitoring --> Healthy: Heartbeat OK
    Healthy --> Monitoring: Continue
    Monitoring --> Unhealthy: Heartbeat missed
    Unhealthy --> Reconnecting: Trigger reconnect
    Reconnecting --> Creating: Retry
    Failed --> Reconnecting: Auto retry
    Reconnecting --> GivenUp: Max retries
    Connected --> Closing: setChatOpened(false)
    Closing --> Idle: Cleanup
    GivenUp --> [*]
    
    note right of Monitoring
        Presence heartbeat: 30s
        Health check: 10s
        Connection timeout: 30s
    end note
    
    note right of Reconnecting
        Exponential backoff
        Max attempts: 5
        Max delay: 32s
    end note
```

## 7. Data Channel State

```mermaid
stateDiagram-v2
    [*] --> Connecting
    Connecting --> Open: Channel opened
    Connecting --> Error: Open failed
    Error --> Closing: Cleanup
    Open --> Sending: send()
    Sending --> Open: Message sent
    Open --> Receiving: onmessage
    Receiving --> Open: Message processed
    Open --> Buffering: Buffer full
    Buffering --> Open: Buffer drained
    Open --> Closing: close()
    Closing --> Closed: Cleanup done
    Closed --> [*]
    
    note right of Open
        Ready to send/receive
        Low latency
        Reliable delivery
    end note
    
    note right of Buffering
        Send buffer full
        Backpressure applied
        Wait for drain
    end note
```

## 8. Presence State

```mermaid
stateDiagram-v2
    [*] --> Offline
    Offline --> Online: Login
    Online --> Available: Ready
    Available --> ChatOpen: Open chat
    ChatOpen --> Typing: User typing
    Typing --> ChatOpen: Stop typing
    ChatOpen --> Available: Close chat
    Available --> Away: Idle timeout
    Away --> Available: Activity detected
    Available --> Offline: Logout
    ChatOpen --> Offline: Network loss
    Offline --> Reconnecting: Auto reconnect
    Reconnecting --> Online: Reconnected
    Reconnecting --> Offline: Failed
    
    note right of ChatOpen
        Presence heartbeat active
        Peer notified
        Real-time updates
    end note
    
    note right of Away
        Idle for 5 minutes
        Still connected
        Reduced heartbeat
    end note
```

## 9. Retry State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Attempting: Start operation
    Attempting --> Success: Operation succeeded
    Attempting --> Failed: Operation failed
    Failed --> Waiting: Schedule retry
    Waiting --> Attempting: Retry
    Failed --> GivenUp: Max attempts reached
    Success --> [*]
    GivenUp --> [*]
    
    note right of Waiting
        Exponential backoff
        Delay = baseDelay * 2^attempt
        Max delay: 32 seconds
        Jitter applied
    end note
    
    note right of GivenUp
        Max attempts: 5
        Total time: ~63 seconds
        Notify user
    end note
```

## 10. Message Queue State

```mermaid
stateDiagram-v2
    [*] --> Empty
    Empty --> HasMessages: Message added
    HasMessages --> Processing: Connection available
    Processing --> Sending: Send message
    Sending --> Success: Sent successfully
    Sending --> Failed: Send failed
    Success --> HasMessages: More messages
    Success --> Empty: Queue empty
    Failed --> HasMessages: Requeue
    HasMessages --> Paused: Connection lost
    Paused --> HasMessages: Connection restored
    Processing --> Empty: All sent
    
    note right of HasMessages
        Messages in queue
        Ordered by timestamp
        Persistent storage
    end note
    
    note right of Paused
        Connection unavailable
        Messages preserved
        Will retry on reconnect
    end note
```

## State Transition Summary

### Critical State Transitions

1. **Initialization Flow**
   - `Idle` -> `Connecting` -> `Ready` -> `Active`

2. **Connection Establishment**
   - `New` -> `Initiating` -> `Connecting` -> `Connected` -> `Stable`

3. **Disconnection Recovery**
   - `Connected` -> `Disconnected` -> `Reconnecting` -> `Connected`

4. **Message Delivery**
   - `Composing` -> `Pending` -> `Sending` -> `Sent` -> `Delivered`

5. **Contact Management**
   - `Unknown` -> `RequestSent` -> `Pending` -> `Accepted` -> `Active`

### Error States

- **Connection Error**: Triggers automatic retry with exponential backoff
- **Authentication Error**: Requires user intervention
- **ICE Failed**: Attempts reconnection with ICE restart
- **Max Retries**: Transitions to failed state, user notification

### Recovery Mechanisms

1. **Automatic Reconnection**: For transient network issues
2. **Exponential Backoff**: Prevents server overload
3. **State Persistence**: Maintains state across reconnections
4. **Queue Management**: Preserves messages during disconnection
5. **Health Monitoring**: Proactive detection of issues
