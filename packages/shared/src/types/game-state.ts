import type { Player } from "./player.js";
import type { DiceRoll } from "./dice.js";

export type GamePhase = "lobby" | "playing" | "ended";

export interface GameState {
  phase: GamePhase;
  currentTurn: number;
  activePlayerId: string;
  players: Map<string, Player>;
  lastDiceRoll: DiceRoll | null;
}
