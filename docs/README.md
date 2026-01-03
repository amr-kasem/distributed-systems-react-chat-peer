# React P2P Chat Application Documentation

## Overview

This is a peer-to-peer (P2P) chat application built with React, TypeScript, and Vite. The application enables direct communication between users without a central server, using WebRTC for data transmission and MQTT for signaling.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Communication Flow](#communication-flow)
3. [Core Components](#core-components)
4. [Technology Stack](#technology-stack)
5. [Setup and Installation](#setup-and-installation)
6. [Diagrams](#diagrams)

## Architecture Overview

The application follows SOLID principles with a clean, layered architecture:

- **Presentation Layer**: React components for UI
- **Service Layer**: Business logic and communication services
- **Repository Layer**: Data persistence using IndexedDB
- **Infrastructure Layer**: WebRTC and MQTT implementations

### Key Design Principles

- **Single Responsibility**: Each service handles one specific concern
- **Interface Segregation**: Focused interfaces for each service
- **Dependency Inversion**: Services depend on abstractions, not concrete implementations
- **Open/Closed**: Extensible through interfaces without modifying existing code

## Communication Flow

The application uses a hybrid communication model:

1. **Signaling Phase** (MQTT):
   - User discovery
   - Connection negotiation
   - SDP (Session Description Protocol) exchange
   - ICE candidate exchange

2. **Data Transfer Phase** (WebRTC):
   - Direct peer-to-peer messaging
   - Real-time communication
   - No server intermediary

## Core Components

### Services

#### 1. ChatCoordinator
- **Purpose**: Orchestrates all chat services
- **Responsibilities**:
  - Initializes and coordinates all services
  - Manages message flow
  - Handles contact management
  - Provides unified API for UI

#### 2. MQTTService
- **Purpose**: Handles signaling communication
- **Responsibilities**:
  - Connects to MQTT broker
  - Sends/receives signaling messages
  - Manages connection state
  - Implements retry logic with exponential backoff

#### 3. WebRTCService
- **Purpose**: Manages peer-to-peer connections
- **Responsibilities**:
  - Creates and manages RTCPeerConnection
  - Handles SDP offer/answer exchange
  - Manages ICE candidates
  - Sends/receives messages via data channel

#### 4. ConnectionManager
- **Purpose**: Manages WebRTC connection lifecycle
- **Responsibilities**:
  - Initiates connections
  - Monitors connection health
  - Handles reconnection logic
  - Manages presence heartbeats

#### 5. MessagingService
- **Purpose**: Handles message operations
- **Responsibilities**:
  - Sends messages via WebRTC
  - Persists messages to database
  - Manages pending messages
  - Handles message delivery status

#### 6. ContactService
- **Purpose**: Manages contacts
- **Responsibilities**:
  - Add/remove contacts
  - Handle contact requests
  - Manage contact status
  - Persist contact data

### Repositories

#### MessageRepository
- Stores messages in IndexedDB
- Retrieves message history
- Updates message status

#### ContactRepository
- Stores contact information
- Manages contact list
- Handles soft deletes

## Technology Stack

### Core Technologies
- **React 19.2.0**: UI framework
- **TypeScript 5.9.3**: Type-safe development
- **Vite 7.2.4**: Build tool and dev server

### Communication
- **MQTT 5.14.1**: Signaling protocol
- **WebRTC**: Peer-to-peer data transfer
- **Simple-Peer 9.11.1**: WebRTC wrapper

### Storage
- **IndexedDB**: Client-side database for messages and contacts

### Development Tools
- **ESLint**: Code linting
- **TypeScript ESLint**: TypeScript-specific linting

## Setup and Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MQTT broker (e.g., Mosquitto)

### Installation Steps

1. **Clone the repository**
   ```bash
   cd chat-app-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure MQTT broker**
   - Update MQTT broker URL in `src/services/MQTTService.ts`
   - Default: `ws://localhost:9001`

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

### Docker Deployment

The application includes Docker configuration:

```bash
cd docker
docker-compose up -d
```

## Diagrams

For detailed diagrams including:
- Use Case Diagram
- Sequence Diagrams
- Component Diagram
- Communication Flow Diagram
- State Diagrams

Please refer to the individual diagram files in this `docs` directory:
- [Use Case Diagram](./use-case-diagram.md)
- [Sequence Diagrams](./sequence-diagrams.md)
- [Component Architecture](./component-architecture.md)
- [Communication Flow](./communication-flow.md)
- [State Diagrams](./state-diagrams.md)

## Project Structure

```
chat-app-react/
├── src/
│   ├── components/          # React UI components
│   │   ├── ChatApp.tsx     # Main application component
│   │   ├── ChatArea.tsx    # Chat message display
│   │   ├── Sidebar.tsx     # Contact list sidebar
│   │   └── ...
│   ├── services/           # Business logic services
│   │   ├── ChatCoordinator.ts
│   │   ├── MQTTService.ts
│   │   ├── WebRTCService.ts
│   │   ├── ConnectionManager.ts
│   │   ├── MessagingService.ts
│   │   └── ContactService.ts
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── main.tsx           # Application entry point
├── docker/                 # Docker configuration
├── docs/                   # Documentation
└── package.json
```

## Key Features

- ✅ Peer-to-peer messaging
- ✅ Contact management
- ✅ Message persistence
- ✅ Connection retry logic
- ✅ Presence detection
- ✅ Offline message queue
- ✅ Connection health monitoring
- ✅ Automatic reconnection

## License

Private project - not for public distribution
