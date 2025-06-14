# Hardmode - Multiplayer Action RPG

A real-time multiplayer action RPG inspired by Realm of the Mad God, built with TypeScript, Pixi.js, Node.js, and Socket.io.

## Project Structure

```
hardmode/
├── src/                    # Client-side game code
│   ├── components/        # Game components (Player, Monster, etc.)
│   ├── systems/          # Game systems (Combat, Movement, etc.)
│   ├── ui/               # User interface components
│   └── main.ts           # Client entry point
├── server/                # Server-side code
│   ├── src/              # Server source files
│   │   ├── config/       # Configuration management
│   │   ├── systems/      # Server game systems
│   │   ├── entities/     # Server-side entities
│   │   └── index.ts      # Server entry point
│   ├── dist/             # Compiled server code (generated)
│   ├── package.json      # Server dependencies
│   ├── tsconfig.json     # Server TypeScript config
│   └── nodemon.json      # Development auto-restart config
├── shared/                # Code shared between client and server
│   ├── types/            # Shared TypeScript types
│   ├── constants/        # Game constants
│   └── utils/            # Shared utilities
├── protocol/              # Network protocol definitions
│   ├── messages/         # Message type definitions
│   └── events/           # Event type definitions
├── public/                # Static assets
├── node_modules/          # Client dependencies
├── package.json           # Client dependencies
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # Client TypeScript config
└── MMO_Implementation_Checklist.md  # Development roadmap
```

## Getting Started

### Prerequisites

- Node.js 18+ LTS
- npm or yarn
- PostgreSQL (for future persistence features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hardmode
```

2. Install client dependencies:
```bash
npm install
```

3. Install server dependencies:
```bash
cd server
npm install
cd ..
```

### Development

Run both client and server in development mode:

1. Start the game server:
```bash
cd server
npm run dev
```

2. In a new terminal, start the client:
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

### Environment Configuration

1. Copy the example environment file:
```bash
cd server
cp .env.example .env
```

2. Update the `.env` file with your configuration

### Building for Production

1. Build the client:
```bash
npm run build
```

2. Build the server:
```bash
cd server
npm run build
```

## Architecture Overview

### Client-Server Architecture

- **Server-Authoritative**: All game logic is validated on the server
- **Client Prediction**: Smooth gameplay through client-side prediction with server reconciliation
- **Real-time Communication**: WebSocket-based communication using Socket.io
- **Entity Component System**: Modular architecture for game entities

### Network Protocol

- **Message Types**: Defined in `protocol/messages/`
- **Event System**: Bidirectional events defined in `protocol/events/`
- **Compression**: Message batching and delta compression for efficiency
- **Security**: Input validation and rate limiting on all endpoints

### Game Systems

- **Movement**: WASD + mouse-based movement with server validation
- **Combat**: Real-time combat with server-side hit detection
- **World Generation**: Procedural world generation with deterministic seeding
- **Persistence**: Player data and world state persistence (PostgreSQL)

## Development Roadmap

See [MMO_Implementation_Checklist.md](MMO_Implementation_Checklist.md) for the complete development roadmap.

Current Phase: **Phase 0 - Pre-Development Setup**

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Submit pull requests for review

## Performance Goals

- Support 100-300 concurrent players per server
- 60 Hz server tick rate
- 20 Hz network update rate
- <100ms average latency compensation
- Efficient rendering for 100+ entities on screen

## Security Considerations

- Server-side validation for all player actions
- Rate limiting on all API endpoints
- Input sanitization and bounds checking
- Anti-cheat measures and anomaly detection
- Secure session management

## License

[Your License Here]

## Acknowledgments

- Inspired by Realm of the Mad God
- Built with Pixi.js, Socket.io, and Node.js