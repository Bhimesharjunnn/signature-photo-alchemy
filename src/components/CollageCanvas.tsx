import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

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

const CANVAS_SIZE = 480;

function drawImagesToCanvas(
  ctx: CanvasRenderingContext2D,
  images: { id: string; url: string; name: string }[],
  mainPhotoId: string | null,
  pattern: Pattern
) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const mainIndex = images.findIndex((img) => img.id === mainPhotoId);
  if (mainIndex === -1) return; // No image

  const mainImg = images[mainIndex];
  const sideImgs = images.filter((img) => img.id !== mainPhotoId);

  const center = CANVAS_SIZE / 2;

  if (pattern === "grid") {
    // Main photo in center, grid of side imgs around (max 3x3)
    const grid = Math.ceil(Math.sqrt(images.length));
    const cell = CANVAS_SIZE / grid;

    // Draw all side images first
    let count = 0;
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        if (count >= images.length) break;
        const img = images[count];
        // Draw main in center after
        if (img.id === mainPhotoId) {
          count++;
          continue;
        }
        drawImgFit(ctx, img, x * cell, y * cell, cell, cell);
        count++;
      }
    }
    // Draw main image larger and centered over the grid
    drawImgFit(
      ctx,
      mainImg,
      center - cell * 0.8,
      center - cell * 0.8,
      cell * 1.6,
      cell * 1.6
    );
  } else if (pattern === "hexagon") {
    // Center main, hexagonal ring for others
    // Draw main image at center
    drawImgFit(
      ctx,
      mainImg,
      center - CANVAS_SIZE / 5,
      center - CANVAS_SIZE / 5,
      (CANVAS_SIZE / 5) * 2,
      (CANVAS_SIZE / 5) * 2
    );
    // Distribute side images in a hex ring
    const r = CANVAS_SIZE * 0.35;
    sideImgs.forEach((img, i) => {
      const angle = ((2 * Math.PI) / sideImgs.length) * i - Math.PI / 2;
      const x = center + r * Math.cos(angle) - 50;
      const y = center + r * Math.sin(angle) - 50;
      drawImgFit(ctx, img, x, y, 100, 100);
    });
  } else if (pattern === "circular") {
    // Center main, others arranged in a circle
    drawImgFit(
      ctx,
      mainImg,
      center - CANVAS_SIZE / 5,
      center - CANVAS_SIZE / 5,
      (CANVAS_SIZE / 5) * 2,
      (CANVAS_SIZE / 5) * 2
    );
    const r = CANVAS_SIZE * 0.37;
    sideImgs.forEach((img, i) => {
      const angle = ((2 * Math.PI) / sideImgs.length) * i - Math.PI / 2;
      const x = center + r * Math.cos(angle) - 50;
      const y = center + r * Math.sin(angle) - 50;
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

    useEffect(() => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx || !images.length || !mainPhotoId) {
        ctx?.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        return;
      }
      drawImagesToCanvas(ctx, images, mainPhotoId, pattern);
    }, [images, mainPhotoId, pattern, locked]);

    useImperativeHandle(ref, () => ({
      downloadCanvas: async (format: "png" | "pdf", dpi = 300) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const tempCanvas = document.createElement("canvas");
        const scale = dpi / 96;
        tempCanvas.width = CANVAS_SIZE * scale;
        tempCanvas.height = CANVAS_SIZE * scale;
        
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return;
        
        tempCtx.scale(scale, scale);
        
        tempCtx.fillStyle = "white";
        tempCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
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
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const aspectRatio = tempCanvas.width / tempCanvas.height;
            
            let imgWidth = pdfWidth - 20;
            let imgHeight = imgWidth / aspectRatio;
            
            if (imgHeight > pdfHeight - 20) {
              imgHeight = pdfHeight - 20;
              imgWidth = imgHeight * aspectRatio;
            }
            
            pdf.addImage(
              imgData, 
              "PNG", 
              (pdfWidth - imgWidth) / 2, 
              (pdfHeight - imgHeight) / 2, 
              imgWidth, 
              imgHeight
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
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="border rounded shadow-lg bg-white"
          style={{ maxWidth: "100%", height: "auto" }}
        />
      </div>
    );
  }
);

CollageCanvas.displayName = "CollageCanvas";

export default CollageCanvas;
