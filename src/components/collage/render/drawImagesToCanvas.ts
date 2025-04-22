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
    const canvasW = CANVAS_WIDTH, canvasH = CANVAS_HEIGHT;
    const GAP = PADDING; // Fixed 5px padding between photos

    // Get the distribution of photos from layout config
    const { top: nTop, bottom: nBottom, left: nLeft, right: nRight } = layoutConfig;

    // Main photo width is fixed at 50% of canvas width as specified
    const MAIN_PHOTO_WIDTH = Math.round(canvasW * 0.5);
    
    // Calculate side photo dimensions for optimal canvas fill (90-95%)
    // For top and bottom rows: width = (Canvas width - padding) / number of photos
    // For left and right columns: height = (Canvas height - padding) / number of photos
    
    // Side photo dimensions (calculate both width for top/bottom, height for left/right)
    const topBottomWidth = nTop > 0 ? Math.floor((canvasW - (nTop + 1) * GAP) / nTop) : 0;
    const leftRightHeight = nLeft > 0 ? Math.floor((canvasH - (nLeft + 1) * GAP) / nLeft) : 0;
    
    // For consistency, make all side photos square
    // Use the smaller dimension to ensure they all fit
    const sidePhotoSize = Math.min(
      topBottomWidth, 
      leftRightHeight
    );
    
    // Main photo centered position
    const mainPhotoX = (canvasW - MAIN_PHOTO_WIDTH) / 2;
    const mainPhotoY = (canvasH - MAIN_PHOTO_WIDTH) / 2;
    
    // Calculate row/column positions to center everything
    const topY = Math.max(GAP, mainPhotoY - sidePhotoSize - GAP);
    const bottomY = Math.min(canvasH - sidePhotoSize - GAP, mainPhotoY + MAIN_PHOTO_WIDTH + GAP);
    const leftX = Math.max(GAP, mainPhotoX - sidePhotoSize - GAP);
    const rightX = Math.min(canvasW - sidePhotoSize - GAP, mainPhotoX + MAIN_PHOTO_WIDTH + GAP);

    // Calculate start positions for top and bottom rows (centered)
    const topBottomStartX = (canvasW - (nTop * sidePhotoSize + (nTop - 1) * GAP)) / 2;
    
    // Calculate start positions for left and right columns (centered)
    const leftRightStartY = (canvasH - (nLeft * sidePhotoSize + (nLeft - 1) * GAP)) / 2;
    
    // Draw the main photo centered
    drawImgSmartCrop(ctx, mainImg, mainPhotoX, mainPhotoY, MAIN_PHOTO_WIDTH, MAIN_PHOTO_WIDTH);
    
    // Counter for side images
    let sideImageIndex = 0;
    
    // Draw top row
    for (let i = 0; i < nTop && sideImageIndex < sideImgs.length; i++) {
      const x = topBottomStartX + i * (sidePhotoSize + GAP);
      drawImgSmartCrop(ctx, sideImgs[sideImageIndex], x, topY, sidePhotoSize, sidePhotoSize);
      sideImageIndex++;
    }
    
    // Draw bottom row
    for (let i = 0; i < nBottom && sideImageIndex < sideImgs.length; i++) {
      const x = topBottomStartX + i * (sidePhotoSize + GAP);
      drawImgSmartCrop(ctx, sideImgs[sideImageIndex], x, bottomY, sidePhotoSize, sidePhotoSize);
      sideImageIndex++;
    }
    
    // Draw left column
    for (let i = 0; i < nLeft && sideImageIndex < sideImgs.length; i++) {
      const y = leftRightStartY + i * (sidePhotoSize + GAP);
      drawImgSmartCrop(ctx, sideImgs[sideImageIndex], leftX, y, sidePhotoSize, sidePhotoSize);
      sideImageIndex++;
    }
    
    // Draw right column
    for (let i = 0; i < nRight && sideImageIndex < sideImgs.length; i++) {
      const y = leftRightStartY + i * (sidePhotoSize + GAP);
      drawImgSmartCrop(ctx, sideImgs[sideImageIndex], rightX, y, sidePhotoSize, sidePhotoSize);
      sideImageIndex++;
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
