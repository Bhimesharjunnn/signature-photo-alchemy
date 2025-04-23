
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

  // Determine size of main photo (dynamically adjust based on image count)
  // With more images, shrink the main image slightly to make room
  const mainSizeFactor = Math.max(0.3, 0.5 - (imagesCount / 200)); // Scale from 0.5 to 0.3
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

  // Dynamically create a layout based on the number of side photos
  const side: { x: number; y: number; w: number; h: number }[] = [];
  
  // Special case for lots of photos - use layout with 3 rows to add more photos on sides
  if (numSide >= 16) {
    const gridRows = 5; // Top, mid-top, center, mid-bottom, bottom
    const gridCols = 5; // Left, mid-left, center, mid-right, right
    
    // Size cells based on grid dimensions
    const colWidth = Math.floor((canvasWidth - (gridCols + 1) * padding) / gridCols);
    const rowHeight = Math.floor((canvasHeight - (gridRows + 1) * padding) / gridRows);
    const cellSize = Math.min(colWidth, rowHeight);
    
    // Calculate main photo dimensions
    const newMainW = cellSize * 3 + padding * 2;
    const newMainH = cellSize * 3 + padding * 2;
    const newMainX = Math.round((canvasWidth - newMainW) / 2);
    const newMainY = Math.round((canvasHeight - newMainH) / 2);
    
    // Create a grid for all positions
    const grid = createGrid(gridRows, gridCols, cellSize, padding);
    
    // Define center region for main photo
    const centerStartRow = Math.floor(gridRows / 2) - 1;
    const centerEndRow = Math.floor(gridRows / 2) + 1;
    const centerStartCol = Math.floor(gridCols / 2) - 1;
    const centerEndCol = Math.floor(gridCols / 2) + 1;
    
    // Filter out center positions (main photo area)
    const sidePositions = grid.filter(pos => 
      !(pos.row >= centerStartRow && pos.row <= centerEndRow && 
        pos.col >= centerStartCol && pos.col <= centerEndCol)
    );
    
    // Take only as many positions as we have side images
    const usedPositions = sidePositions.slice(0, numSide);
    
    // Map grid positions to canvas coordinates
    for (const pos of usedPositions) {
      side.push({
        x: padding + pos.col * (cellSize + padding),
        y: padding + pos.row * (cellSize + padding),
        w: cellSize,
        h: cellSize
      });
    }
    
    // Return updated layout
    return {
      main: { x: newMainX, y: newMainY, w: newMainW, h: newMainH },
      side
    };
  }
  // Default layout with 4 sides around the main photo
  else {
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
    sideSize = Math.max(10, sideSize); // Increased minimum size for visibility
    
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
