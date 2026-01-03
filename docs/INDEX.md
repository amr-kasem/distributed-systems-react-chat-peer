# Documentation Index - React P2P Chat Application

## 📚 Documentation Overview

This directory contains comprehensive documentation for the React P2P Chat Application, including architecture diagrams, communication flows, use cases, and technical specifications.

## 📖 Documentation Files

### 1. [README.md](./README.md)
**Main documentation file** - Start here for an overview of the project.

**Contents:**
- Architecture overview
- Technology stack
- Setup and installation instructions
- Core components description
- Project structure
- Key features

### 2. [Use Case Diagram](./use-case-diagram.md)
**User interaction and system use cases**

**Contents:**
- System actors (User A, User B, MQTT Broker, WebRTC)
- 13 detailed use cases with descriptions
- Use case flow diagrams
- Actor relationships
- Use case priorities (High/Medium/Low)

**Key Use Cases:**
- UC1: Register/Login
- UC2: Add Contact
- UC6: Send Message
- UC9: Establish P2P Connection
- UC11: Reconnect on Failure

### 3. [Sequence Diagrams](./sequence-diagrams.md)
**Detailed interaction flows between components**

**Contents:**
- 8 comprehensive sequence diagrams
- User login and initialization
- Add contact flow
- Accept contact and establish connection
- Send message flow
- Connection failure and reconnection
- Message persistence and offline queue
- Presence and heartbeat
- Contact removal

### 4. [Component Architecture](./component-architecture.md)
**System architecture and component details**

**Contents:**
- System architecture overview
- Presentation layer (React components)
- Coordination layer (ChatCoordinator)
- Service layer (MQTT, WebRTC, Connection Manager, etc.)
- Repository layer (Message and Contact repositories)
- Data flow diagrams
- Interface definitions

**Key Components:**
- ChatCoordinator
- MQTTService
- WebRTCService
- ConnectionManager
- MessagingService
- ContactService

### 5. [Communication Flow](./communication-flow.md)
**Detailed communication protocols and flows**

**Contents:**
- Communication layers overview
- MQTT signaling phase (topic structure, message types)
- WebRTC connection establishment (ICE, SDP exchange)
- Data transfer phase (data channel)
- Connection states
- Network topology
- Security (encryption layers)
- Performance optimization
- Error handling and retry strategy

### 6. [State Diagrams](./state-diagrams.md)
**State machines for all major components**

**Contents:**
- 10 detailed state diagrams
- Application state machine
- MQTT service state
- WebRTC connection state
- Message state
- Contact state
- Connection manager state
- Data channel state
- Presence state
- Retry state machine
- Message queue state

## 🎯 Quick Navigation

### For New Developers
1. Start with [README.md](./README.md) for project overview
2. Review [Component Architecture](./component-architecture.md) to understand the system
3. Study [Sequence Diagrams](./sequence-diagrams.md) for interaction flows

### For Understanding User Flows
1. Check [Use Case Diagram](./use-case-diagram.md) for user interactions
2. Review [Sequence Diagrams](./sequence-diagrams.md) for detailed flows

### For Technical Implementation
1. Study [Component Architecture](./component-architecture.md) for service details
2. Review [Communication Flow](./communication-flow.md) for protocols
3. Check [State Diagrams](./state-diagrams.md) for state management

### For Debugging
1. Review [State Diagrams](./state-diagrams.md) to understand current state
2. Check [Sequence Diagrams](./sequence-diagrams.md) for expected flow
3. Study [Communication Flow](./communication-flow.md) for protocol details

## 🔑 Key Concepts

### SOLID Principles
All services follow SOLID principles:
- **S**ingle Responsibility: Each service has one clear purpose
- **O**pen/Closed: Extensible without modification
- **L**iskov Substitution: Services are interchangeable via interfaces
- **I**nterface Segregation: Focused, minimal interfaces
- **D**ependency Inversion: Depend on abstractions, not concretions

### Communication Model
- **Signaling**: MQTT for connection setup and presence
- **Data Transfer**: WebRTC for peer-to-peer messaging
- **Persistence**: IndexedDB for local storage

### Architecture Layers
1. **Presentation**: React components
2. **Coordination**: ChatCoordinator orchestrates services
3. **Service**: Business logic (MQTT, WebRTC, etc.)
4. **Repository**: Data persistence
5. **Infrastructure**: External systems (MQTT broker, WebRTC)

## 📊 Diagrams Summary

| Diagram Type | Count | Purpose |
|--------------|-------|---------|
| Use Case Diagrams | 2 | User interactions and system actors |
| Sequence Diagrams | 8 | Component interactions over time |
| Component Diagrams | 10+ | System structure and relationships |
| State Diagrams | 10 | State machines and transitions |
| Flow Diagrams | 15+ | Data and control flow |

## 🛠️ Technology Stack

- **Frontend**: React 19.2.0, TypeScript 5.9.3
- **Build Tool**: Vite 7.2.4
- **Signaling**: MQTT 5.14.1
- **P2P**: WebRTC (Native API)
- **Storage**: IndexedDB
- **Linting**: ESLint

## 📝 Documentation Standards

All diagrams use **Mermaid** syntax for:
- Version control friendly (text-based)
- Easy to update and maintain
- Renders in GitHub and most markdown viewers
- Supports various diagram types

## 🔗 Related Documentation

- **Main Project README**: [../README.md](../README.md)
- **Flutter Implementation**: [../../p2p_chat_flutter/docs/](../../p2p_chat_flutter/docs/)
- **Cross-Project Comparison**: [../../COMPARISON.md](../../COMPARISON.md)

## 📧 Contributing to Documentation

When updating documentation:
1. Keep diagrams up-to-date with code changes
2. Use consistent terminology across documents
3. Update this index when adding new documentation
4. Follow existing diagram styles and formats
5. Include both high-level and detailed views

## 📅 Last Updated

This documentation was last updated: **January 3, 2026**

---

**Note**: This is a living documentation. As the project evolves, these documents should be updated to reflect the current state of the system.
