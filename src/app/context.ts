import type * as THREE from 'three';
import type { Physics } from '../engine/physics';
import type { Input } from '../input/input';
import type { CameraRig } from '../engine/camera';
import type { AudioManager } from '../audio/audio';
import type { Particles, Telegraphs } from '../fx/particles';
import type { EventBus } from '../core/events';
import type { GameState } from '../game/state';
import type { Stats } from '../items/inventory';
import type { Level } from '../world/level-w01';
import type { Settings } from './settings';

/** Alvo que pode receber golpes do jogador. */
export interface Hurtable {
  id: string;
  alive: boolean;
  pos: THREE.Vector3;
  radius: number;
  height: number;
  name: string;
  lockable: boolean;
  receiveHit(h: PlayerHit): void;
  lockPoint(out: THREE.Vector3): THREE.Vector3;
  hpFrac(): number;
  stabFrac(): number;
}
export interface PlayerHit { amount: number; crit: boolean; stagger: number; dir: THREE.Vector3; heavy: boolean; from: THREE.Vector3; attackId: string }
export interface EnemyHit { amount: number; stagger: number; type: 'kinetic' | 'electric'; blockable: boolean; from: THREE.Vector3; source: string; unblockableReason?: string }

export interface GameCtx {
  scene: THREE.Scene;
  physics: Physics; input: Input; cam: CameraRig; audio: AudioManager; fx: Particles; tele: Telegraphs; events: EventBus;
  state: GameState; stats: Stats; settings: Settings; level: Level;
  targets(): Hurtable[];
  hitstop(seconds: number): void;
  shake(v: number): void;
  damageNumber(pos: THREE.Vector3, amount: number, crit: boolean, color?: string): void;
  difficultyMul: { dmgTaken: number; telegraph: number; extraAttacks: boolean };
  time: number;
  heavyImpact(p: THREE.Vector3): void;
  player: { pos: THREE.Vector3; alive: boolean; invulnerable: boolean; applyDamage(h: EnemyHit): boolean; center(out?: THREE.Vector3): THREE.Vector3; parried: string | null; blockHeld: boolean; forward(out?: THREE.Vector3): THREE.Vector3 };
  attackTokens: Set<string>;
}
