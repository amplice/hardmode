// Network message type definitions

export enum MessageType {
  // Client -> Server
  INPUT = 'input',
  CHAT = 'chat',
  PING = 'ping',
  REQUEST_PLAYER_LIST = 'requestPlayerList',
  
  // Server -> Client
  CONNECTED = 'connected',
  PLAYER_JOINED = 'playerJoined',
  PLAYER_LEFT = 'playerLeft',
  PLAYER_LIST = 'playerList',
  PLAYER_UPDATE = 'playerUpdate',
  PONG = 'pong',
  
  // Bidirectional
  ERROR = 'error',
  DISCONNECT = 'disconnect',
}