/**
 * CalculatePositions: Computes size and placement for main + side images filling the A4 canvas tightly,
 * with consistent 5px padding between every photo and the canvas edge.
 *
 * - The main photo is centered, maximized as a square, and dominant (~50% width but grows if room available).
 * - Side photos are square and form a tight frame (rows above/below, cols left/right) around main photo.
 * - All side photos are the same size, and all paddings are exactly `padding`.
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

  // If only one image, make it fill with margin
  if (imagesCount === 1) {
    const w = canvasWidth - 2 * padding;
    const h = canvasHeight - 2 * padding;
    // Fit as largest possible square centered
    const size = Math.min(w, h);
    const x = Math.round((canvasWidth - size) / 2);
    const y = Math.round((canvasHeight - size) / 2);
    return { main: { x, y, w: size, h: size }, side: [] };
  }

  // Decide how many side images for each side: top, bottom, left, right
  const numSide = imagesCount - 1;
  let nBySide = [0, 0, 0, 0]; // Top, Bottom, Left, Right
  for (let i = 0; i < numSide; ++i) nBySide[i % 4]++;
  const [nTop, nBtm, nLft, nRgt] = nBySide;

  // We want to use as much space as possible, but maintain paddings everywhere.
  // Let:
  //   s = side photo size (square, to maximize)
  //   m = main photo size (square, dominant)
  //
  // There are nLft + nRgt photos on the left/right, nTop + nBtm photos on top/bottom
  // Total grid dimensions:
  //   gridW = nLft*s + m + nRgt*s + (nLft + nRgt + 2)*padding
  //   gridH = nTop*s + m + nBtm*s + (nTop + nBtm + 2)*padding
  //
  // Solve for max possible s and m that fit canvas
  // Target: main photo is at least 50% width, but grows to fill space if few side photos

  // To keep main photo dominant, set its min size (50% width)
  const minMain = Math.min(Math.floor(canvasWidth * 0.5), Math.floor(canvasHeight * 0.5));

  // We'll try all feasible s (from large to small) and pick the one with the largest main photo that fits
  // For tight layout, we want to maximize both s and m
  let bestLayout = { main: { x: 0, y: 0, w: 0, h: 0 }, side: [] as any[] };
  let maxMainArea = 0;

  // Try reducing side size from possible max down to 1
  const maxSideSizeW = Math.floor((canvasWidth - 2 * padding) / (nLft + nRgt === 0 ? 1 : (nLft + nRgt + 1)));
  const maxSideSizeH = Math.floor((canvasHeight - 2 * padding) / (nTop + nBtm === 0 ? 1 : (nTop + nBtm + 1)));
  const maxSideSize = Math.max(1, Math.min(maxSideSizeW, maxSideSizeH, 300));

  for (let s = maxSideSize; s >= 1; --s) {
    let mW = canvasWidth - (nLft + nRgt) * s - (nLft + nRgt + 2) * padding;
    let mH = canvasHeight - (nTop + nBtm) * s - (nTop + nBtm + 2) * padding;
    let m = Math.min(mW, mH);

    // Main should be at least 50% width, but if side images are too many, fallback to as big as possible
    if (m < minMain && (nLft + nRgt + nTop + nBtm) > 0) continue;

    // Place main photo
    const gridW = nLft * s + m + nRgt * s + (nLft + nRgt + 2) * padding;
    const gridH = nTop * s + m + nBtm * s + (nTop + nBtm + 2) * padding;
    const startX = Math.round((canvasWidth - gridW) / 2);
    const startY = Math.round((canvasHeight - gridH) / 2);

    const mainX = startX + nLft * s + (nLft + 1) * padding;
    const mainY = startY + nTop * s + (nTop + 1) * padding;

    // Place side photos: top row
    const side: { x: number; y: number; w: number; h: number }[] = [];
    let idx = 0;
    for (let i = 0; i < nTop; ++i, ++idx) {
      const x = startX + nLft * s + (nLft + 1) * padding + i * (s + padding) - ((nTop * (s + padding) - padding) - m) / 2;
      const y = startY + padding;
      side.push({ x: Math.round(x), y: Math.round(y), w: s, h: s });
    }
    // bottom row
    for (let i = 0; i < nBtm; ++i, ++idx) {
      const x = startX + nLft * s + (nLft + 1) * padding + i * (s + padding) - ((nBtm * (s + padding) - padding) - m) / 2;
      const y = startY + nTop * s + m + (nTop + nBtm + 1) * padding;
      side.push({ x: Math.round(x), y: Math.round(y), w: s, h: s });
    }
    // left col
    for (let i = 0; i < nLft; ++i, ++idx) {
      const x = startX + padding;
      const y = startY + nTop * s + (nTop + 1) * padding + i * (s + padding) - ((nLft * (s + padding) - padding) - m) / 2;
      side.push({ x: Math.round(x), y: Math.round(y), w: s, h: s });
    }
    // right col
    for (let i = 0; i < nRgt; ++i, ++idx) {
      const x = startX + nLft * s + m + (nLft + 1 + 1) * padding;
      const y = startY + nTop * s + (nTop + 1) * padding + i * (s + padding) - ((nRgt * (s + padding) - padding) - m) / 2;
      side.push({ x: Math.round(x), y: Math.round(y), w: s, h: s });
    }
    if (m * m > maxMainArea) {
      bestLayout = {
        main: { x: Math.round(mainX), y: Math.round(mainY), w: Math.round(m), h: Math.round(m) },
        side,
      };
      maxMainArea = m * m;
    }
    // Stop as soon as we find a valid large main and all sides fit
    if (maxMainArea > 0) break;
  }

  return bestLayout;
}
