# Sequence Diagrams

## 1. User Login and Initialization

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant ChatCoordinator
    participant MQTTService
    participant ContactRepo
    participant Broker as MQTT Broker
    
    User->>UI: Enter User ID
    UI->>ChatCoordinator: initialize()
    ChatCoordinator->>MQTTService: connect()
    MQTTService->>Broker: CONNECT
    Broker-->>MQTTService: CONNACK
    MQTTService->>Broker: SUBSCRIBE user/{userId}
    Broker-->>MQTTService: SUBACK
    MQTTService-->>ChatCoordinator: Connected
    ChatCoordinator->>ContactRepo: getAll()
    ContactRepo-->>ChatCoordinator: Contact List
    ChatCoordinator-->>UI: Initialization Complete
    UI-->>User: Show Contact List
```

## 2. Add Contact Flow

```mermaid
sequenceDiagram
    participant UserA
    participant UI_A as UI (User A)
    participant Coord_A as ChatCoordinator A
    participant Contact_A as ContactService A
    participant MQTT_A as MQTTService A
    participant Broker as MQTT Broker
    participant MQTT_B as MQTTService B
    participant Coord_B as ChatCoordinator B
    participant UI_B as UI (User B)
    participant UserB
    
    UserA->>UI_A: Click "Add Contact"
    UI_A->>UserA: Show Contact Dialog
    UserA->>UI_A: Enter Peer ID & Name
    UI_A->>Coord_A: addContact(peerId, name)
    Coord_A->>Contact_A: addContact(peerId, name)
    Contact_A->>Contact_A: Create pending contact
    Contact_A->>MQTT_A: sendContactRequest(peerId, name)
    MQTT_A->>Broker: PUBLISH user/{peerId}/contactRequest
    Broker->>MQTT_B: FORWARD contactRequest
    MQTT_B->>Coord_B: onSignalingMessage(contactRequest)
    Coord_B->>UI_B: onContactRequest(from, name)
    UI_B-->>UserB: Show Contact Request
    
    Note over UserB: User B decides to accept/decline
```

## 3. Accept Contact and Establish Connection

```mermaid
sequenceDiagram
    participant UserB
    participant UI_B as UI (User B)
    participant Coord_B as ChatCoordinator B
    participant Contact_B as ContactService B
    participant MQTT_B as MQTTService B
    participant Broker as MQTT Broker
    participant MQTT_A as MQTTService A
    participant Coord_A as ChatCoordinator A
    participant ConnMgr_A as ConnectionManager A
    participant WebRTC_A as WebRTCService A
    participant WebRTC_B as WebRTCService B
    
    UserB->>UI_B: Click "Accept"
    UI_B->>Coord_B: acceptContact(peerId, name)
    Coord_B->>Contact_B: acceptContact(peerId, name)
    Contact_B->>MQTT_B: sendContactResponse(accepted=true)
    MQTT_B->>Broker: PUBLISH user/{peerA}/contactResponse
    Broker->>MQTT_A: FORWARD contactResponse
    MQTT_A->>Coord_A: onSignalingMessage(contactResponse)
    Coord_A->>UI_B: onContactResponse(accepted=true)
    
    Note over Coord_A,Coord_B: Both users now have each other as contacts
    
    Coord_A->>ConnMgr_A: connectToPeer(peerB)
    ConnMgr_A->>WebRTC_A: createOffer()
    WebRTC_A-->>ConnMgr_A: SDP Offer
    ConnMgr_A->>MQTT_A: sendSignalingMessage(offer)
    MQTT_A->>Broker: PUBLISH user/{peerB}/offer
    Broker->>MQTT_B: FORWARD offer
    MQTT_B->>Coord_B: onSignalingMessage(offer)
    Coord_B->>WebRTC_B: setRemoteDescription(offer)
    Coord_B->>WebRTC_B: createAnswer()
    WebRTC_B-->>Coord_B: SDP Answer
    Coord_B->>MQTT_B: sendSignalingMessage(answer)
    MQTT_B->>Broker: PUBLISH user/{peerA}/answer
    Broker->>MQTT_A: FORWARD answer
    MQTT_A->>Coord_A: onSignalingMessage(answer)
    Coord_A->>WebRTC_A: setRemoteDescription(answer)
    
    Note over WebRTC_A,WebRTC_B: ICE Candidate Exchange
    
    WebRTC_A->>WebRTC_A: Generate ICE Candidates
    WebRTC_A->>MQTT_A: sendSignalingMessage(iceCandidate)
    MQTT_A->>Broker: PUBLISH user/{peerB}/iceCandidate
    Broker->>MQTT_B: FORWARD iceCandidate
    MQTT_B->>WebRTC_B: addIceCandidate()
    
    WebRTC_B->>WebRTC_B: Generate ICE Candidates
    WebRTC_B->>MQTT_B: sendSignalingMessage(iceCandidate)
    MQTT_B->>Broker: PUBLISH user/{peerA}/iceCandidate
    Broker->>MQTT_A: FORWARD iceCandidate
    MQTT_A->>WebRTC_A: addIceCandidate()
    
    Note over WebRTC_A,WebRTC_B: WebRTC Connection Established
    
    WebRTC_A-->>ConnMgr_A: onConnectionStateChange(connected)
    ConnMgr_A-->>UI_B: Update Status: Connected
    WebRTC_B-->>Coord_B: onConnectionStateChange(connected)
    Coord_B-->>UI_B: Update Status: Connected
```

## 4. Send Message Flow

```mermaid
sequenceDiagram
    participant UserA
    participant UI_A as UI (User A)
    participant Coord_A as ChatCoordinator A
    participant Msg_A as MessagingService A
    participant WebRTC_A as WebRTCService A
    participant DataChannel as WebRTC Data Channel
    participant WebRTC_B as WebRTCService B
    participant Coord_B as ChatCoordinator B
    participant MsgRepo_B as MessageRepository B
    participant UI_B as UI (User B)
    participant UserB
    
    UserA->>UI_A: Type message
    UserA->>UI_A: Click Send
    UI_A->>Coord_A: sendMessage(content)
    Coord_A->>Msg_A: sendMessage(content)
    Msg_A->>Msg_A: Create Message object
    Msg_A->>Msg_A: Save to local DB (status: sending)
    Msg_A->>WebRTC_A: sendMessage(content)
    WebRTC_A->>DataChannel: Send via data channel
    DataChannel->>WebRTC_B: Receive data
    WebRTC_B->>Coord_B: onMessage(content)
    Coord_B->>MsgRepo_B: saveMessage(message)
    MsgRepo_B-->>Coord_B: Saved
    Coord_B->>UI_B: onMessageReceived(message)
    UI_B-->>UserB: Display message
    
    Note over Msg_A: Update status to 'delivered'
    Msg_A->>Msg_A: Update message status
    Msg_A->>UI_A: Update UI
```

## 5. Connection Failure and Reconnection

```mermaid
sequenceDiagram
    participant ConnMgr as ConnectionManager
    participant WebRTC as WebRTCService
    participant MQTT as MQTTService
    participant ReconnMgr as ReconnectionManager
    participant UI
    
    Note over WebRTC: Connection drops
    
    WebRTC->>ConnMgr: onConnectionStateChange(failed)
    ConnMgr->>ConnMgr: handleConnectionFailed()
    ConnMgr->>UI: Update status: Reconnecting
    ConnMgr->>ReconnMgr: start(connectFn)
    
    loop Retry with exponential backoff
        ReconnMgr->>ReconnMgr: Wait (delay)
        ReconnMgr->>ConnMgr: Attempt #{attempt}
        ConnMgr->>MQTT: Check MQTT connection
        
        alt MQTT disconnected
            ConnMgr->>MQTT: reconnect()
            MQTT->>MQTT: connect()
        end
        
        ConnMgr->>WebRTC: close()
        ConnMgr->>WebRTC: createOffer()
        WebRTC-->>ConnMgr: SDP Offer
        ConnMgr->>MQTT: sendSignalingMessage(offer)
        
        alt Connection successful
            WebRTC->>ConnMgr: onConnectionStateChange(connected)
            ConnMgr->>ReconnMgr: stop()
            ConnMgr->>UI: Update status: Connected
        else Connection failed
            ReconnMgr->>ReconnMgr: Increase delay
        end
    end
    
    alt Max retries reached
        ReconnMgr->>ConnMgr: onGiveUp()
        ConnMgr->>UI: Update status: Failed
    end
```

## 6. Message Persistence and Offline Queue

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Coord as ChatCoordinator
    participant MsgSvc as MessagingService
    participant WebRTC as WebRTCService
    participant MsgRepo as MessageRepository
    
    User->>UI: Send message
    UI->>Coord: sendMessage(content)
    Coord->>MsgSvc: sendMessage(content)
    MsgSvc->>MsgRepo: saveMessage(status: pending)
    MsgRepo-->>MsgSvc: Saved
    
    alt WebRTC Connected
        MsgSvc->>WebRTC: sendMessage(content)
        WebRTC-->>MsgSvc: Success
        MsgSvc->>MsgRepo: updateStatus(delivered)
    else WebRTC Disconnected
        MsgSvc->>MsgSvc: Queue message
        Note over MsgSvc: Message stays in pending state
    end
    
    Note over WebRTC: Connection restored
    
    WebRTC->>Coord: onConnectionStateChange(connected)
    Coord->>MsgSvc: sendPendingMessages()
    MsgSvc->>MsgRepo: getPendingMessages()
    MsgRepo-->>MsgSvc: Pending messages
    
    loop For each pending message
        MsgSvc->>WebRTC: sendMessage(content)
        WebRTC-->>MsgSvc: Success
        MsgSvc->>MsgRepo: updateStatus(delivered)
    end
```

## 7. Presence and Heartbeat

```mermaid
sequenceDiagram
    participant ConnMgr_A as ConnectionManager A
    participant MQTT_A as MQTTService A
    participant Broker as MQTT Broker
    participant MQTT_B as MQTTService B
    participant ConnMgr_B as ConnectionManager B
    participant UI_B as UI (User B)
    
    Note over ConnMgr_A: Chat opened with User B
    
    ConnMgr_A->>ConnMgr_A: setChatOpened(peerB, true)
    ConnMgr_A->>ConnMgr_A: startPresenceHeartbeat()
    
    loop Every 30 seconds
        ConnMgr_A->>MQTT_A: sendPresence(peerB, opened=true)
        MQTT_A->>Broker: PUBLISH user/{peerB}/chatPresence
        Broker->>MQTT_B: FORWARD chatPresence
        MQTT_B->>ConnMgr_B: onSignalingMessage(chatPresence)
        ConnMgr_B->>UI_B: Update presence indicator
    end
    
    Note over ConnMgr_A: Chat closed
    
    ConnMgr_A->>ConnMgr_A: setChatOpened(peerB, false)
    ConnMgr_A->>ConnMgr_A: stopPresenceHeartbeat()
    ConnMgr_A->>MQTT_A: sendPresence(peerB, opened=false)
    MQTT_A->>Broker: PUBLISH user/{peerB}/chatPresence
    Broker->>MQTT_B: FORWARD chatPresence
    MQTT_B->>ConnMgr_B: onSignalingMessage(chatPresence)
    ConnMgr_B->>UI_B: Update presence indicator
```

## 8. Contact Removal

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Coord as ChatCoordinator
    participant ContactSvc as ContactService
    participant ConnMgr as ConnectionManager
    participant WebRTC as WebRTCService
    participant ContactRepo as ContactRepository
    
    User->>UI: Click "Remove Contact"
    UI->>User: Confirm removal
    User->>UI: Confirm
    UI->>Coord: removeContact(peerId)
    Coord->>ContactSvc: removeContact(peerId)
    ContactSvc->>ConnMgr: Check if connected
    
    alt Connection exists
        ConnMgr->>WebRTC: close()
        WebRTC-->>ConnMgr: Closed
    end
    
    ContactSvc->>ContactRepo: softDelete(peerId)
    ContactRepo-->>ContactSvc: Deleted
    ContactSvc-->>Coord: Success
    Coord-->>UI: Contact removed
    UI-->>User: Update contact list
```

## Key Observations

1. **Asynchronous Communication**: All operations are asynchronous with proper error handling
2. **State Management**: Each service maintains its own state and notifies observers
3. **Retry Logic**: Built-in retry mechanisms with exponential backoff
4. **Message Persistence**: All messages are persisted locally before transmission
5. **Connection Resilience**: Automatic reconnection on failure
6. **Presence Awareness**: Heartbeat mechanism to track user presence
