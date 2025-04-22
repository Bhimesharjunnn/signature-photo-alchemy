
/**
 * CalculatePositions: Computes size and placement for main + side images in a tight border grid.
 * Ensures:
 *  - Main photo centered and ~50% canvas width
 *  - Side photos are equal sized, form a 'frame' around main photo
 *  - Minimal white space
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
  // At least 2 images (1 main + at least one side)
  const numSide = imagesCount - 1;
  if (imagesCount < 1) return { main: { x: 0, y: 0, w: 0, h: 0 }, side: [] };

  // Main width is fixed at 50% of canvas width (user requirement)
  const mainW = Math.round(0.5 * canvasWidth);
  const mainH = mainW; // Square

  // Find max nTop, nBtm, nL, nR (row/column count)
  // Heuristic: Try to create as balanced frame as possible
  // Calculate perimeter available for side photos:
  //   Sides: top, right, bottom, left (forming a closed tight frame, corners "double up" if needed, distribute evenly)
  const sidePhotoCounts = tryDistributeSidePhotos(numSide);

  // Now compute maximal possible side-photo size s such that all fit.
  // s determined by space along each side, accounting for padding

  // The area available for the full collage (main+side+all padding)
  // Main sits in the middle, surrounded by top/bottom/left/right
  // Total frame region (including padding):
  //    sideW = nL * (s+pad), topW = nT * (s+pad)
  // regionW = mainW + (sideW_L+sideW_R) + 2*padding (on outer sides)
  // Try scaling 's' to fit exactly inside canvas

  const [nTop, nBtm, nL, nR] = sidePhotoCounts;

  // Number of side photos:
  const nHorz = Math.max(nTop, nBtm);
  const nVert = Math.max(nL, nR);

  // Let side photo size = s; total width used: nL*(s+pad) + mainW + nR*(s+pad) + 2*padding
  // total height used: nT*(s+pad) + mainH + nBtm*(s+pad) + 2*padding
  // Our goal: maximize s s.t. everything fits
  const sW = nL + nR > 0 ? Math.floor((canvasWidth - mainW - (nL + nR + 2) * padding) / (nL + nR)) : 0;
  const sH = nTop + nBtm > 0 ? Math.floor((canvasHeight - mainH - (nTop + nBtm + 2) * padding) / (nTop + nBtm)) : 0;
  const s = Math.max(1, Math.min(sW, sH));

  // Compute offsets for centering:
  const usedW = mainW + (nL + nR) * s + (nL + nR + 2) * padding;
  const usedH = mainH + (nTop + nBtm) * s + (nTop + nBtm + 2) * padding;
  const offsetX = Math.round((canvasWidth - usedW) / 2);
  const offsetY = Math.round((canvasHeight - usedH) / 2);

  // Layout result
  const out: GridLayoutResult = {
    main: {
      x: offsetX + padding + nL * (s + padding),
      y: offsetY + padding + nTop * (s + padding),
      w: mainW,
      h: mainH,
    },
    side: [],
  };

  let idx = 0;
  // Top row: left to right
  for (let i = 0; i < nTop; ++i, ++idx) {
    out.side.push({
      x: offsetX + padding + nL * (s + padding) + i * (s + padding),
      y: offsetY + padding,
      w: s,
      h: s,
    });
  }
  // Bottom row
  for (let i = 0; i < nBtm; ++i, ++idx) {
    out.side.push({
      x: offsetX + padding + nL * (s + padding) + i * (s + padding),
      y: offsetY + padding + nTop * (s + padding) + mainH + padding,
      w: s,
      h: s,
    });
  }
  // Left column
  for (let i = 0; i < nL; ++i, ++idx) {
    out.side.push({
      x: offsetX + padding,
      y: offsetY + padding + nTop * (s + padding) + i * (s + padding),
      w: s,
      h: s,
    });
  }
  // Right column
  for (let i = 0; i < nR; ++i, ++idx) {
    out.side.push({
      x: offsetX + padding + nL * (s + padding) + mainW + padding,
      y: offsetY + padding + nTop * (s + padding) + i * (s + padding),
      w: s,
      h: s,
    });
  }

  return out;
}

/** Distribute the side images to top/bottom/left/right evenly, return [nTop, nBottom, nLeft, nRight] */
function tryDistributeSidePhotos(n: number): [number, number, number, number] {
  // Try to be as square/symmetric as possible
  // Split into 4 sides
  const base = Math.floor(n / 4);
  let top = base, btm = base, l = base, r = base;
  let remain = n - (top + btm + l + r);
  // Add remainder in order: top, bottom, left, right
  while (remain > 0) {
    if (remain > 0) { top++; remain--; }
    if (remain > 0) { btm++; remain--; }
    if (remain > 0) { l++; remain--; }
    if (remain > 0) { r++; remain--; }
  }
  return [top, btm, l, r];
}
