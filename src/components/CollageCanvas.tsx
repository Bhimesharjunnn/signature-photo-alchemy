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

  if (pattern === "grid") {
    // Show warning if too many photos
    if (images.length > 50) {
      toast.warning("Large number of photos may affect visual clarity", {
        id: "too-many-photos-warning",
        duration: 5000,
      });
    }

    // === DYNAMIC GRID LAYOUT LOGIC ===
    const PADDING = 5; // px between photos

    // Center/main photo size ratio (bounded for small image counts)
    const mainW = Math.round(CANVAS_WIDTH * 0.58);
    const mainH = Math.round(CANVAS_HEIGHT * 0.58);

    // Available space for side strips
    const sideW = CANVAS_WIDTH - mainW - PADDING * 4;
    const sideH = CANVAS_HEIGHT - mainH - PADDING * 4;

    // If only main: just center
    if (sideImgs.length === 0) {
      drawImgFit(
        ctx, mainImg,
        (CANVAS_WIDTH - mainW) / 2,
        (CANVAS_HEIGHT - mainH) / 2,
        mainW, mainH
      );
      return;
    }

    // ---- Determine how many images per edge ----
    const nSides = sideImgs.length;
    // Do "balanced" splits (top/bottom get more in case of remainder)
    // Start: divide nSides by 4
    let perEdge = Math.floor(nSides / 4);
    let remainder = nSides % 4;
    let topN = perEdge, bottomN = perEdge, leftN = perEdge, rightN = perEdge;
    if (remainder > 0) { topN++; remainder--; }
    if (remainder > 0) { bottomN++; remainder--; }
    if (remainder > 0) { leftN++; remainder--; }
    if (remainder > 0) { rightN++; }

    // For small counts: place more on top/bottom, never leave empty sides unless only 1-2 images
    if (nSides < 4) {
      if (nSides === 1) { topN = 1; bottomN = leftN = rightN = 0; }
      else if (nSides === 2) { topN = 1; bottomN = 1; leftN = rightN = 0; }
      else if (nSides === 3) { topN = 1; bottomN = 1; leftN = 1; rightN = 0; }
    }

    // Assign images
    let i = 0;
    const topImgs = sideImgs.slice(i, i + topN); i += topN;
    const bottomImgs = sideImgs.slice(i, i + bottomN); i += bottomN;
    const leftImgs = sideImgs.slice(i, i + leftN); i += leftN;
    const rightImgs = sideImgs.slice(i, i + rightN); i += rightN;

    // --- Calculate cell sizes ---
    // The available margin around the main image (all 4 sides)
    const leftPadX = PADDING;
    const topPadY = PADDING;

    // Positions for the main image
    const mainX = leftPadX + (sideW / 2) + PADDING;
    const mainY = topPadY + (sideH / 2) + PADDING;

    // --- Side regions (above, below, left, right of main) ---
    // TOP
    if (topImgs.length > 0) {
      const imgW = (mainW + sideW) / topImgs.length - PADDING;
      const imgH = sideH / 2 - PADDING;
      const y = PADDING;
      for (let k = 0; k < topImgs.length; k++) {
        const x = leftPadX + k * (imgW + PADDING);
        drawImgFit(ctx, topImgs[k], x, y, imgW, imgH);
      }
    }

    // BOTTOM
    if (bottomImgs.length > 0) {
      const imgW = (mainW + sideW) / bottomImgs.length - PADDING;
      const imgH = sideH / 2 - PADDING;
      const y = CANVAS_HEIGHT - imgH - PADDING;
      for (let k = 0; k < bottomImgs.length; k++) {
        const x = leftPadX + k * (imgW + PADDING);
        drawImgFit(ctx, bottomImgs[k], x, y, imgW, imgH);
      }
    }

    // LEFT
    if (leftImgs.length > 0) {
      const imgW = sideW / 2 - PADDING;
      const imgH = mainH / leftImgs.length - PADDING;
      const x = PADDING;
      for (let k = 0; k < leftImgs.length; k++) {
        const y = topPadY + (sideH / 2) + k * (imgH + PADDING) + PADDING;
        drawImgFit(ctx, leftImgs[k], x, y, imgW, imgH);
      }
    }

    // RIGHT
    if (rightImgs.length > 0) {
      const imgW = sideW / 2 - PADDING;
      const imgH = mainH / rightImgs.length - PADDING;
      const x = CANVAS_WIDTH - imgW - PADDING;
      for (let k = 0; k < rightImgs.length; k++) {
        const y = topPadY + (sideH / 2) + k * (imgH + PADDING) + PADDING;
        drawImgFit(ctx, rightImgs[k], x, y, imgW, imgH);
      }
    }

    // DRAW main
    drawImgFit(
      ctx,
      mainImg,
      mainX,
      mainY,
      mainW,
      mainH
    );
  } else if (pattern === "hexagon") {
    // Center main, hexagonal ring for others
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
          
          // Wait for images to load
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (format === "png") {
            const pngUrl = tempCanvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `collage-${pattern}-${new Date().getTime()}.png`;
            link.href = pngUrl;
            link.click();
          } else if (format === "pdf") {
            const { jsPDF } = await import("jspdf");
            // Create a PDF with A4 dimensions
            const pdf = new jsPDF({
              orientation: "portrait",
              unit: "mm",
              format: "a4"
            });
            
            const imgData = tempCanvas.toDataURL("image/png");
            
            // Add image at exact A4 dimensions without resizing
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
