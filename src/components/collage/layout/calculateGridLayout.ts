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
  // Main height should keep within canvas
  // Let's fit main photo as a square, but fully center it inside canvas
  const mainH = mainW; // Square

  // Center main photo in canvas
  const mainX = Math.round((canvasWidth - mainW) / 2);
  const mainY = Math.round((canvasHeight - mainH) / 2);

  // Layout result only sets main for now
  // Side arrangement will be handled after next user step
  const out: GridLayoutResult = {
    main: {
      x: mainX,
      y: mainY,
      w: mainW,
      h: mainH,
    },
    side: [],
  };

  // Side calculation: for now, keep the legacy calls for compatibility.
  // We'll refactor side calculation in your next request.
  const sidePhotoCounts = tryDistributeSidePhotos(numSide);
  const [nTop, nBtm, nL, nR] = sidePhotoCounts;
  const nHorz = Math.max(nTop, nBtm), nVert = Math.max(nL, nR);
  const sW = nL + nR > 0 ? Math.floor((canvasWidth - mainW - (nL + nR + 2) * padding) / (nL + nR)) : 0;
  const sH = nTop + nBtm > 0 ? Math.floor((canvasHeight - mainH - (nTop + nBtm + 2) * padding) / (nTop + nBtm)) : 0;
  const s = Math.max(1, Math.min(sW, sH));
  let idx = 0;
  // Top row: left to right
  for (let i = 0; i < nTop; ++i, ++idx) {
    out.side.push({
      x: mainX + i * (s + padding),
      y: mainY - s - padding,
      w: s,
      h: s,
    });
  }
  // Bottom row
  for (let i = 0; i < nBtm; ++i, ++idx) {
    out.side.push({
      x: mainX + i * (s + padding),
      y: mainY + mainH + padding,
      w: s,
      h: s,
    });
  }
  // Left column
  for (let i = 0; i < nL; ++i, ++idx) {
    out.side.push({
      x: mainX - s - padding,
      y: mainY + i * (s + padding),
      w: s,
      h: s,
    });
  }
  // Right column
  for (let i = 0; i < nR; ++i, ++idx) {
    out.side.push({
      x: mainX + mainW + padding,
      y: mainY + i * (s + padding),
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
  while (remain > 0) {
    if (remain > 0) { top++; remain--; }
    if (remain > 0) { btm++; remain--; }
    if (remain > 0) { l++; remain--; }
    if (remain > 0) { r++; remain--; }
  }
  return [top, btm, l, r];
}
