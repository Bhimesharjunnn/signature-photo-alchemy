/**
 * CalculatePositions: Computes size and placement for main + side images in a tight border grid.
 * Ensures:
 *  - Main photo centered and ~50% canvas width, proportional height inside A4
 *  - Side photos are equal sized squares, forming a "frame" around main photo
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
  const maxMainH = canvasHeight - 4 * padding;
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

  // Distribute images evenly around main photo
  const nBySide = [0, 0, 0, 0]; // [top, bottom, left, right]
  const totalSlots = Math.floor(numSide / 4) * 4;
  const extras = numSide - totalSlots;

  // Distribute base slots
  for (let i = 0; i < 4; i++) {
    nBySide[i] = Math.floor(numSide / 4);
  }

  // Add extra images prioritizing top and bottom for visual balance
  for (let i = 0; i < extras; i++) {
    if (i < 2) {
      // First two extras go top/bottom
      nBySide[i % 2]++;
    } else {
      // Rest go left/right
      nBySide[2 + (i % 2)]++;
    }
  }

  const [nTop, nBtm, nL, nR] = nBySide;

  // Calculate maximum possible size for side photos that fits all of them
  const topBtmSpace = mainW;
  const leftRightSpace = mainH;

  // Calculate sizes based on number of images in each direction
  const sTop = nTop > 0 ? Math.floor((topBtmSpace - (nTop - 1) * padding) / nTop) : 0;
  const sBtm = nBtm > 0 ? Math.floor((topBtmSpace - (nBtm - 1) * padding) / nBtm) : 0;
  const sL = nL > 0 ? Math.floor((leftRightSpace - (nL - 1) * padding) / nL) : 0;
  const sR = nR > 0 ? Math.floor((leftRightSpace - (nR - 1) * padding) / nR) : 0;

  // Use smallest size for uniform appearance
  let sizes = [sTop, sBtm, sL, sR].filter(v => v > 0);
  let sideSize = sizes.length ? Math.min(...sizes) : 0;

  // Ensure minimum 1px size (prevents division by zero)
  sideSize = Math.max(1, sideSize);

  const side: { x: number; y: number; w: number; h: number }[] = [];
  
  // Position all images
  // Top row
  for (let i = 0; i < nTop; i++) {
    let startX = mainX;
    let totalW = sideSize * nTop + padding * (nTop - 1);
    let x = Math.round(startX + (mainW - totalW) / 2 + i * (sideSize + padding));
    let y = mainY - sideSize - padding;
    side.push({ x, y, w: sideSize, h: sideSize });
  }

  // Bottom row
  for (let i = 0; i < nBtm; i++) {
    let startX = mainX;
    let totalW = sideSize * nBtm + padding * (nBtm - 1);
    let x = Math.round(startX + (mainW - totalW) / 2 + i * (sideSize + padding));
    let y = mainY + mainH + padding;
    side.push({ x, y, w: sideSize, h: sideSize });
  }

  // Left column
  for (let i = 0; i < nL; i++) {
    let startY = mainY;
    let totalH = sideSize * nL + padding * (nL - 1);
    let y = Math.round(startY + (mainH - totalH) / 2 + i * (sideSize + padding));
    let x = mainX - sideSize - padding;
    side.push({ x, y, w: sideSize, h: sideSize });
  }

  // Right column
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
