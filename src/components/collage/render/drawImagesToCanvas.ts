
import { toast } from "sonner";
import { drawImgSmartCrop, drawImgFit } from "./drawImageHelpers";
import type { Pattern } from "../types";

/**
 * Draws the collage using a CSS Grid-inspired layout.
 */
export function drawImagesToCanvas(
  ctx: CanvasRenderingContext2D,
  images: { id: string; url: string; name: string }[],
  mainPhotoId: string | null,
  pattern: Pattern,
  CANVAS_WIDTH: number,
  CANVAS_HEIGHT: number,
  PADDING: number
) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (images.length === 0) return;
  const mainIndex = images.findIndex((img) => img.id === mainPhotoId);
  if (mainIndex === -1) return;

  const mainImg = images[mainIndex];
  const sideImgs = images.filter((img) => img.id !== mainPhotoId);

  if (pattern === "grid") {
    if (images.length > 50) {
      toast.warning("Large number of photos may affect visual clarity", {
        id: "too-many-photos-warning",
        duration: 6000,
      });
    }

    // --- Grid Layout Calculation ---
    // Constants
    const GAP = PADDING;
    const canvasW = CANVAS_WIDTH, canvasH = CANVAS_HEIGHT;

    // 1. Main image: 60% of canvas width, centered
    const mainW = Math.round(canvasW * 0.6);
    const mainH = mainW; // Square main image
    // Center main within the canvas vertically as well
    let mainX = Math.round((canvasW - mainW) / 2);
    let mainY = Math.round((canvasH - mainH) / 2);

    // 2. Estimate grid cells required
    // We want: [topRow], [middleRow (side-left | main | side-right)], [bottomRow]
    // All side images = same size, fill as much area as possible up to canvas edges.
    // We'll dynamically pick the row/col counts to ensure tight fill.

    // Calculate available space around the main photo (include gaps)
    const availTop = mainY - GAP;
    const availBottom = canvasH - (mainY + mainH + GAP);
    const availSide = (canvasW - mainW) / 2 - GAP;

    // Determine possible max cell sizes for top/bottom and side bands
    // To maximize area, side images size = min(cell size by side, by top/bottom)
    // Let N be # of side images; split approx equally between top, bottom, left, right
    let nTotal = sideImgs.length;
    let nTop = Math.ceil(nTotal / 4);
    let nBottom = Math.floor(nTotal / 4);
    let nLeft = Math.ceil((nTotal - nTop - nBottom) / 2);
    let nRight = nTotal - nTop - nBottom - nLeft;

    // For better packing symmetry, switch approach if groups are very uneven
    // Try all feasible splits to maximize area coverage and equalize cell size
    type Option = {
      nTop: number; nBottom: number; nLeft: number; nRight: number;
      cell: number; score: number; // cell = side img size
      usedW: number; usedH: number;
    };
    let best: Option | null = null;

    for (
      let t = Math.max(1, Math.floor(nTotal / 4));
      t <= Math.min(nTotal, Math.ceil(nTotal / 2));
      ++t
    ) {
      for (
        let b = Math.max(0, Math.floor((nTotal-t)/3));
        b <= Math.min(nTotal-t, t+2);
        ++b
      ) {
        let remaining = nTotal - t - b;
        for (let l = Math.max(0, Math.floor(remaining/2)); l <= Math.min(remaining, t+2); ++l) {
          let r = remaining - l;
          if (r < 0) continue;

          // Rows: top, main, bottom   Cols: left, main, right
          // Find max possible cell size for this configuration
          
          // Top/bottom rows: each cell's width
          let topCells = t > 0 ? t : 1;
          let botCells = b > 0 ? b : 1;
          let topCellW = (canvasW - 2*GAP - (topCells-1)*GAP) / topCells;
          let bottomCellW = (canvasW - 2*GAP - (botCells-1)*GAP) / botCells;
          // Side cells: each cell's height
          let leftCells = l > 0 ? l : 1;
          let rightCells = r > 0 ? r : 1;
          let sideCellH = (canvasH - mainH - 4*GAP - (Math.max(leftCells, rightCells)-1)*GAP) / Math.max(leftCells, rightCells);

          // The limiting size is minimum of all
          let cell = Math.floor(
            Math.max(
              40,
              Math.min(
                topCellW,
                bottomCellW,
                sideCellH,
                availSide,
                availTop,
                availBottom
              )
            )
          );
          // Total block spans (including padding)
          let usedW = Math.max(
            mainW + 2*cell + 4*GAP,
            Math.max(topCells, botCells) * cell + (Math.max(topCells, botCells)+1)*GAP
          );
          let usedH = topCells>0 && botCells>0
            ? cell + GAP + mainH + GAP + cell + GAP
            : mainH + 2*cell + 4*GAP;
          // Score = maximize area fill, prefer symmetric/distributed layouts
          let fill = (usedW*usedH)/(canvasW*canvasH);
          let symmetry = -(Math.abs(t-b) + Math.abs(l-r));
          let score = fill * 100 + symmetry;
          if (
            (t+l+b+r) === nTotal &&
            usedW/canvasW >= 0.9 &&
            usedH/canvasH >= 0.9 &&
            cell >= 30 &&
            (best === null || score > (best.score || 0))
          ) {
            best = { nTop:t, nBottom:b, nLeft:l, nRight:r, cell, score, usedW, usedH };
          }
        }
      }
    }
    // If not found, fallback to "all sides" equal distribution
    if (!best) {
      let k = Math.ceil(nTotal/4);
      let cell = Math.floor(Math.min(availTop, availBottom, availSide, (canvasW-GAP*5-k*GAP)/(k+2)));
      best = { nTop:k, nBottom:k, nLeft:k, nRight:nTotal-3*k, cell, score:0, usedW:0, usedH:0 };
    }

    // Center the collage block
    const blockW = Math.max(
      mainW + (best.nLeft + best.nRight)*best.cell + (best.nLeft + best.nRight + 2)*GAP,
      Math.max(best.nTop, best.nBottom) * best.cell + (Math.max(best.nTop, best.nBottom)+1)*GAP
    );
    const blockH = mainH + (best.nTop + best.nBottom)*best.cell + (best.nTop + best.nBottom + 2)*GAP;
    const offsetX = Math.round((canvasW - blockW) / 2);
    const offsetY = Math.round((canvasH - blockH) / 2);

    // Draw Top
    let idx=0;
    for(let i=0;i<best.nTop;++i,++idx){
      let x = offsetX + GAP + i*(best.cell + GAP);
      let y = offsetY + GAP;
      if(sideImgs[idx])
        drawImgSmartCrop(ctx, sideImgs[idx], x, y, best.cell, best.cell);
    }
    // Draw Bottom
    for(let i=0;i<best.nBottom;++i,++idx){
      let x = offsetX + GAP + i*(best.cell + GAP);
      let y = offsetY + GAP + best.nTop*(best.cell+GAP) + mainH + GAP;
      if(sideImgs[idx])
        drawImgSmartCrop(ctx, sideImgs[idx], x, y, best.cell, best.cell);
    }
    // Draw Left
    for(let i=0;i<best.nLeft;++i,++idx){
      let x = offsetX + GAP;
      let y = offsetY + GAP + best.nTop*(best.cell+GAP) + i*(best.cell+GAP);
      if(sideImgs[idx])
        drawImgSmartCrop(ctx, sideImgs[idx], x, y, best.cell, best.cell);
    }
    // Draw Right
    for(let i=0;i<best.nRight;++i,++idx){
      let x = offsetX + GAP + best.nLeft*(best.cell+GAP) + mainW + GAP;
      let y = offsetY + GAP + best.nTop*(best.cell+GAP) + i*(best.cell+GAP);
      if(sideImgs[idx])
        drawImgSmartCrop(ctx, sideImgs[idx], x, y, best.cell, best.cell);
    }

    // Draw Main
    let mainDrawX = offsetX + GAP + best.nLeft*(best.cell+GAP);
    let mainDrawY = offsetY + GAP + best.nTop*(best.cell+GAP);
    drawImgSmartCrop(ctx, mainImg, mainDrawX, mainDrawY, mainW, mainH);
  }
  else if (pattern === "hexagon" || pattern === "circular") {
    // Unchanged: keep the same fallback
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

