export type DiceType = "d8" | "d12";

export interface DiceRoll {
  playerId: string;
  dice: DiceResult[];
  seed: number;
  timestamp: number;
}

export interface DiceResult {
  type: DiceType;
  value: number;
}
