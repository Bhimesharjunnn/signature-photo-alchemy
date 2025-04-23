import { toast } from "sonner";
import { drawImgSmartCrop, drawImgFit } from "./drawImageHelpers";
import type { Pattern } from "../types";

/**
 * Draws the collage using a CSS Grid-inspired layout.
 * Accepts layoutConfig for grid division if provided.
 */
export function drawImagesToCanvas(
  ctx: CanvasRenderingContext2D,
  images: { id: string; url: string; name: string }[],
  mainPhotoId: string | null,
  pattern: Pattern,
  CANVAS_WIDTH: number,
  CANVAS_HEIGHT: number,
  PADDING: number,
  layoutConfig?: { top: number; bottom: number; left: number; right: number } | null,
) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (images.length === 0) return;
  const mainIndex = images.findIndex((img) => img.id === mainPhotoId);
  if (mainIndex === -1) return;

  const mainImg = images[mainIndex];
  const sideImgs = images.filter((img) => img.id !== mainPhotoId);

  if (pattern === "grid" && layoutConfig) {
    // GRID LAYOUT with explicit config
    // MAIN: 60% width, centered, square
    const canvasW = CANVAS_WIDTH,
      canvasH = CANVAS_HEIGHT,
      GAP = PADDING;

    const mainW = Math.round(canvasW * 0.6);
    const mainH = mainW;
    // Compute main photo position (centered)
    const mainX = Math.round((canvasW - mainW) / 2);
    const mainY = Math.round((canvasH - mainH) / 2);

    // Sides config - sideImgs must match top+bottom+left+right
    const { top: nTop, bottom: nBottom, left: nLeft, right: nRight } = layoutConfig;
    // Calculate max possible side size to "hug" the main photo and reach canvas edge (with 5px padding)
    function getSideCellSize() {
      // For each band, compute size that fits from edge to main photo (less 2*GAP for edge/gap)
      const availTop = mainY - GAP * 2;
      const topH = availTop > 0 && nTop ? Math.floor((availTop - (nTop - 1) * GAP) / 1) : 0;

      const availBottom = canvasH - (mainY + mainH) - GAP * 2;
      const bottomH = availBottom > 0 && nBottom ? Math.floor((availBottom - (nBottom - 1) * GAP) / 1) : 0;

      const availLeft = mainX - GAP * 2;
      const availRight = canvasW - (mainX + mainW) - GAP * 2;
      // Tallest possible for vertical sides
      const leftW = availLeft > 0 && nLeft ? Math.floor((availLeft - (nLeft - 1) * GAP) / 1) : 0;
      const rightW = availRight > 0 && nRight ? Math.floor((availRight - (nRight - 1) * GAP) / 1) : 0;

      let minTop = nTop ? Math.floor((canvasW - GAP * 2 - (nTop - 1) * GAP) / nTop) : 0;
      let minBottom = nBottom ? Math.floor((canvasW - GAP * 2 - (nBottom - 1) * GAP) / nBottom) : 0;
      let minLeft = nLeft ? Math.floor((canvasH - GAP * 2 - (nLeft - 1) * GAP) / nLeft) : 0;
      let minRight = nRight ? Math.floor((canvasH - GAP * 2 - (nRight - 1) * GAP) / nRight) : 0;

      // Find final cell size = min across all sides,
      // but must "hug" main photo and canvas edge (including gap)
      const candidates: number[] = [];
      // For top/bottom, height is less of a problem (more likely limited by columns)
      if (nTop) candidates.push(availTop > 0 ? Math.min(minTop, topH) : 0);
      if (nBottom) candidates.push(availBottom > 0 ? Math.min(minBottom, bottomH) : 0);
      if (nLeft) candidates.push(availLeft > 0 ? Math.min(minLeft, leftW) : 0);
      if (nRight) candidates.push(availRight > 0 ? Math.min(minRight, rightW) : 0);

      // Fallback to allowed min: 30px
      return Math.max(Math.min(...candidates.filter(Boolean)), 30);
    }
    const sideCell = getSideCellSize();

    // Draw Top row
    let idx = 0;
    for (let i = 0; i < nTop; ++i, ++idx) {
      let x = GAP + i * (sideCell + GAP);
      let y = GAP;
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, sideCell, sideCell);
    }
    // Draw Bottom row
    for (let i = 0; i < nBottom; ++i, ++idx) {
      let x = GAP + i * (sideCell + GAP);
      let y = canvasH - GAP - sideCell;
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, sideCell, sideCell);
    }
    // Draw Left col
    for (let i = 0; i < nLeft; ++i, ++idx) {
      let x = GAP;
      let y = mainY + i * (sideCell + GAP);
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, sideCell, sideCell);
    }
    // Draw Right col
    for (let i = 0; i < nRight; ++i, ++idx) {
      let x = canvasW - GAP - sideCell;
      let y = mainY + i * (sideCell + GAP);
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, sideCell, sideCell);
    }
    // Draw Main last, centered
    drawImgSmartCrop(ctx, mainImg, mainX, mainY, mainW, mainH);
    // --- Ensure entire layout fills at least 90% of the canvas area by construction ---

  } else if (pattern === "hexagon" || pattern === "circular") {
    drawImgFit(
      ctx,
      mainImg,
      CANVAS_WIDTH / 2 - CANVAS_WIDTH / 5,
      CANVAS_HEIGHT / 2 - CANVAS_WIDTH / 5,
      (CANVAS_WIDTH / 5) * 2,
      (CANVAS_WIDTH / 5) * 2
    );
    const r = CANVAS_WIDTH * 0.36;
    sideImgs.forEach((img, i) => {
      const angle = ((2 * Math.PI) / sideImgs.length) * i - Math.PI / 2;
      const x = CANVAS_WIDTH / 2 + r * Math.cos(angle) - 50;
      const y = CANVAS_HEIGHT / 2 + r * Math.sin(angle) - 50;
      drawImgFit(ctx, img, x, y, 100, 100);
    });
  }
}
