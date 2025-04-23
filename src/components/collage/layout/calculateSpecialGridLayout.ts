
/**
 * Special Grid Layout Calculator
 * Creates a layout with a centered 3x5 main photo (15 cells)
 * surrounded by smaller photos in a 6x8 grid (33 cells for side photos)
 */

export interface SpecialGridLayoutResult {
  main: { x: number; y: number; w: number; h: number };
  side: Array<{ x: number; y: number; w: number; h: number }>;
}

export function calculateSpecialGridLayout({
  canvasWidth,
  canvasHeight,
  padding,
}: {
  canvasWidth: number;
  canvasHeight: number;
  padding: number;
}): SpecialGridLayoutResult {
  // Create a 6x8 grid (48 total cells)
  const TOTAL_ROWS = 6;
  const TOTAL_COLS = 8;
  
  // Main photo dimensions (3x5 = 15 cells)
  const MAIN_WIDTH = 3;
  const MAIN_HEIGHT = 5;
  
  // Calculate cell dimensions with reduced padding
  const cellWidth = (canvasWidth - (TOTAL_COLS + 1) * padding) / TOTAL_COLS;
  const cellHeight = (canvasHeight - (TOTAL_ROWS + 1) * padding) / TOTAL_ROWS;
  
  // Center the main photo
  const mainStartCol = Math.floor((TOTAL_COLS - MAIN_WIDTH) / 2);  // Should be position 2
  const mainStartRow = Math.floor((TOTAL_ROWS - MAIN_HEIGHT) / 2); // Should be position 0
  
  // Calculate main photo dimensions and position
  const mainX = padding + (mainStartCol * (cellWidth + padding));
  const mainY = padding + (mainStartRow * (cellHeight + padding));
  const mainW = (cellWidth * MAIN_WIDTH) + (padding * (MAIN_WIDTH - 1));
  const mainH = (cellHeight * MAIN_HEIGHT) + (padding * (MAIN_HEIGHT - 1));
  
  const main = { x: mainX, y: mainY, w: mainW, h: mainH };
  
  // Create positions for side photos, skipping the cells used by the main photo
  const side: Array<{ x: number; y: number; w: number; h: number }> = [];
  
  // Iterate through the entire grid
  for (let row = 0; row < TOTAL_ROWS; row++) {
    for (let col = 0; col < TOTAL_COLS; col++) {
      // Skip cells occupied by the main photo
      if (
        row >= mainStartRow && row < mainStartRow + MAIN_HEIGHT &&
        col >= mainStartCol && col < mainStartCol + MAIN_WIDTH
      ) {
        continue;
      }
      
      // Calculate position for this cell
      const x = padding + (col * (cellWidth + padding));
      const y = padding + (row * (cellHeight + padding));
      
      side.push({
        x,
        y,
        w: cellWidth,
        h: cellHeight
      });
    }
  }
  
  return { main, side };
}
