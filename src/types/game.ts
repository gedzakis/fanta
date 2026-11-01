/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GamePhase =
  | 'MENU'
  | 'AIM_LINE'
  | 'THROW_LINE'
  | 'LINE_RESULTS'
  | 'FLIP_PREPARE'
  | 'FLIP_AIR'
  | 'FLIP_RESULTS'
  | 'ROUND_WINNER';

export type CoinFace = 'HEADS' | 'TAILS' | 'UNDECIDED';

export type MetalFinish = 'gold' | 'silver' | 'bronze' | 'brass' | 'copper' | 'steel';

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  botDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  color: string;
  metal: MetalFinish;
  score: number;
  roundsWon: number;
  totalCoinsWon: number;
  lastDistanceMeters?: number;
  lastDistanceRank?: number;
}

export interface CoinPhysicsState {
  id: number;
  playerId?: string;
  ownerName?: string;
  metal: MetalFinish;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  isResting: boolean;
  isSliding: boolean;
  bounces: number;
  distanceToLine?: number;
  face: CoinFace;
}

export interface TossResult {
  headsCount: number;
  tailsCount: number;
  totalCoins: number;
  isWinner: boolean;
  coins: Array<{
    id: number;
    metal: MetalFinish;
    face: CoinFace;
  }>;
}

export interface GameSettings {
  playerCount: number;
  coinsPerPlayer: number;
  soundEnabled: boolean;
  botDelayMs: number;
}
