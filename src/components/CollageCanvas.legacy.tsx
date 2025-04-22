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
  const totalSide = sideImgs.length;

  // ------- FULL-FRAME GRID PATTERN OPTIMIZED -------
  if (pattern === "grid") {
    // Show a warning for extreme photo counts
    if (images.length > 50) {
      toast.warning("Large number of photos may affect visual clarity", {
        id: "too-many-photos-warning",
        duration: 6000,
      });
    }

    // The main photo is a centered square using 50% of canvas width
    const MAIN_FRAC = 0.5;
    const pad = PADDING;

    const mainSize = Math.round(CANVAS_WIDTH * MAIN_FRAC);

    // Available space left for side photos on each direction
    // Make an outer frame around main image, spanning the A4 as closely as possible

    // We want to maximize side photo size given (nTop, nBottom, nLeft, nRight):
    // To distribute evenly, let's find a configuration where top/bottom/left/right are as balanced as possible, with any "extras" going to the top/bottom first for symmetry
    // (The math below ensures the main photo stays 50%, never shrinks;
    //  side photo count and size computed accordingly.)

    // Heuristic: For N side imgs, compute minimal "gap" surrounding main, maximize k
    // First, estimate # of imgs along each side (nHoriz, nVert)

    // We need to solve for: (nLeft + nRight) vertical slots and (nTop + nBottom) horizontal slots, such that:
    //   (nLeft + nRight) + (nTop + nBottom) = totalSide
    // But the corners will overlap in grid, so for a tightly-packed frame, subtract 4 for the corners (each is counted in both row and col):
    //   totalSide = (nTop + nBottom) + (nLeft + nRight)
    //     (corner overlap handled automatically since we'll assign left/right = remaining after top/bottom)

    // To maximize symmetry, try all reasonable splits of totalSide between horizontal(top+bottom) and vertical(left+right)
    let bestConfig = null;
    let bestScore = -Infinity;

    for (
      let nTop = Math.floor(totalSide / 4);
      nTop <= Math.ceil((totalSide + 3) / 4) + 1;
      nTop++
    ) {
      for (
        let nBottom = Math.floor(totalSide / 4);
        nBottom <= Math.ceil((totalSide + 3) / 4) + 1;
        nBottom++
      ) {
        let remaining = totalSide - (nTop + nBottom);
        if (remaining < 0) continue;

        // Distribute remaining to left/right as evenly as possible
        let nLeft = Math.ceil(remaining / 2);
        let nRight = remaining - nLeft;

        // Don't allow negative
        if (nLeft < 0 || nRight < 0) continue;

        // # of side images per row/col (corners will "double up")
        const sideImgsOnWidth = Math.max(nLeft, nRight);
        const sideImgsOnHeight = Math.max(nTop, nBottom);

        // Given the above, compute the max possible side square size that fits all sides around main photo
        // Frame total spans:
        // width: leftPad + nLeft * s + pad + mainSize + pad + nRight * s + rightPad
        // height: topPad + nTop * s + pad + mainSize + pad + nBottom * s + bottomPad

        // To "hug" the main photo, minimize pads and edge gaps.
        // We'll keep the outermost padding at 'pad' on each edge for symmetry.
        // Total collage width:
        const totalW =
          pad + nLeft * (pad) + nLeft * 1 +  // left pads
          mainSize +
          pad + nRight * (pad) + nRight * 1 +  // right pads
          pad;
        const totalH =
          pad + nTop * (pad) + nTop * 1 +
          mainSize +
          pad + nBottom * (pad) + nBottom * 1 +
          pad;

        // But these are just for pad counting. Let's actually solve for s:
        // Left/right: W = pad + nLeft*(s+pad) + mainSize + nRight*(s+pad) + pad
        //             => W = mainSize + (nLeft + nRight)*s + (nLeft + nRight + 2)*pad
        // So side cell size:
        let availW = CANVAS_WIDTH - mainSize - (nLeft + nRight + 2) * pad;
        let availH = CANVAS_HEIGHT - mainSize - (nTop + nBottom + 2) * pad;
        let sW = nLeft + nRight > 0 ? Math.floor(availW / (nLeft + nRight)) : 0;
        let sH = nTop + nBottom > 0 ? Math.floor(availH / (nTop + nBottom)) : 0;

        // Pick minimal of the two so every side cell is a square
        let s = Math.max(1, Math.min(sW, sH));

        // Compute real used W/H
        let width_used = mainSize + (nLeft + nRight) * s + (nLeft + nRight + 2) * pad;
        let height_used = mainSize + (nTop + nBottom) * s + (nTop + nBottom + 2) * pad;

        // Score: prefer configurations that use most of canvas (least white)
        let areaFill = (width_used / CANVAS_WIDTH) * (height_used / CANVAS_HEIGHT);
        // Penalize unbalanced side splits
        let symmetry =
          -Math.abs(nTop - nBottom) - Math.abs(nLeft - nRight);

        // Only consider splits with all sides used and all images placed
        if ((nTop + nBottom + nLeft + nRight) !== totalSide) continue;

        let score = areaFill * 100 + symmetry;
        if (score > bestScore && s > 25) {
          bestScore = score;
          bestConfig = {
            nTop, nBottom, nLeft, nRight, s, width_used, height_used
          };
        }
      }
    }

    if (!bestConfig) {
      // Fallback: just draw centered main photo
      drawImgSmartCrop(
        ctx,
        mainImg,
        (CANVAS_WIDTH - mainSize) / 2,
        (CANVAS_HEIGHT - mainSize) / 2,
        mainSize,
        mainSize
      );
      return;
    }

    // Maximize collage placement so it nearly touches edges
    const { nTop, nBottom, nLeft, nRight, s, width_used, height_used } = bestConfig;

    const offsetX = Math.round((CANVAS_WIDTH - width_used) / 2);
    const offsetY = Math.round((CANVAS_HEIGHT - height_used) / 2);

    let idx = 0;
    // Top row (left to right)
    for (let i = 0; i < nTop; ++i, ++idx) {
      const x = offsetX + pad + (i * (s + pad)) + nLeft * (s + pad);
      const y = offsetY + pad;
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, s, s);
    }
    // Bottom row (left to right)
    for (let i = 0; i < nBottom; ++i, ++idx) {
      const x = offsetX + pad + (i * (s + pad)) + nLeft * (s + pad);
      const y = offsetY + pad + nTop * (s + pad) + mainSize + pad;
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, s, s);
    }
    // Left col (top to bottom)
    for (let i = 0; i < nLeft; ++i, ++idx) {
      const x = offsetX + pad;
      const y = offsetY + pad + (i * (s + pad)) + nTop * (s + pad);
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, s, s);
    }
    // Right col (top to bottom)
    for (let i = 0; i < nRight; ++i, ++idx) {
      const x = offsetX + pad + nLeft * (s + pad) + mainSize + pad;
      const y = offsetY + pad + (i * (s + pad)) + nTop * (s + pad);
      if (sideImgs[idx]) drawImgSmartCrop(ctx, sideImgs[idx], x, y, s, s);
    }

    // Draw main photo centered in the calculated rectangle
    const mainX = offsetX + pad + nLeft * (s + pad);
    const mainY = offsetY + pad + nTop * (s + pad);

    drawImgSmartCrop(ctx, mainImg, mainX, mainY, mainSize, mainSize);
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
