
export type Pattern = "grid" | "hexagon" | "circular" | "special-grid";

export interface CollageCanvasRef {
  downloadCanvas: (format: "png" | "pdf", dpi?: number) => Promise<void>;
}
