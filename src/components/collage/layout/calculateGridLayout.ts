
/**
 * CalculatePositions: Computes size and placement for main + side images filling the A4 canvas tightly,
 * with consistent 5px padding between every photo and the canvas edge.
 * Follows:
 *   - Main photo is square, centered, exactly 60% of canvas width
 *   - Side photos are arranged around the main photo (top, bottom, left, right)
 *   - All side photos are equal size (square)
 *   - Minimal outside margin (tight layout); all images at least 5px from edge/main
 *   - The whole collage block (main + side photos) fills at least 90% of canvas area, centered
 */

export interface GridLayoutResult {
  main: { x: number; y: number; w: number; h: number };
  side: Array<{ x: number; y: number; w: number; h: number }>;
}

export function calculateGridLayout({
  canvasWidth,
  canvasHeight,
  padding,
  imagesCount,
  mainPhotoIndex,
}: {
  canvasWidth: number;
  canvasHeight: number;
  padding: number;
  imagesCount: number;
  mainPhotoIndex: number;
}): GridLayoutResult {
  // At least 1 image required
  if (imagesCount < 1) 
    return { main: { x: 0, y: 0, w: 0, h: 0 }, side: [] };

  // Only one image: fill as large centered square
  if (imagesCount === 1) {
    const w = canvasWidth - 2 * padding;
    const h = canvasHeight - 2 * padding;
    const size = Math.min(w, h);
    const x = Math.round((canvasWidth - size) / 2);
    const y = Math.round((canvasHeight - size) / 2);
    return { main: { x, y, w: size, h: size }, side: [] };
  }

  // --- Force main photo square, 60% of canvas width ---
  const mainW = Math.round(canvasWidth * 0.6);
  const mainH = mainW;
  // Initially position main photo center in canvas
  let mainX = Math.round((canvasWidth - mainW) / 2);
  let mainY = Math.round((canvasHeight - mainH) / 2);

  // Number of side images to distribute (evenly) to 4 sides
  const numSide = imagesCount - 1;

  // Distribute as evenly as possible: top, bottom, left, right
  const basePerSide = Math.floor(numSide / 4);
  const extras = numSide % 4; // Up to 3 extra to distribute
  let nTop = basePerSide + (extras >= 1 ? 1 : 0);
  let nBottom = basePerSide + (extras >= 2 ? 1 : 0);
  let nLeft = basePerSide;
  let nRight = basePerSide;

  // Side photo count as array for easier iteration
  const nBySide = [nTop, nBottom, nLeft, nRight]; // top, bottom, left, right

  // --- Calculate max possible side photo size ---
  // Need to tightly frame the main photo, with all sides' rows or columns of side photos

  // Function to find optimal side size (binary search for tightest that fits requirements)
  function computeSideSize() {
    // The whole block must fit within canvas with 5px padding between all
    // Let s = side photo size
    let low = 1, high = Math.min(canvasWidth, canvasHeight);
    let best = 1;
    while (low <= high) {
      let s = Math.floor((low + high) / 2);

      // Compute block W/H required for this s
      // Block width: mainW + left col + right col + all paddings (left-to-main + main-to-right + ends)
      const totalSideCols = nLeft + nRight;
      const totalSideRows = nTop + nBottom;

      // Between leftside and main: padding
      // At left edge: padding
      // Between side photos on each row/col: padding
      // Final +rightmost/main-to-right: padding

      const blockW = (nLeft > 0 ? nLeft * s + nLeft * padding : 0)
        + mainW
        + (nRight > 0 ? nRight * s + nRight * padding : 0)
        + 2 * padding;

      const blockH = (nTop > 0 ? nTop * s + nTop * padding : 0)
        + mainH
        + (nBottom > 0 ? nBottom * s + nBottom * padding : 0)
        + 2 * padding;

      // Check tightness
      if (blockW > canvasWidth || blockH > canvasHeight) {
        // Doesn't fit, make smaller
        high = s - 1;
      } else {
        // Test if 90% area is covered
        const areaFill = (blockW * blockH) / (canvasWidth * canvasHeight);
        if (areaFill >= 0.90) {
          best = s;
          low = s + 1; // Try larger
        } else {
          // Too small, try bigger
          low = s + 1;
        }
      }
    }
    return best;
  }

  const sideSize = computeSideSize();

  // --- Now compute actual block size for found sideSize ---
  const sidePadW = (nLeft > 0 ? nLeft * padding : 0) + (nRight > 0 ? nRight * padding : 0);
  const sidePadH = (nTop > 0 ? nTop * padding : 0) + (nBottom > 0 ? nBottom * padding : 0);

  const blockW =
    (nLeft > 0 ? nLeft * sideSize : 0) +
    (nRight > 0 ? nRight * sideSize : 0) +
    sidePadW +
    mainW +
    2 * padding;

  const blockH =
    (nTop > 0 ? nTop * sideSize : 0) +
    (nBottom > 0 ? nBottom * sideSize : 0) +
    sidePadH +
    mainH +
    2 * padding;

  // Recenter collage block
  let offsetX = Math.round((canvasWidth - blockW) / 2);
  let offsetY = Math.round((canvasHeight - blockH) / 2);

  // Calculate side photo positions
  const side: Array<{ x: number; y: number; w: number; h: number }> = [];
  let photoIdx = 0;

  // Top row (left to right)
  for (let i = 0; i < nTop; ++i, ++photoIdx) {
    const x =
      offsetX +
      (nLeft > 0 ? nLeft * sideSize + nLeft * padding : 0) +
      padding +
      i * (sideSize + padding);
    const y = offsetY + padding;
    side.push({ x, y, w: sideSize, h: sideSize });
  }
  // Bottom row (left to right)
  for (let i = 0; i < nBottom; ++i, ++photoIdx) {
    const x =
      offsetX +
      (nLeft > 0 ? nLeft * sideSize + nLeft * padding : 0) +
      padding +
      i * (sideSize + padding);
    const y =
      offsetY +
      (nTop > 0 ? nTop * sideSize + nTop * padding : 0) +
      mainH +
      padding +
      (nBottom === 0 ? 0 : padding) +
      (nTop === 0 ? 0 : 0);
    side.push({ x, y, w: sideSize, h: sideSize });
  }
  // Left column (top to bottom)
  for (let i = 0; i < nLeft; ++i, ++photoIdx) {
    const x = offsetX + padding;
    const y =
      offsetY +
      (nTop > 0 ? nTop * sideSize + nTop * padding : 0) +
      padding +
      i * (sideSize + padding);
    side.push({ x, y, w: sideSize, h: sideSize });
  }
  // Right column (top to bottom)
  for (let i = 0; i < nRight; ++i, ++photoIdx) {
    const x =
      offsetX +
      (nLeft > 0 ? nLeft * sideSize + nLeft * padding : 0) +
      mainW +
      padding +
      (nRight === 0 ? 0 : padding);
    const y =
      offsetY +
      (nTop > 0 ? nTop * sideSize + nTop * padding : 0) +
      padding +
      i * (sideSize + padding);
    side.push({ x, y, w: sideSize, h: sideSize });
  }

  // Final main photo placement, recenter main inside block
  mainX =
    offsetX +
    (nLeft > 0 ? nLeft * sideSize + nLeft * padding : 0) +
    padding;
  mainY =
    offsetY +
    (nTop > 0 ? nTop * sideSize + nTop * padding : 0) +
    padding;

  return {
    main: { x: Math.round(mainX), y: Math.round(mainY), w: mainW, h: mainH },
    side: side.map((p) => ({
      x: Math.round(p.x),
      y: Math.round(p.y),
      w: Math.round(p.w),
      h: Math.round(p.h)
    })),
  };
}

