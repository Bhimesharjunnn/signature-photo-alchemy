import { toast } from "sonner";
import { calculateGridLayout } from "../layout/calculateGridLayout";
import { calculateHexagonLayout } from "../layout/calculateHexagonLayout";
import { drawImgSmartCrop, drawImgFit } from "./drawImageHelpers";
import type { Pattern } from "../types";

/**
 * Master drawing function to paint images by pattern.
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
    
    // Calculate layout for all images
    const layout = calculateGridLayout({
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      padding: PADDING,
      imagesCount: images.length,
      mainPhotoIndex: mainIndex,
    });

    // Draw all side images
    sideImgs.forEach((img, i) => {
      if (i < layout.side.length) {
        const pos = layout.side[i];
        drawImgSmartCrop(ctx, img, pos.x, pos.y, pos.w, pos.h);
      }
    });
    
    // Draw main photo last (on top)
    const m = layout.main;
    drawImgSmartCrop(ctx, mainImg, m.x, m.y, m.w, m.h);
  }
  else if (pattern === "hexagon") {
    // Use our new hexagon layout algorithm
    const layout = calculateHexagonLayout({
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      padding: PADDING,
      imagesCount: images.length,
    });
    
    // Draw all side photos with hexagonal clipping
    sideImgs.forEach((img, i) => {
      if (i < layout.sideHexagons.length) {
        const hex = layout.sideHexagons[i];
        drawHexagonImage(ctx, img, hex.x, hex.y, hex.size);
      }
    });
    
    // Draw main photo in the center
    const mainHex = layout.centerHexagon;
    drawHexagonImage(ctx, mainImg, mainHex.x, mainHex.y, mainHex.size);
  }
  else if (pattern === "circular") {
    // Keep the circular pattern as a fallback option
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

/**
 * Draws an image clipped to a hexagonal shape
 */
function drawHexagonImage(
  ctx: CanvasRenderingContext2D,
  imgData: { url: string },
  centerX: number,
  centerY: number,
  size: number
) {
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = imgData.url;
  img.onload = () => {
    ctx.save();
    
    // Create hexagon path
    drawHexagonPath(ctx, centerX, centerY, size);
    ctx.clip();
    
    // Calculate source dimensions for center crop
    const srcAspect = img.width / img.height;
    const tgtAspect = 1; // Hexagons are based on a square bounding box
    let sx, sy, sw, sh;
    
    if (srcAspect > tgtAspect) {
      // Source is wider: crop sides
      sh = img.height;
      sw = img.height * tgtAspect;
      sy = 0;
      sx = (img.width - sw) / 2;
    } else {
      // Source is taller: crop top/bottom
      sw = img.width;
      sh = img.width / tgtAspect;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    
    // Draw image
    ctx.drawImage(
      img, 
      sx, sy, sw, sh, 
      centerX - size, centerY - size, 
      size * 2, size * 2
    );
    
    ctx.restore();
  };
}

/**
 * Creates a hexagonal clipping path
 */
function drawHexagonPath(
  ctx: CanvasRenderingContext2D, 
  centerX: number, 
  centerY: number, 
  size: number
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = centerX + size * Math.cos(angle);
    const y = centerY + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}
