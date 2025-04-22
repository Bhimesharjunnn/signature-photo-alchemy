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

  // ------- NEW TIGHT-FRAME GRID PATTERN -------
  if (pattern === "grid") {

    // Warning when too many images
    if (images.length > 50) {
      toast.warning("Large number of photos may affect visual clarity", {
        id: "too-many-photos-warning",
        duration: 6000,
      });
    }

    // The challenge is: 1 main photo in the center, side photos in a tight, symmetric frame (top, right, bottom, left), with all side photos perfectly equal size (squares), pad=5 everywhere, max-fill.
    // Algorithm:
    // 1. Decide how many photos on each side (top, bottom, left, right), making all arrangements as tight as possible.
    // 2. Compute optimal side-photo square size (must fit all, allow 5px padding between and around, plus fit the main photo with 4 sides all padded).
    // 3. Center the composite frame neatly within the canvas.

    // --- Step 1: Grid balancing ---
    // To create a proportional photo frame:
    // - Aim for equal N_top, N_bottom (spread remainder to top/bottom FIRST), then N_left, N_right.
    // - Work with the smallest number allowed by aspect ratio of canvas & target side counts

    // Let's optimize using best-fit row/col search:

    let best = null;
    let pad = PADDING;
    let minMargin = 0.01; // Tolerance

    // Try all possible top/bottom/left/right splits that use all photos
    // We'll try k rows top, k rows bottom, k cols left/right, for k from 1 up to reasonable max
    // Max possible for top/bottom/left/right is sideImgs.length (if all go to one edge), but typically they are split

    // We only need to search up to the square root of totalSide for best symmetry
    const maxRows = Math.ceil(Math.sqrt(totalSide));
    for (let nTop = 1; nTop <= Math.ceil(totalSide / 2); nTop++) {
      for (let nBottom = 1; nBottom <= Math.ceil(totalSide / 2); nBottom++) {
        // Remaining for sides
        let remaining = totalSide - nTop - nBottom;
        if (remaining < 0) continue;

        // Divide remaining equally (favor left if odd)
        let nLeft = Math.ceil(remaining / 2);
        let nRight = remaining - nLeft;

        // Now, compute how much space does this require
        // We'll use s = side photo width/height (square)

        // Main photo dimension: try fractions from 50% to 60% of width
        for (let mainFrac = 0.5; mainFrac <= 0.6; mainFrac += 0.01) {
          // Try to maximize s (side image size)
          // Setup: arrange top/bottom nTop/nBottom, left/right nLeft/nRight

          // The main photo is surrounded on all sides by padding + side photo stripes
          // Main photo size = (W - total horiz padding - side photo stripes) in width,
          // and = (H - total vert padding - side photo stripes) in height

          // Let s = side photo size, m = main photo size
          // Compute all based on s:

          // Along width:
          //   totalW = pad + nLeft * s + pad + mW + pad + nRight * s + pad
          // Along height:
          //   totalH = pad + nTop * s + pad + mH + pad + nBottom * s + pad

          // For now, try mW=mH (main photo nearly square)
          // We'll solve for s that fills the canvas as tight as possible, but not overflowing.

          // Express mW and mH as variables:
          // Main width:
          let nSidesW = nLeft + nRight;
          let nSidesH = nTop + nBottom;

          // The available space for side photos + main in width
          // total number of paddings: left pad, left-between pad, right-between pad, right pad, main left-pad, main right-pad => pad * (nLeft + nRight + 3)
          // But: each photo = pad.photo.pad
          // So: pad + nLeft * s + pad + m + pad + nRight * s + pad = W
          // Simplifies to: (nLeft+nRight)*s + m + 4*pad = W

          // Let m = mainFrac * CANVAS_WIDTH, s = (CANVAS_WIDTH - m - 4*pad)/(nLeft + nRight)
          let m = mainFrac * CANVAS_WIDTH;
          let maxS_W = nSidesW > 0 ? Math.floor((CANVAS_WIDTH - m - 4 * pad) / nSidesW) : (CANVAS_WIDTH - 2 * pad);

          let maxS_H = nSidesH > 0 ? Math.floor((CANVAS_HEIGHT - m - 4 * pad) / nSidesH) : (CANVAS_HEIGHT - 2 * pad);

          // The side photo size must fit both horizontally and vertically
          let s = Math.min(maxS_W, maxS_H);

          if (s < 40) continue; // Avoid too-tiny side photos

          // Now recompute the actual m for this s
          let mW = CANVAS_WIDTH - (nSidesW * s) - 4 * pad;
          let mH = CANVAS_HEIGHT - (nSidesH * s) - 4 * pad;
          let mSide = Math.min(mW, mH); // Always keep main as square as possible

          // Determine margins (how well do we fill the canvas)
          let usedW = (nSidesW * s) + mSide + 4 * pad;
          let usedH = (nSidesH * s) + mSide + 4 * pad;
          let marW = CANVAS_WIDTH - usedW;
          let marH = CANVAS_HEIGHT - usedH;

          // Pick arrangement that minimizes (marW^2 + marH^2) and keeps all fill
          let empty = Math.abs(marW) + Math.abs(marH);
          if (
            !best ||
            (empty < best.empty - minMargin) ||
            (
              Math.abs(empty - best.empty) < minMargin &&
              s > best.s
            )
          ) {
            best = {
              nTop, nBottom, nLeft, nRight,
              s, mSide,
              marW, marH,
              mainFrac,
              empty,
              mW: mSide, mH: mSide
            };
          }
        }
      }
    }

    if (!best) {
      // Fallback: just draw centered main photo
      drawImgSmartCrop(
        ctx,
        mainImg,
        (CANVAS_WIDTH - CANVAS_WIDTH * 0.5) / 2,
        (CANVAS_HEIGHT - CANVAS_WIDTH * 0.5) / 2,
        CANVAS_WIDTH * 0.5,
        CANVAS_WIDTH * 0.5
      );
      return;
    }

    // Now, lay out images using the best layout
    const { nTop, nBottom, nLeft, nRight, s, mSide, marW, marH } = best;
    let sideIndex = 0;
    const topImgs = sideImgs.slice(sideIndex, sideIndex + nTop); sideIndex += nTop;
    const bottomImgs = sideImgs.slice(sideIndex, sideIndex + nBottom); sideIndex += nBottom;
    const leftImgs = sideImgs.slice(sideIndex, sideIndex + nLeft); sideIndex += nLeft;
    const rightImgs = sideImgs.slice(sideIndex, sideIndex + nRight);

    // Main frame: horizontal start
    // We'll center main + side strips using marW and marH as "outer" margins
    // Main photo position:
    let mainX = Math.round((CANVAS_WIDTH - mSide) / 2);
    let mainY = Math.round((CANVAS_HEIGHT - mSide) / 2);

    // Draw TOP row
    if (topImgs.length > 0) {
      // Each photo is s x s, aligned horizontally
      const totalW = s * topImgs.length + pad * (topImgs.length - 1);
      const startX = mainX; // frame aligns with main image left edge
      const xPad = mainX - (s * leftImgs.length + pad * Math.max(leftImgs.length - 1, 0)) - 2 * pad;
      const y = mainY - s - pad;
      let x = mainX;
      for (let k = 0; k < topImgs.length; ++k) {
        drawImgSmartCrop(ctx, topImgs[k], x, y, s, s);
        x += s + pad;
      }
    }

    // Draw BOTTOM row
    if (bottomImgs.length > 0) {
      const totalW = s * bottomImgs.length + pad * (bottomImgs.length - 1);
      const startX = mainX;
      const y = mainY + mSide + pad;
      let x = mainX;
      for (let k = 0; k < bottomImgs.length; ++k) {
        drawImgSmartCrop(ctx, bottomImgs[k], x, y, s, s);
        x += s + pad;
      }
    }

    // Draw LEFT column
    if (leftImgs.length > 0) {
      const totalH = s * leftImgs.length + pad * (leftImgs.length - 1);
      const x = mainX - s - pad;
      let y = mainY;
      for (let k = 0; k < leftImgs.length; ++k) {
        drawImgSmartCrop(ctx, leftImgs[k], x, y, s, s);
        y += s + pad;
      }
    }

    // Draw RIGHT column
    if (rightImgs.length > 0) {
      const totalH = s * rightImgs.length + pad * (rightImgs.length - 1);
      const x = mainX + mSide + pad;
      let y = mainY;
      for (let k = 0; k < rightImgs.length; ++k) {
        drawImgSmartCrop(ctx, rightImgs[k], x, y, s, s);
        y += s + pad;
      }
    }

    // Draw main image (centered)
    drawImgSmartCrop(
      ctx,
      mainImg,
      mainX,
      mainY,
      mSide,
      mSide
    );
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
