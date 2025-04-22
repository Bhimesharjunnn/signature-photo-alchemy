import { toast } from "sonner";
import { calculateGridLayout } from "../layout/calculateGridLayout";
import { drawImgSmartCrop, drawImgFit } from "./drawImageHelpers";
import type { Pattern } from "../../CollageCanvas";

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
    const layout = calculateGridLayout({
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      padding: PADDING,
      imagesCount: images.length,
      mainPhotoIndex: mainIndex,
    });

    // Draw side images
    for (let i = 0; i < sideImgs.length; ++i) {
      const pos = layout.side[i];
      if (pos) drawImgSmartCrop(ctx, sideImgs[i], pos.x, pos.y, pos.w, pos.h);
    }
    // Draw main photo
    const m = layout.main;
    drawImgSmartCrop(ctx, mainImg, m.x, m.y, m.w, m.h);
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
