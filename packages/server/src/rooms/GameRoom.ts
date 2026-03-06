import { Room, Client } from "colyseus";
import { GameRoomState } from "../state/GameState.js";
import { GAME_CONFIG } from "@epopee/shared";

export class GameRoom extends Room<GameRoomState> {
  maxClients = GAME_CONFIG.maxPlayers;

  onCreate(_options: Record<string, unknown>) {
    this.setState(new GameRoomState());
    console.log(`🎲 Room ${this.roomId} created`);

    // Register message handlers
    this.onMessage("rollDice", (client, message) => {
      this.handleRollDice(client, message);
    });
  }

  onJoin(client: Client, options: { name?: string }) {
    const playerName = options.name || `Joueur ${this.state.players.size + 1}`;
    this.state.addPlayer(client.sessionId, playerName);
    console.log(`⚔️ ${playerName} (${client.sessionId}) joined room ${this.roomId}`);
  }

  onLeave(client: Client, _consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    const name = player?.name || client.sessionId;
    this.state.removePlayer(client.sessionId);
    console.log(`🚪 ${name} left room ${this.roomId}`);
  }

  onDispose() {
    console.log(`💀 Room ${this.roomId} disposed`);
  }

  private handleRollDice(
    client: Client,
    message: { diceTypes: string[] },
  ) {
    // Validate it's the active player
    if (this.state.activePlayerId !== client.sessionId) {
      client.send("error", { message: "Ce n'est pas votre tour" });
      return;
    }

    // TODO: implement dice roll logic in Phase 2
    console.log(`🎲 ${client.sessionId} wants to roll: ${message.diceTypes}`);
  }
}
