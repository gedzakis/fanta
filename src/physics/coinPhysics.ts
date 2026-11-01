/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CoinFace, CoinPhysicsState, MetalFinish } from '../types/game';
import { sounds } from '../audio/soundEffects';

export const COIN_RADIUS = 0.16; // 16 cm radius for great 3D visibility
export const COIN_THICKNESS = 0.028;
export const LINE_Z = 0.0;
export const LINE_HALF_WIDTH = 1.5; // 3.0 meters wide line (-1.5 to +1.5)
export const START_Z = -9.8; // ~10m distance from target line

const GRAVITY = 15.2; // snappier, punchier gravity
const GROUND_Y = COIN_THICKNESS / 2;
const RESTITUTION = 0.38; // crisp bounce
const FRICTION = 7.5; // snappier ground slide deceleration
const AIR_DRAG = 0.05;
const PHYSICS_SPEED = 1.45; // 1.45x simulation speed factor

// Calculate exact perpendicular or Euclidean distance from point (x, z) to 3m line segment
export function computeDistanceToLineSegment(x: number, z: number): number {
  if (x >= -LINE_HALF_WIDTH && x <= LINE_HALF_WIDTH) {
    // Directly in front of the line
    return Math.abs(z - LINE_Z);
  } else if (x < -LINE_HALF_WIDTH) {
    const dx = x - (-LINE_HALF_WIDTH);
    const dz = z - LINE_Z;
    return Math.sqrt(dx * dx + dz * dz);
  } else {
    const dx = x - LINE_HALF_WIDTH;
    const dz = z - LINE_Z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}

// Create initial coin state for line throw
export function createLineThrowCoin(
  id: number,
  playerId: string,
  ownerName: string,
  metal: MetalFinish,
  aimAngleRad: number, // left-right angle
  powerRatio: number,  // 0.2 to 1.0
  pitchAngleRad: number = 0.28 // upward elevation angle
): CoinPhysicsState {
  // Base velocity tuned so max power throws ~10-12 meters
  // Range is roughly v^2 * sin(2*theta) / g
  // 10m target requires roughly v ≈ 10.5 m/s at ~25-30 deg
  const speed = 8.5 + powerRatio * 8.0; // 8.5 to 16.5 m/s for fast 10m flight
  const vHorizontal = speed * Math.cos(pitchAngleRad);
  const vy = speed * Math.sin(pitchAngleRad);
  const vx = Math.sin(aimAngleRad) * vHorizontal;
  const vz = Math.cos(aimAngleRad) * vHorizontal;

  return {
    id,
    playerId,
    ownerName,
    metal,
    x: 0,
    y: 1.15, // thrown from player hand height
    z: START_Z,
    vx,
    vy,
    vz,
    rotX: Math.random() * Math.PI,
    rotY: aimAngleRad,
    rotZ: 0,
    vRotX: 25 + Math.random() * 15, // fast forward end-over-end spin
    vRotY: (Math.random() - 0.5) * 6,
    vRotZ: (Math.random() - 0.5) * 6,
    isResting: false,
    isSliding: false,
    bounces: 0,
    distanceToLine: undefined,
    face: 'UNDECIDED',
  };
}

// Create multiple coins grouped together for the "Bacanje uvis" (Toss in air)
export function createAirTossCoins(
  count: number,
  playerMetal: MetalFinish,
  allPlayerMetals: MetalFinish[]
): CoinPhysicsState[] {
  const coins: CoinPhysicsState[] = [];

  for (let i = 0; i < count; i++) {
    // Spread metals across collected pot or player's
    const metal = allPlayerMetals[i % allPlayerMetals.length] || playerMetal;
    const spreadAngle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const lateralSpeed = 0.4 + Math.random() * 0.7;

    // Fast, crisp upward toss impulse
    const vy = 6.5 + Math.random() * 2.5; // snappy flight
    const vx = Math.cos(spreadAngle) * lateralSpeed;
    const vz = Math.sin(spreadAngle) * lateralSpeed * 0.7;

    // Coin starts in palm of hand around (0, 1.25, 0)
    coins.push({
      id: i + 1,
      metal,
      x: (Math.random() - 0.5) * 0.2,
      y: 1.25 + (Math.random() - 0.5) * 0.1,
      z: (Math.random() - 0.5) * 0.2,
      vx,
      vy,
      vz,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      vRotX: (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 25),
      vRotY: (Math.random() - 0.5) * 20,
      vRotZ: (Math.random() - 0.5) * 20,
      isResting: false,
      isSliding: false,
      bounces: 0,
      face: 'UNDECIDED',
    });
  }

  return coins;
}

// Step physics simulation for a coin
export function updateCoinPhysics(
  coin: CoinPhysicsState,
  dt: number,
  soundTrigger: boolean = true
): boolean {
  if (coin.isResting) return false;

  // Cap dt and apply speedup factor for snappy gameplay
  const stepDt = Math.min(dt, 0.033) * PHYSICS_SPEED;

  // Apply Air Drag
  coin.vx *= 1 - AIR_DRAG * stepDt;
  coin.vz *= 1 - AIR_DRAG * stepDt;

  if (!coin.isSliding) {
    // In air
    coin.vy -= GRAVITY * stepDt;
    coin.x += coin.vx * stepDt;
    coin.y += coin.vy * stepDt;
    coin.z += coin.vz * stepDt;

    // Air rotation
    coin.rotX += coin.vRotX * stepDt;
    coin.rotY += coin.vRotY * stepDt;
    coin.rotZ += coin.vRotZ * stepDt;

    // Ground check
    if (coin.y <= GROUND_Y) {
      coin.y = GROUND_Y;
      coin.bounces++;

      const impactVelocity = Math.abs(coin.vy);

      if (impactVelocity > 0.4) {
        // Bounce up with restitution
        coin.vy = impactVelocity * RESTITUTION;
        // Dampen horizontal velocity on bounce
        coin.vx *= 0.65;
        coin.vz *= 0.65;
        // Perturb rotation on bounce
        coin.vRotX *= 0.5;
        coin.vRotY *= 0.5;
        coin.vRotZ *= 0.5;

        if (soundTrigger) {
          sounds.playBounce(Math.min(impactVelocity / 4, 1.0));
        }
      } else {
        // Transition to ground slide
        coin.vy = 0;
        coin.isSliding = true;
        if (soundTrigger) {
          sounds.playSlide(0.3);
        }
      }
    }
  } else {
    // Sliding on the ground
    const speed = Math.hypot(coin.vx, coin.vz);

    if (speed > 0.075) {
      const decel = FRICTION * stepDt;
      const newSpeed = Math.max(0, speed - decel);
      const ratio = newSpeed / speed;
      coin.vx *= ratio;
      coin.vz *= ratio;

      coin.x += coin.vx * stepDt;
      coin.z += coin.vz * stepDt;

      // Slight wobble while sliding
      coin.vRotX *= 0.85;
      coin.vRotZ *= 0.85;
      coin.rotX += coin.vRotX * stepDt;
      coin.rotZ += coin.vRotZ * stepDt;
    } else {
      // Stopped sliding -> Settle flat
      coin.vx = 0;
      coin.vz = 0;
      coin.vy = 0;
      coin.isSliding = false;
      coin.isResting = true;

      // Settle flat onto either face 0 (normal +Y) or PI (normal -Y)
      // Normalize rotX to 0 or PI
      const normRotX = ((coin.rotX % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      // Cosine determines which side faces up
      const cosUp = Math.cos(normRotX);
      if (cosUp >= 0) {
        coin.rotX = 0;
        coin.rotZ = 0;
        coin.face = 'HEADS';
      } else {
        coin.rotX = Math.PI;
        coin.rotZ = 0;
        coin.face = 'TAILS';
      }

      // Compute final distance to line
      coin.distanceToLine = computeDistanceToLineSegment(coin.x, coin.z);
    }
  }

  return true;
}
