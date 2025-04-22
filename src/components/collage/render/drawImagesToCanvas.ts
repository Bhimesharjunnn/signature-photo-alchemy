
import { toast } from "sonner";
import { drawImgSmartCrop, drawImgFit } from "./drawImageHelpers";
import type { Pattern } from "../types";

/**
 * Calculates the balanced distribution of side photos for grid layout
 * @param totalSidePhotos Total number of side photos (total photos - 1 main)
 * @returns {top, bottom, left, right} counts for even distribution
 */
function calculateSidePhotoDistribution(totalSidePhotos: number) {
  // Base distribution - divide by 4
  const base = Math.floor(totalSidePhotos / 4);
  // Remainder to distribute
  const remainder = totalSidePhotos % 4;
  
  return {
    top: base + (remainder > 0 ? 1 : 0), // First extra goes to top
    bottom: base + (remainder > 1 ? 1 : 0), // Second extra goes to bottom
    left: base + (remainder > 2 ? 1 : 0), // Third extra goes to left
    right: base + (remainder > 3 ? 1 : 0), // Fourth extra (impossible in %4) goes to right
  };
}

/**
 * Draws the collage using a CSS Grid-inspired layout.
 * Creates a perfect grid structure with equal-sized cells and consistent alignment.
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
    const GAP = PADDING; // Fixed 5px grid gap between cells
    
    // Get the distribution of photos from layout config
    const { top: nTop, bottom: nBottom, left: nLeft, right: nRight } = layoutConfig;
    
    // Calculate grid metrics for a perfect grid layout
    // Using 60% of canvas width for main photo (instead of previous 50%)
    const MAIN_WIDTH_PERCENTAGE = 0.6; 
    const MAIN_PHOTO_WIDTH = Math.round(CANVAS_WIDTH * MAIN_WIDTH_PERCENTAGE);
    const MAIN_PHOTO_HEIGHT = MAIN_PHOTO_WIDTH; // Keep main photo square
    
    // Setup grid cells dimensions to ensure equal cell sizes
    // For a perfect grid, all cells must be the same size
    const totalColumns = nLeft + 1 + nRight; // left cells + main + right cells
    const totalRows = nTop + 1 + nBottom; // top cells + main + bottom cells
    
    // Calculate cell size to fill 95% of canvas while maintaining grid structure
    // We want all side photos to be perfect squares of the same size
    const CANVAS_FILL_RATIO = 0.95; // Fill 95% of canvas
    
    // Calculate available space after accounting for gaps
    const availableWidth = CANVAS_WIDTH * CANVAS_FILL_RATIO - (GAP * (totalColumns - 1));
    const availableHeight = CANVAS_HEIGHT * CANVAS_FILL_RATIO - (GAP * (totalRows - 1));
    
    // Calculate grid cell sizes based on number of cells and main photo's relative size
    // Main photo should take multiple grid cells (equivalent to its size percentage)
    const mainColSpan = Math.ceil(totalColumns * MAIN_WIDTH_PERCENTAGE);
    const mainRowSpan = mainColSpan; // Keep main photo spans equal for square
    
    // Calculate cell size (all cells have the same dimension for perfect grid)
    const cellWidth = availableWidth / (totalColumns - mainColSpan + mainColSpan);
    const cellHeight = availableHeight / (totalRows - mainRowSpan + mainRowSpan);
    
    // Use the smaller dimension to ensure perfect squares for side photos
    const cellSize = Math.min(cellWidth, cellHeight);
    
    // Recalculate main photo dimensions based on cell size and its span
    const mainPhotoWidth = cellSize * mainColSpan + GAP * (mainColSpan - 1);
    const mainPhotoHeight = cellSize * mainRowSpan + GAP * (mainRowSpan - 1);
    
    // Calculate grid start position to center the entire grid on canvas
    const gridWidth = cellSize * totalColumns + GAP * (totalColumns - 1);
    const gridHeight = cellSize * totalRows + GAP * (totalRows - 1);
    const gridStartX = (CANVAS_WIDTH - gridWidth) / 2;
    const gridStartY = (CANVAS_HEIGHT - gridHeight) / 2;
    
    // Calculate position of the main photo (centered in the grid)
    const mainColStart = nLeft;
    const mainRowStart = nTop;
    const mainPhotoX = gridStartX + mainColStart * (cellSize + GAP);
    const mainPhotoY = gridStartY + mainRowStart * (cellSize + GAP);
    
    // Draw the main photo
    drawImgSmartCrop(ctx, mainImg, mainPhotoX, mainPhotoY, mainPhotoWidth, mainPhotoHeight);
    
    // Draw side photos in perfect grid alignment
    let sideImageIndex = 0;
    
    // Draw top row
    for (let i = 0; i < nTop && sideImageIndex < sideImgs.length; i++) {
      for (let col = 0; col < totalColumns && sideImageIndex < sideImgs.length; col++) {
        // Skip cells that are part of the main photo's span
        if (i >= mainRowStart && i < mainRowStart + mainRowSpan && 
            col >= mainColStart && col < mainColStart + mainColSpan) {
          continue;
        }
        
        const x = gridStartX + col * (cellSize + GAP);
        const y = gridStartY + i * (cellSize + GAP);
        drawImgSmartCrop(ctx, sideImgs[sideImageIndex], x, y, cellSize, cellSize);
        sideImageIndex++;
        
        // Break if we've drawn enough for top row
        if (sideImageIndex >= nTop) break;
      }
    }
    
    // Draw bottom row
    for (let i = 0; i < nBottom && sideImageIndex < sideImgs.length; i++) {
      for (let col = 0; col < totalColumns && sideImageIndex < sideImgs.length; col++) {
        // Skip cells that are part of the main photo's span
        if (i + mainRowStart + mainRowSpan >= mainRowStart && 
            i + mainRowStart + mainRowSpan < mainRowStart + mainRowSpan && 
            col >= mainColStart && col < mainColStart + mainColSpan) {
          continue;
        }
        
        const x = gridStartX + col * (cellSize + GAP);
        const y = gridStartY + (mainRowStart + mainRowSpan + i) * (cellSize + GAP);
        drawImgSmartCrop(ctx, sideImgs[sideImageIndex], x, y, cellSize, cellSize);
        sideImageIndex++;
        
        // Break if we've drawn enough for bottom row
        if (sideImageIndex >= nTop + nBottom) break;
      }
    }
    
    // Draw left column
    for (let i = 0; i < nLeft && sideImageIndex < sideImgs.length; i++) {
      for (let row = mainRowStart; row < mainRowStart + mainRowSpan && sideImageIndex < sideImgs.length; row++) {
        const x = gridStartX + i * (cellSize + GAP);
        const y = gridStartY + row * (cellSize + GAP);
        drawImgSmartCrop(ctx, sideImgs[sideImageIndex], x, y, cellSize, cellSize);
        sideImageIndex++;
        
        // Break if we've drawn enough for left column
        if (sideImageIndex >= nTop + nBottom + nLeft) break;
      }
    }
    
    // Draw right column
    for (let i = 0; i < nRight && sideImageIndex < sideImgs.length; i++) {
      for (let row = mainRowStart; row < mainRowStart + mainRowSpan && sideImageIndex < sideImgs.length; row++) {
        const x = gridStartX + (mainColStart + mainColSpan + i) * (cellSize + GAP);
        const y = gridStartY + row * (cellSize + GAP);
        drawImgSmartCrop(ctx, sideImgs[sideImageIndex], x, y, cellSize, cellSize);
        sideImageIndex++;
      }
    }
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
