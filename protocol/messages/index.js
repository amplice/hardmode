"use strict";
// Network message type definitions
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    // Client -> Server
    MessageType["INPUT"] = "input";
    MessageType["CHAT"] = "chat";
    MessageType["PING"] = "ping";
    MessageType["REQUEST_PLAYER_LIST"] = "requestPlayerList";
    // Server -> Client
    MessageType["CONNECTED"] = "connected";
    MessageType["PLAYER_JOINED"] = "playerJoined";
    MessageType["PLAYER_LEFT"] = "playerLeft";
    MessageType["PLAYER_LIST"] = "playerList";
    MessageType["PLAYER_UPDATE"] = "playerUpdate";
    MessageType["PONG"] = "pong";
    // Bidirectional
    MessageType["ERROR"] = "error";
    MessageType["DISCONNECT"] = "disconnect";
})(MessageType || (exports.MessageType = MessageType = {}));
//# sourceMappingURL=index.js.map