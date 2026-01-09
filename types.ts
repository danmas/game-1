
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface TargetData {
  id: string;
  position: Vector3;
  hit: boolean;
}

export interface ProjectileData {
  id: string;
  position: Vector3;
  velocity: Vector3;
  createdAt: number;
}

export enum GameState {
  READY = 'READY',
  PULLING = 'PULLING',
  WON = 'WON'
}
