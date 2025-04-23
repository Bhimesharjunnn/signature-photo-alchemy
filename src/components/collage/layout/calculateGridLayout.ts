
/**
 * CalculatePositions: Computes size and placement for main + side images in a grid pattern.
 * Creates a true grid layout with multiple rows and columns surrounding a central main image.
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

  // Determine layout type based on image count
  // For many images, we'll use a true grid layout with rows and columns
  const sideCount = imagesCount - 1;
  
  // For few images (less than 9), use the center-focused layout
  if (sideCount < 8) {
    return calculateCenteredGridLayout({
      canvasWidth, 
      canvasHeight, 
      padding, 
      imagesCount, 
      mainPhotoIndex
    });
  } 
  // For more images, use a full grid layout with multiple rows and columns
  else {
    return calculateFullGridLayout({
      canvasWidth,
      canvasHeight,
      padding,
      imagesCount,
      mainPhotoIndex
    });
  }
}

/**
 * Calculates a grid layout with main photo in center and sides around it
 */
function calculateCenteredGridLayout({
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
  // Determine size of main photo
  const mainSizeFactor = Math.max(0.35, 0.5 - (imagesCount / 200));
  const mainW = Math.round(canvasWidth * mainSizeFactor);
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
  sideSize = Math.max(20, sideSize); // Increased minimum size for visibility
  
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

/**
 * Calculates a full grid layout with multiple rows and columns
 * Main photo will be larger but part of the grid
 */
function calculateFullGridLayout({
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
  // Calculate optimal grid dimensions
  const totalImages = imagesCount;
  
  // Calculate the best grid dimensions based on total images and canvas aspect ratio
  const canvasAspect = canvasWidth / canvasHeight;
  
  // Determine number of columns based on aspect ratio and image count
  let columns = Math.ceil(Math.sqrt(totalImages * canvasAspect));
  let rows = Math.ceil(totalImages / columns);
  
  // Adjust if we have too many rows compared to columns
  if (rows > columns * 1.5) {
    columns = Math.ceil(Math.sqrt(totalImages));
    rows = Math.ceil(totalImages / columns);
  }
  
  // Calculate cell size
  const cellWidth = (canvasWidth - (columns + 1) * padding) / columns;
  const cellHeight = (canvasHeight - (rows + 1) * padding) / rows;
  
  // Create the grid cells
  const cells: Array<{ x: number; y: number; w: number; h: number }> = [];
  
  // Place all images in a grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const index = r * columns + c;
      
      // Skip if we've placed all images
      if (index >= totalImages) continue;
      
      // Calculate position
      const x = padding + c * (cellWidth + padding);
      const y = padding + r * (cellHeight + padding);
      
      cells.push({
        x, y, 
        w: cellWidth, 
        h: cellHeight
      });
    }
  }
  
  // If we don't have enough cells, add one more row
  if (cells.length < totalImages) {
    const lastRowCells = totalImages - cells.length;
    const lastRowY = padding + rows * (cellHeight + padding);
    
    for (let c = 0; c < lastRowCells; c++) {
      const x = padding + c * (cellWidth + padding);
      cells.push({
        x, y: lastRowY, 
        w: cellWidth, 
        h: cellHeight
      });
    }
  }
  
  // Select main image cell - use center cell of the grid
  const centerCellIndex = Math.floor(cells.length / 2);
  const mainCell = cells[centerCellIndex];
  
  // Make main cell larger (2x2 if possible)
  const mainSize = Math.min(cellWidth * 1.5, cellHeight * 1.5);
  const mainX = mainCell.x + (cellWidth - mainSize) / 2;
  const mainY = mainCell.y + (cellHeight - mainSize) / 2;
  
  // Remove main cell from regular cells and create side cells
  const sidePositions = cells
    .filter((_, i) => i !== centerCellIndex)
    .slice(0, imagesCount - 1); // Only take as many as we need
  
  return {
    main: { 
      x: mainX, 
      y: mainY, 
      w: mainSize, 
      h: mainSize 
    },
    side: sidePositions
  };
}

/**
 * Helper function to create a grid of positions
 */
function createGrid(rows: number, cols: number, cellSize: number, padding: number) {
  const positions = [];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({ row, col, size: cellSize });
    }
  }
  
  return positions;
}
