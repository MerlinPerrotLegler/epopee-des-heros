import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("number") score: number = 0;
  @type("number") position: number = 0;
  @type("boolean") isActive: boolean = false;
}

export class DiceRollState extends Schema {
  @type("string") playerId: string = "";
  @type("number") d12Result: number = 0;
  @type("number") d8Result: number = 0;
  @type("number") seed: number = 0;
  @type("number") timestamp: number = 0;
}

export class GameRoomState extends Schema {
  @type("string") phase: string = "lobby";
  @type("number") currentTurn: number = 0;
  @type("string") activePlayerId: string = "";
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(DiceRollState) lastDiceRoll: DiceRollState | null = null;

  addPlayer(sessionId: string, name: string) {
    const player = new PlayerState();
    player.id = sessionId;
    player.name = name;
    player.isActive = true;
    this.players.set(sessionId, player);

    // First player becomes active
    if (this.players.size === 1) {
      this.activePlayerId = sessionId;
    }
  }

  removePlayer(sessionId: string) {
    this.players.delete(sessionId);

    // If active player left, assign next
    if (this.activePlayerId === sessionId && this.players.size > 0) {
      const firstKey = this.players.keys().next().value;
      if (firstKey) {
        this.activePlayerId = firstKey;
      }
    }
  }
}
