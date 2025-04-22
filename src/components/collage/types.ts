
export type Pattern = "grid" | "hexagon" | "circular";

export interface CollageCanvasRef {
  downloadCanvas: (format: "png" | "pdf", dpi?: number) => Promise<void>;
}
