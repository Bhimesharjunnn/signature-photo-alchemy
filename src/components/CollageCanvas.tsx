
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
  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Set white background for the A4 page
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (images.length === 0) return;
  
  const mainIndex = images.findIndex((img) => img.id === mainPhotoId);
  if (mainIndex === -1) return; // No main image selected

  const mainImg = images[mainIndex];
  const sideImgs = images.filter((img) => img.id !== mainPhotoId);

  if (pattern === "grid") {
    // Show warning if too many photos (more than 50)
    if (images.length > 50) {
      toast.warning("Large number of photos may affect visual clarity", {
        id: "too-many-photos-warning",
        duration: 5000,
      });
    }
    
    // Margin between images
    const margin = 5;
    
    // Main photo size (50-60% of canvas width)
    const mainPhotoWidth = Math.round(CANVAS_WIDTH * 0.55);
    const mainPhotoHeight = Math.round(CANVAS_HEIGHT * 0.55);
    
    // Position main photo in center
    const mainX = (CANVAS_WIDTH - mainPhotoWidth) / 2;
    const mainY = (CANVAS_HEIGHT - mainPhotoHeight) / 2;
    
    // Draw main image
    drawImgFit(ctx, mainImg, mainX, mainY, mainPhotoWidth, mainPhotoHeight);
    
    if (sideImgs.length === 0) return;
    
    // Calculate available space for side images
    const leftColWidth = mainX - margin;
    const rightColWidth = leftColWidth;
    const topRowHeight = mainY - margin;
    const bottomRowHeight = topRowHeight;
    
    // Optimize layout distribution
    let topCount = 0;
    let rightCount = 0;
    let bottomCount = 0;
    let leftCount = 0;
    
    // Calculate optimal distribution based on A4 aspect ratio and image count
    const remainingCount = sideImgs.length;
    
    // Calculate number of rows and columns needed based on aspect ratio
    // For A4 paper (210x297mm), height/width ratio is ~1.414
    const widthRatio = CANVAS_WIDTH / (CANVAS_WIDTH + CANVAS_HEIGHT);
    const heightRatio = CANVAS_HEIGHT / (CANVAS_WIDTH + CANVAS_HEIGHT);
    
    // Distribute images proportionally based on available space around the main image
    const totalPerimeter = 2 * (CANVAS_WIDTH + CANVAS_HEIGHT - mainPhotoWidth - mainPhotoHeight);
    const topPerimeter = CANVAS_WIDTH;
    const rightPerimeter = CANVAS_HEIGHT;
    const bottomPerimeter = CANVAS_WIDTH;
    const leftPerimeter = CANVAS_HEIGHT;
    
    if (remainingCount <= 4) {
      // With 4 or fewer images, put one on each side
      topCount = rightCount = bottomCount = leftCount = 1;
    } else {
      // Proportionally distribute based on perimeter space
      topCount = Math.max(1, Math.round(remainingCount * (topPerimeter / totalPerimeter)));
      rightCount = Math.max(1, Math.round(remainingCount * (rightPerimeter / totalPerimeter)));
      bottomCount = Math.max(1, Math.round(remainingCount * (bottomPerimeter / totalPerimeter)));
      leftCount = Math.max(1, Math.round(remainingCount * (leftPerimeter / totalPerimeter)));
      
      // Adjust to match total count
      let allocatedCount = topCount + rightCount + bottomCount + leftCount;
      
      // Redistribute any difference
      while (allocatedCount !== remainingCount) {
        if (allocatedCount < remainingCount) {
          // Need to add more
          if (topCount / topPerimeter < rightCount / rightPerimeter &&
              topCount / topPerimeter < bottomCount / bottomPerimeter &&
              topCount / topPerimeter < leftCount / leftPerimeter) {
            topCount++;
          } else if (rightCount / rightPerimeter < topCount / topPerimeter &&
                     rightCount / rightPerimeter < bottomCount / bottomPerimeter &&
                     rightCount / rightPerimeter < leftCount / leftPerimeter) {
            rightCount++;
          } else if (bottomCount / bottomPerimeter < topCount / topPerimeter &&
                     bottomCount / bottomPerimeter < rightCount / rightPerimeter &&
                     bottomCount / bottomPerimeter < leftCount / leftPerimeter) {
            bottomCount++;
          } else {
            leftCount++;
          }
        } else {
          // Need to remove some
          if (topCount / topPerimeter > rightCount / rightPerimeter &&
              topCount / topPerimeter > bottomCount / bottomPerimeter &&
              topCount / topPerimeter > leftCount / leftPerimeter) {
            topCount--;
          } else if (rightCount / rightPerimeter > topCount / topPerimeter &&
                     rightCount / rightPerimeter > bottomCount / bottomPerimeter &&
                     rightCount / rightPerimeter > leftCount / leftPerimeter) {
            rightCount--;
          } else if (bottomCount / bottomPerimeter > topCount / topPerimeter &&
                     bottomCount / bottomPerimeter > rightCount / rightPerimeter &&
                     bottomCount / bottomPerimeter > leftCount / leftPerimeter) {
            bottomCount--;
          } else {
            leftCount--;
          }
        }
        allocatedCount = topCount + rightCount + bottomCount + leftCount;
      }
    }
    
    // Ensure we don't try to access images that don't exist
    topCount = Math.min(topCount, remainingCount);
    const rightStartIdx = topCount;
    rightCount = Math.min(rightCount, remainingCount - rightStartIdx);
    const bottomStartIdx = rightStartIdx + rightCount;
    bottomCount = Math.min(bottomCount, remainingCount - bottomStartIdx);
    const leftStartIdx = bottomStartIdx + bottomCount;
    leftCount = Math.min(leftCount, remainingCount - leftStartIdx);
    
    // Extract images for each side
    const topImages = sideImgs.slice(0, topCount);
    const rightImages = sideImgs.slice(rightStartIdx, rightStartIdx + rightCount);
    const bottomImages = sideImgs.slice(bottomStartIdx, bottomStartIdx + bottomCount);
    const leftImages = sideImgs.slice(leftStartIdx, leftStartIdx + leftCount);
    
    // Draw top row
    if (topImages.length > 0) {
      const itemWidth = (CANVAS_WIDTH) / topImages.length;
      const itemHeight = topRowHeight;
      topImages.forEach((img, i) => {
        const x = i * itemWidth;
        drawImgFit(ctx, img, x, 0, itemWidth - margin, itemHeight - margin);
      });
    }
    
    // Draw right column
    if (rightImages.length > 0) {
      const itemWidth = rightColWidth;
      const itemHeight = (CANVAS_HEIGHT) / rightImages.length;
      rightImages.forEach((img, i) => {
        const y = i * itemHeight;
        drawImgFit(ctx, img, CANVAS_WIDTH - itemWidth, y, itemWidth - margin, itemHeight - margin);
      });
    }
    
    // Draw bottom row
    if (bottomImages.length > 0) {
      const itemWidth = (CANVAS_WIDTH) / bottomImages.length;
      const itemHeight = bottomRowHeight;
      bottomImages.forEach((img, i) => {
        const x = i * itemWidth;
        const y = CANVAS_HEIGHT - itemHeight;
        drawImgFit(ctx, img, x, y, itemWidth - margin, itemHeight - margin);
      });
    }
    
    // Draw left column
    if (leftImages.length > 0) {
      const itemWidth = leftColWidth;
      const itemHeight = (CANVAS_HEIGHT) / leftImages.length;
      leftImages.forEach((img, i) => {
        const y = i * itemHeight;
        drawImgFit(ctx, img, 0, y, itemWidth - margin, itemHeight - margin);
      });
    }
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
