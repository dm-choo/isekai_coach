export interface LogicalPosition {
  readonly x: number;
  readonly y: number;
}

export interface WorldPosition {
  readonly x: number;
  readonly y: number;
}

export interface GridProjectionConfig {
  readonly origin: WorldPosition;
  readonly columnStep: number;
  readonly rowStep: number;
  readonly rowSkew: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
}

export const DEFAULT_GRID_PROJECTION: GridProjectionConfig = {
  origin: { x: 76, y: 180 },
  columnStep: 73,
  rowStep: 84,
  rowSkew: 15,
  cellWidth: 68,
  cellHeight: 72,
};

/** Logical coordinates stay independent from the replaceable side-view projection. */
export class GridProjector {
  public constructor(private readonly config: GridProjectionConfig = DEFAULT_GRID_PROJECTION) {}

  public gridToWorld(position: LogicalPosition): WorldPosition {
    return {
      x:
        this.config.origin.x +
        position.x * this.config.columnStep +
        position.y * this.config.rowSkew,
      y: this.config.origin.y + position.y * this.config.rowStep,
    };
  }

  public worldToGrid(position: WorldPosition): LogicalPosition {
    const y = Math.round((position.y - this.config.origin.y) / this.config.rowStep);
    const x = Math.round(
      (position.x - this.config.origin.x - y * this.config.rowSkew) /
        this.config.columnStep,
    );
    return { x, y };
  }

  public get cellSize(): Readonly<{ width: number; height: number }> {
    return { width: this.config.cellWidth, height: this.config.cellHeight };
  }
}
