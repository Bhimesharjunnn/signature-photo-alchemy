
import { toast } from "sonner";
import { drawImgSmartCrop, drawImgFit } from "./drawImageHelpers";
import type { Pattern } from "../types";

/**
 * Draws the collage using a CSS Grid-inspired layout.
 * Optimized to minimize white space, maximize photo size,
 * and ensure equal paddings and balanced distribution.
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
    const canvasW = CANVAS_WIDTH, canvasH = CANVAS_HEIGHT, GAP = PADDING;

    const { top: nTop, bottom: nBottom, left: nLeft, right: nRight } = layoutConfig;

    // --- Layout optimization logic starts here ---
    // Find largest possible "main" size and side photo size so all fit, max out occupation
    // The formula: for given (nTop, nBottom, nLeft, nRight), solve for largest integer mainSize & sideSize.
    // Let s = side cell size, m = main photo size (square)

    // The main photo will be at least 30% of the smaller canvas dimension, at most 60%,
    // but will shrink to allow bigger side images so all fit.
    let bestConfig = { main: 0, side: 0, offsetX: 0, offsetY: 0, gap: 0 };
    let maxAreaFill = 0;

    // Try scaling main photo from 60% down to 30% of width, test which config best fills canvas:
    for (let mainFrac = 0.6; mainFrac >= 0.3; mainFrac -= 0.01) {
      const mainSize = Math.floor(Math.min(canvasW, canvasH) * mainFrac);

      // Available width/height for side photos
      const availW = canvasW - mainSize - GAP * 2;
      const availH = canvasH - mainSize - GAP * 2;

      // How many side images on each row/col (we have these from layoutConfig)
      // The size of each side photo:
      const sTop    = nTop    ? Math.floor( (mainSize + availW + GAP * 2 - (nTop-1)*GAP)    / nTop )    : 0;
      const sBottom = nBottom ? Math.floor( (mainSize + availW + GAP * 2 - (nBottom-1)*GAP) / nBottom ) : 0;
      const sLeft   = nLeft   ? Math.floor( (mainSize + availH + GAP * 2 - (nLeft-1)*GAP)   / nLeft )   : 0;
      const sRight  = nRight  ? Math.floor( (mainSize + availH + GAP * 2 - (nRight-1)*GAP)  / nRight )  : 0;

      // Side cell size: minimum across all nonzero that exist.
      const candidates = [sTop, sBottom, sLeft, sRight].filter(Boolean);
      if (!candidates.length) continue;
      const sideCell = Math.min(...candidates);

      // The total width/height occupied by the collage
      const totalW = GAP + (nLeft ? sideCell * nLeft + GAP * nLeft : 0)
        + mainSize
        + (nRight ? GAP * nRight + sideCell * nRight : 0)
        + GAP;
      const totalH = GAP + (nTop ? sideCell * nTop + GAP * nTop : 0)
        + mainSize
        + (nBottom ? GAP * nBottom + sideCell * nBottom : 0)
        + GAP;
      const areaFill = (totalW * totalH) / (canvasW * canvasH);

      // Only accept solutions that don't overflow the canvas, maximize area fill
      if (
        totalW <= canvasW + 2 &&
        totalH <= canvasH + 2 &&
        areaFill > maxAreaFill &&
        areaFill >= 0.90 &&      // ensure at least 90% fill
        sideCell >= 20 &&        // don't make tiny sides
        mainSize >= 60           // don't make tiny main
      ) {
        bestConfig = {
          main: mainSize,
          side: sideCell,
          offsetX: Math.floor((canvasW - totalW) / 2 + GAP),
          offsetY: Math.floor((canvasH - totalH) / 2 + GAP),
          gap: GAP
        };
        maxAreaFill = areaFill;
      }
    }

    // Fallback if nothing adequate found: use just 50% main, conservative side cell
    if (bestConfig.main === 0) {
      const fallbackMain = Math.floor(Math.min(canvasW, canvasH) * 0.5);
      const fallbackSides = Math.max(30, Math.floor((canvasW - fallbackMain - GAP * 4) / (Math.max(nLeft, nRight, nTop, nBottom) || 1)));
      bestConfig = {
        main: fallbackMain,
        side: fallbackSides,
        offsetX: Math.floor((canvasW - fallbackMain) / 2),
        offsetY: Math.floor((canvasH - fallbackMain) / 2),
        gap: GAP
      };
    }

    const { main: mainW, side: sideCell, offsetX, offsetY, gap } = bestConfig;

    // --- Drawing routine: draw sides, then main, with precise alignment ---
    let idx = 0;
    // Top row (left to right)
    for (let i = 0; i < nTop; ++i, ++idx) {
      const x = offsetX + (nLeft ? (sideCell + gap) * nLeft : 0) + i * (sideCell + gap);
      const y = offsetY;
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, sideCell, sideCell);
    }
    // Bottom row (left to right)
    for (let i = 0; i < nBottom; ++i, ++idx) {
      const x = offsetX + (nLeft ? (sideCell + gap) * nLeft : 0) + i * (sideCell + gap);
      const y = offsetY + (nTop ? (sideCell + gap) * nTop : 0) + mainW + gap;
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, sideCell, sideCell);
    }
    // Left col (top to bottom)
    for (let i = 0; i < nLeft; ++i, ++idx) {
      const x = offsetX;
      const y = offsetY + (nTop ? (sideCell + gap) * nTop : 0) + i * (sideCell + gap);
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, sideCell, sideCell);
    }
    // Right col (top to bottom)
    for (let i = 0; i < nRight; ++i, ++idx) {
      const x = offsetX + (nLeft ? (sideCell + gap) * nLeft : 0) + mainW + gap;
      const y = offsetY + (nTop ? (sideCell + gap) * nTop : 0) + i * (sideCell + gap);
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, sideCell, sideCell);
    }
    // Draw Main last, centered
    const mainX = offsetX + (nLeft ? (sideCell + gap) * nLeft : 0);
    const mainY = offsetY + (nTop ? (sideCell + gap) * nTop : 0);
    drawImgSmartCrop(ctx, mainImg, mainX, mainY, mainW, mainW);

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

