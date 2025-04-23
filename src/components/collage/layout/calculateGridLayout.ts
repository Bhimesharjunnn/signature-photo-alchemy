
/**
 * CalculatePositions: Computes size and placement for main + side images in a tight border grid.
 * Ensures:
 *  - Main photo centered and ~50% canvas width, proportional height inside A4
 *  - Side photos are equal sized squares, forming a "frame" around main photo (top, bottom, left, right)
 *  - Minimal white space (5px padding everywhere)
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

  // Main photo: 50% canvas width, proportional height (keep square, but don't exceed canvas)
  const mainW = Math.round(canvasWidth * 0.5);
  const maxMainH = canvasHeight - 4 * padding; // leave enough headroom
  const mainH = Math.min(mainW, maxMainH);

  // Center main photo
  const mainX = Math.round((canvasWidth - mainW) / 2);
  const mainY = Math.round((canvasHeight - mainH) / 2);

  // How many side images?
  const numSide = imagesCount - 1;
  if (numSide < 1) {
    return {
      main: { x: mainX, y: mainY, w: mainW, h: mainH },
      side: [],
    };
  }

  // --- Side photos layout around main ---
  // We'll distribute floor(n/4) to each side, extras go: top, bottom, left, right, in that order.
  const nt = Math.floor(numSide / 4);
  const nb = Math.floor(numSide / 4);
  const nl = Math.floor(numSide / 4);
  const nr = Math.floor(numSide / 4);
  let remain = numSide - (nt + nb + nl + nr);
  const nBySide = [nt, nb, nl, nr];
  for (let i = 0; i < remain; ++i) {
    nBySide[i % 4]++;
  }
  const [nTop, nBtm, nL, nR] = nBySide;

  // Maximize possible tile size while fitting them all with padding
  // Tiles on top/bottom: laid out left to right, horizontally
  // Tiles on left/right: laid out vertically

  // Determine max available width/height for rows and columns (outside main + gaps)
  const availTopBotW = mainW + padding * (nTop > 0 ? (nTop - 1) : 0); // width to place side photos above/below main
  const availLftRtH = mainH + padding * (nL > 0 ? (nL - 1) : 0); // height to place side photos on left/right of main

  // Calculate the region for tiles:
  // For top/bottom: Use the space from left edge of main (centered) to the right (mainX to mainX+mainW)
  // For left/right: Use space from top edge of main (mainY to mainY+mainH)

  // We want side tiles as square as possible and as large as possible for tight fit.

  // 1. Top/bottom side tile width (if 0, default to 0)
  const sTop = (nTop > 0)
    ? Math.floor((mainW - (nTop - 1) * padding) / nTop)
    : 0;
  const sBtm = (nBtm > 0)
    ? Math.floor((mainW - (nBtm - 1) * padding) / nBtm)
    : 0;

  // 2. Left/right side tile height (if 0, default to 0)
  const sL = (nL > 0)
    ? Math.floor((mainH - (nL - 1) * padding) / nL)
    : 0;
  const sR = (nR > 0)
    ? Math.floor((mainH - (nR - 1) * padding) / nR)
    : 0;

  // We want all side tiles to be the same size, take the minimal among all >0
  // but always at least 1px (for edge cases)
  let sizes = [sTop, sBtm, sL, sR].filter(v => v > 0);
  let sideSize = sizes.length ? Math.max(1, Math.min(...sizes)) : 0;

  // For very large number of images, ensure size is reasonable (minimum 15px)
  // If there are too many images to fit at this size, we'll need to adjust the layout
  if (sideSize < 15 && numSide > 20) {
    // Rather than reducing size below readability, limit photos and make them larger
    sideSize = 15;
  }

  const side: { x: number; y: number; w: number; h: number }[] = [];
  
  // --- Top row ---
  for (let i = 0; i < nTop; i++) {
    // Distribute tiles left-to-right, centered above main
    let startX = mainX; // left edge of main
    let totalW = sideSize * nTop + padding * (nTop - 1);
    let x = Math.round(startX + (mainW - totalW) / 2 + i * (sideSize + padding));
    let y = mainY - sideSize - padding;
    side.push({ x, y, w: sideSize, h: sideSize });
  }
  // --- Bottom row ---
  for (let i = 0; i < nBtm; i++) {
    let startX = mainX;
    let totalW = sideSize * nBtm + padding * (nBtm - 1);
    let x = Math.round(startX + (mainW - totalW) / 2 + i * (sideSize + padding));
    let y = mainY + mainH + padding;
    side.push({ x, y, w: sideSize, h: sideSize });
  }
  // --- Left column ---
  for (let i = 0; i < nL; i++) {
    let startY = mainY;
    let totalH = sideSize * nL + padding * (nL - 1);
    let y = Math.round(startY + (mainH - totalH) / 2 + i * (sideSize + padding));
    let x = mainX - sideSize - padding;
    side.push({ x, y, w: sideSize, h: sideSize });
  }
  // --- Right column ---
  for (let i = 0; i < nR; i++) {
    let startY = mainY;
    let totalH = sideSize * nR + padding * (nR - 1);
    let y = Math.round(startY + (mainH - totalH) / 2 + i * (sideSize + padding));
    let x = mainX + mainW + padding;
    side.push({ x, y, w: sideSize, h: sideSize });
  }

  return {
    main: { x: mainX, y: mainY, w: mainW, h: mainH },
    side,
  };
}
