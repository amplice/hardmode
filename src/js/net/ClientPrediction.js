export class ClientPrediction {
    constructor(player, network) {
        this.player = player;
        this.network = network;
        this.pendingInputs = [];
        this.nextSequenceNumber = 0;
        this.lastAcknowledged = -1;
    }

    applyInput(inputState, deltaTime) {
        // Apply locally for instant responsiveness
        this.player.update(deltaTime, inputState);
        const seq = this.nextSequenceNumber++;
        this.pendingInputs.push({ inputState, deltaTime, sequenceNumber: seq });
        if (this.network && this.network.sendInput) {
            this.network.sendInput({
                input: inputState,
                sequenceNumber: seq,
                timestamp: Date.now()
            });
        }
    }

    reconcile(serverState, lastProcessed) {
        if (typeof lastProcessed === 'number') {
            this.lastAcknowledged = Math.max(this.lastAcknowledged, lastProcessed);
            this.pendingInputs = this.pendingInputs.filter(
                (p) => p.sequenceNumber > this.lastAcknowledged
            );
        }

        if (serverState) {
            this.player.position.x = serverState.position.x;
            this.player.position.y = serverState.position.y;
            this.player.facing = serverState.facing || this.player.facing;
            this.player.sprite.position.set(serverState.position.x, serverState.position.y);
        }

        for (const pending of this.pendingInputs) {
            this.player.update(pending.deltaTime, pending.inputState);
        }
    }
}
