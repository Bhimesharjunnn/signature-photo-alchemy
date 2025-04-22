import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { toast } from "sonner";

export type Pattern = "grid" | "hexagon" | "circular";

interface CollageCanvasProps {
  images: { id: string; url: string; name: string }[];
  mainPhotoId: string | null;
  pattern: Pattern;
  locked: boolean;
}

export interface CollageCanvasRef {
  downloadCanvas: (format: "png" | "pdf", dpi?: number) => Promise<void>;
}

// A4 dimensions (in mm)
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Convert to pixels at 96 DPI (screen display resolution)
const DISPLAY_DPI = 96;
const MM_TO_PIXELS = DISPLAY_DPI / 25.4; // 25.4mm = 1 inch

// Canvas display dimensions
const CANVAS_WIDTH = Math.round(A4_WIDTH_MM * MM_TO_PIXELS);
const CANVAS_HEIGHT = Math.round(A4_HEIGHT_MM * MM_TO_PIXELS);

const PADDING = 5;

// ============= UPDATED GRID LOGIC =============
function drawImagesToCanvas(
  ctx: CanvasRenderingContext2D,
  images: { id: string; url: string; name: string }[],
  mainPhotoId: string | null,
  pattern: Pattern
) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (images.length === 0) return;

  const mainIndex = images.findIndex((img) => img.id === mainPhotoId);
  if (mainIndex === -1) return;

  const mainImg = images[mainIndex];
  const sideImgs = images.filter((img) => img.id !== mainPhotoId);

  // ------- SMART, UNIFORM GRID PATTERN -------
  if (pattern === "grid") {
    // Warning for too many side photos (>50)
    if (images.length > 50) {
      toast.warning("Large number of photos may affect visual clarity", {
        id: "too-many-photos-warning",
        duration: 6000,
      });
    }

    // 1. Main photo occupies 50-60% of canvas width (choose 56% for nice frame)
    const mainFracW = 0.56;
    const mainFracH = mainFracW * (CANVAS_WIDTH / CANVAS_HEIGHT); // Keep close to square
    const mainW = Math.round(CANVAS_WIDTH * mainFracW);
    const mainH = Math.round(CANVAS_HEIGHT * mainFracW); // use width for both (to keep main image nearly square)
    const mainX = Math.round((CANVAS_WIDTH - mainW) / 2);
    const mainY = Math.round((CANVAS_HEIGHT - mainH) / 2);

    // 2. Compute the number of side images for each edge (top, bottom, left, right)
    const totalSide = sideImgs.length;
    if (totalSide === 0) {
      // Just draw main photo center
      drawImgSmartCrop(
        ctx,
        mainImg,
        mainX,
        mainY,
        mainW,
        mainH
      );
      return;
    }

    // Split side images as evenly as possible
    // Try to roughly: split more to top/bottom, rest to sides
    // Eg: 20 -> 6/6/4/4; 21 -> 6/6/5/4 etc (see example)
    // We'll auto-balance for symmetry

    // Empiric: split available photos to 2 rows, then remaining to sides
    // Let N = totalSide
    const rows = 2;
    const cols = 2;

    // First, estimate how many can fit on top/bottom based on aspect ratio and available space
    // We'll always try to keep the main image "framed" with at least 1 row top/bottom and 1 col left/right
    // The sizes must be identical for all side images

    // We'll generalize:
    // - Let nTop, nBottom, nLeft, nRight
    // - Try: nTop = Math.ceil(N / 4), nBottom = Math.floor(N / 4)
    //         nLeft = Math.ceil((N - nTop - nBottom) / 2)
    //         nRight = N - nTop - nBottom - nLeft
    // Then adjust left/right n to best fit remaining N

    let nTop = Math.ceil(totalSide / 4);
    let nBottom = Math.ceil(totalSide / 4);
    let nLeft = Math.floor((totalSide - nTop - nBottom) / 2);
    let nRight = totalSide - nTop - nBottom - nLeft;

    // Add more to top/bottom for balance if odd count remains
    // (Goal is: never have left/right "longer" than top/bottom)

    // 3. Now determine the dimensions of every side image

    // Space for side images
    const sideH = mainY - PADDING * 2; // space from canvas top to main image Y
    const sideW = mainX - PADDING * 2; // space from left to main image X

    // To fill canvas, including padding:
    //    [pad][sideW][pad][mainW][pad][sideW][pad]
    // So available sideW is what fits from edge to main image.
    // For top/bottom:
    //    [pad][sideH][pad][mainH][pad][sideH][pad]

    // We want ALL side images to be same size (width/height).
    // So, calculate the max possible width and height, based on max images on each side.

    // For a "tight" frame, ensure side images fill their band with padding included

    const maxTop = nTop;
    const maxBottom = nBottom;
    const maxLeft = nLeft;
    const maxRight = nRight;

    // For rows (top/bottom), determine per-photo width (allowing for padding between)
    const topPhotoW = ((CANVAS_WIDTH - 2 * (sideW + PADDING)) - (maxTop + 1) * PADDING) / (maxTop > 0 ? maxTop : 1);
    const bottomPhotoW = ((CANVAS_WIDTH - 2 * (sideW + PADDING)) - (maxBottom + 1) * PADDING) / (maxBottom > 0 ? maxBottom : 1);

    // For columns (left/right), determine per-photo height
    const leftPhotoH = ((CANVAS_HEIGHT - 2 * (sideH + PADDING)) - (maxLeft + 1) * PADDING) / (maxLeft > 0 ? maxLeft : 1);
    const rightPhotoH = ((CANVAS_HEIGHT - 2 * (sideH + PADDING)) - (maxRight + 1) * PADDING) / (maxRight > 0 ? maxRight : 1);

    // Final side image size is the minimum of all these to keep everything uniform and avoid overlaps
    // Use square images for perfect balance, or the min of W/H if more images on one side than the other
    const sideImageSize = Math.floor(
      Math.max(
        40, // minimum size (arbitrary, avoid too-tiny)
        Math.min(
          topPhotoW, bottomPhotoW, leftPhotoH, rightPhotoH
        )
      )
    );

    // Now lay out the main photo, with its bounding box
    drawImgSmartCrop(
      ctx,
      mainImg,
      mainX,
      mainY,
      mainW,
      mainH
    );

    // Distribute side images to top/bottom/left/right arrays
    let si = 0; // index in sideImgs
    const topImgs = sideImgs.slice(si, si + nTop); si += nTop;
    const bottomImgs = sideImgs.slice(si, si + nBottom); si += nBottom;
    const leftImgs = sideImgs.slice(si, si + nLeft); si += nLeft;
    const rightImgs = sideImgs.slice(si, si + nRight); si += nRight;

    // ---- Draw TOP Row ----
    if (topImgs.length > 0) {
      // Center images, calculate offset so they span width above main photo
      const totalW = topImgs.length * sideImageSize + (topImgs.length - 1) * PADDING;
      const startX = (CANVAS_WIDTH - totalW) / 2;
      const y = PADDING;
      for (let k = 0; k < topImgs.length; ++k) {
        const x = startX + k * (sideImageSize + PADDING);
        drawImgSmartCrop(ctx, topImgs[k], x, y, sideImageSize, sideImageSize);
      }
    }

    // ---- Draw BOTTOM Row ----
    if (bottomImgs.length > 0) {
      const totalW = bottomImgs.length * sideImageSize + (bottomImgs.length - 1) * PADDING;
      const startX = (CANVAS_WIDTH - totalW) / 2;
      const y = CANVAS_HEIGHT - sideImageSize - PADDING;
      for (let k = 0; k < bottomImgs.length; ++k) {
        const x = startX + k * (sideImageSize + PADDING);
        drawImgSmartCrop(ctx, bottomImgs[k], x, y, sideImageSize, sideImageSize);
      }
    }

    // ---- Draw LEFT Col ----
    if (leftImgs.length > 0) {
      const totalH = leftImgs.length * sideImageSize + (leftImgs.length - 1) * PADDING;
      const startY = (CANVAS_HEIGHT - totalH) / 2;
      const x = PADDING;
      for (let k = 0; k < leftImgs.length; ++k) {
        const y = startY + k * (sideImageSize + PADDING);
        drawImgSmartCrop(ctx, leftImgs[k], x, y, sideImageSize, sideImageSize);
      }
    }

    // ---- Draw RIGHT Col ----
    if (rightImgs.length > 0) {
      const totalH = rightImgs.length * sideImageSize + (rightImgs.length - 1) * PADDING;
      const startY = (CANVAS_HEIGHT - totalH) / 2;
      const x = CANVAS_WIDTH - sideImageSize - PADDING;
      for (let k = 0; k < rightImgs.length; ++k) {
        const y = startY + k * (sideImageSize + PADDING);
        drawImgSmartCrop(ctx, rightImgs[k], x, y, sideImageSize, sideImageSize);
      }
    }
    // ---- End Frame ----
  }

  // ============ HEXAGON & CIRCULAR - unchanged ============
  else if (pattern === "hexagon") {
    // Draw main image at center
    drawImgFit(
      ctx,
      mainImg,
      CANVAS_WIDTH / 2 - CANVAS_WIDTH / 5,
      CANVAS_HEIGHT / 2 - CANVAS_WIDTH / 5,
      (CANVAS_WIDTH / 5) * 2,
      (CANVAS_WIDTH / 5) * 2
    );
    // Distribute side images in a hex ring
    const r = CANVAS_WIDTH * 0.35;
    sideImgs.forEach((img, i) => {
      const angle = ((2 * Math.PI) / sideImgs.length) * i - Math.PI / 2;
      const x = CANVAS_WIDTH / 2 + r * Math.cos(angle) - 50;
      const y = CANVAS_HEIGHT / 2 + r * Math.sin(angle) - 50;
      drawImgFit(ctx, img, x, y, 100, 100);
    });
  } else if (pattern === "circular") {
    // Center main, others arranged in a circle
    drawImgFit(
      ctx,
      mainImg,
      CANVAS_WIDTH / 2 - CANVAS_WIDTH / 5,
      CANVAS_HEIGHT / 2 - CANVAS_WIDTH / 5,
      (CANVAS_WIDTH / 5) * 2,
      (CANVAS_WIDTH / 5) * 2
    );
    const r = CANVAS_WIDTH * 0.37;
    sideImgs.forEach((img, i) => {
      const angle = ((2 * Math.PI) / sideImgs.length) * i - Math.PI / 2;
      const x = CANVAS_WIDTH / 2 + r * Math.cos(angle) - 50;
      const y = CANVAS_HEIGHT / 2 + r * Math.sin(angle) - 50;
      drawImgFit(ctx, img, x, y, 100, 100);
    });
  }
}

// Smart crop: center-weighted, fits important content (center). Could be enhanced with a face-detection library for true "face crop"
function drawImgSmartCrop(
  ctx: CanvasRenderingContext2D,
  imgData: { url: string },
  x: number,
  y: number,
  w: number,
  h: number
) {
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = imgData.url;
  img.onload = () => {
    // Center crop/cover
    const srcAspect = img.width / img.height;
    const tgtAspect = w / h;
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
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  };
}

// For legacy patterns, keep as a fallback
function drawImgFit(
  ctx: CanvasRenderingContext2D,
  imgData: { url: string },
  x: number,
  y: number,
  w: number,
  h: number
) {
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = imgData.url;
  img.onload = () => {
    // Cover
    const ratio = Math.max(w / img.width, h / img.height);
    const dx = x;
    const dy = y;
    const dw = w;
    const dh = h;
    const sw = w / ratio;
    const sh = h / ratio;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  };
}

const CollageCanvas = forwardRef<CollageCanvasRef, CollageCanvasProps>(
  ({ images, mainPhotoId, pattern, locked }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

    useEffect(() => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx || !images.length || !mainPhotoId) {
        ctx?.clearRect(0, 0, dimensions.width, dimensions.height);
        return;
      }
      drawImagesToCanvas(ctx, images, mainPhotoId, pattern);
    }, [images, mainPhotoId, pattern, locked, dimensions]);

    useImperativeHandle(ref, () => ({
      downloadCanvas: async (format: "png" | "pdf", dpi = 300) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const tempCanvas = document.createElement("canvas");
        
        // Calculate dimensions for A4 at requested DPI
        // A4 dimensions: 210mm × 297mm (8.27in × 11.69in)
        const pixelsPerInch = dpi;
        const inchesWidth = A4_WIDTH_MM / 25.4; // 25.4mm = 1 inch
        const inchesHeight = A4_HEIGHT_MM / 25.4;
        
        tempCanvas.width = Math.round(inchesWidth * pixelsPerInch);
        tempCanvas.height = Math.round(inchesHeight * pixelsPerInch);
        
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return;
        
        // Draw white background
        tempCtx.fillStyle = "white";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Scale the context to match the high DPI
        const scale = pixelsPerInch / DISPLAY_DPI;
        tempCtx.scale(scale, scale);
        
        if (images.length && mainPhotoId) {
          drawImagesToCanvas(tempCtx, images, mainPhotoId, pattern);
          await new Promise(resolve => setTimeout(resolve, 500));
          if (format === "png") {
            const pngUrl = tempCanvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `collage-${pattern}-${new Date().getTime()}.png`;
            link.href = pngUrl;
            link.click();
          } else if (format === "pdf") {
            const { jsPDF } = await import("jspdf");
            const pdf = new jsPDF({
              orientation: "portrait",
              unit: "mm",
              format: "a4"
            });
            const imgData = tempCanvas.toDataURL("image/png");
            pdf.addImage(
              imgData,
              "PNG",
              0,
              0,
              A4_WIDTH_MM,
              A4_HEIGHT_MM
            );
            pdf.save(`collage-${pattern}-${new Date().getTime()}.pdf`);
          }
        }
      }
    }));

    return (
      <div className="flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border rounded shadow-lg bg-white"
          style={{ 
            maxWidth: "100%", 
            height: "auto",
            aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`
          }}
        />
        <p className="text-xs text-gray-500 mt-2">A4 size canvas (210×297mm)</p>
      </div>
    );
  }
);

CollageCanvas.displayName = "CollageCanvas";
export default CollageCanvas;
