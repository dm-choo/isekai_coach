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
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly rowXOffset?: number;
}

export const DEFAULT_GRID_PROJECTION: GridProjectionConfig = {
  origin: { x: 62, y: 356 },
  columnStep: 105,
  rowStep: 72,
  cellWidth: 102,
  cellHeight: 68,
};

export const SUBMISSION_GRID_PROJECTION: GridProjectionConfig = {
  origin: { x: 45, y: 420 },
  columnStep: 105,
  rowStep: 42,
  cellWidth: 102,
  cellHeight: 40,
  rowXOffset: 18,
};

/** Logical coordinates stay independent from the replaceable side-view projection. */
export class GridProjector {
  public constructor(private readonly config: GridProjectionConfig = DEFAULT_GRID_PROJECTION) {}

  public gridToWorld(position: LogicalPosition): WorldPosition {
    return {
      x: this.config.origin.x + position.x * this.config.columnStep + position.y * (this.config.rowXOffset ?? 0),
      y: this.config.origin.y + position.y * this.config.rowStep,
    };
  }

  public worldToGrid(position: WorldPosition): LogicalPosition {
    const y = Math.round((position.y - this.config.origin.y) / this.config.rowStep);
    const x = Math.round((position.x - this.config.origin.x - y * (this.config.rowXOffset ?? 0)) / this.config.columnStep);
    return { x, y };
  }

  public get cellSize(): Readonly<{ width: number; height: number }> {
    return { width: this.config.cellWidth, height: this.config.cellHeight };
  }

  public get tileSize(): Readonly<{ width: number; height: number }> {
    return { width: this.config.columnStep, height: this.config.rowStep };
  }
}
