export interface Vector2 {
    x: number;
    y: number;
}
export interface PlayerState {
    id: string;
    username: string;
    position: Vector2;
    velocity: Vector2;
    health: number;
    maxHealth: number;
    class: string;
}
export interface InputState {
    movement: Vector2;
    mousePosition: Vector2;
    attacking: boolean;
}
export interface GameConfig {
    tickRate: number;
    updateRate: number;
    maxPlayers: number;
}
//# sourceMappingURL=index.d.ts.map