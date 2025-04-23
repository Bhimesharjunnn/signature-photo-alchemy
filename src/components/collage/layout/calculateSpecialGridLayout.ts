
/**
 * Special Grid Layout Calculator
 * Creates a 7x7 grid with a center 4x4 space for the main photo
 * Designed specifically for layouts with 48 photos (1 main + 47 side)
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
  // Constants for our 7x7 grid
  const GRID_SIZE = 7;
  const MAIN_START_ROW = 1;
  const MAIN_START_COL = 1;
  const MAIN_SIZE = 4; // 4x4 cells for main photo

  // Calculate cell dimensions based on canvas size
  const cellWidth = (canvasWidth - (GRID_SIZE + 1) * padding) / GRID_SIZE;
  const cellHeight = (canvasHeight - (GRID_SIZE + 1) * padding) / GRID_SIZE;
  
  // Calculate position and size for the main photo
  const mainX = padding + (MAIN_START_COL * (cellWidth + padding));
  const mainY = padding + (MAIN_START_ROW * (cellHeight + padding));
  const mainW = (cellWidth * MAIN_SIZE) + (padding * (MAIN_SIZE - 1));
  const mainH = (cellHeight * MAIN_SIZE) + (padding * (MAIN_SIZE - 1));
  
  // Create the main photo position object
  const main = {
    x: mainX,
    y: mainY,
    w: mainW,
    h: mainH
  };
  
  // Create positions for all side photos, skipping the cells used by the main photo
  const side: Array<{ x: number; y: number; w: number; h: number }> = [];
  
  // Iterate through the entire 7x7 grid
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      // Skip cells occupied by the main photo
      if (
        row >= MAIN_START_ROW && row < MAIN_START_ROW + MAIN_SIZE &&
        col >= MAIN_START_COL && col < MAIN_START_COL + MAIN_SIZE
      ) {
        continue;
      }
      
      // Calculate position for this cell
      const x = padding + (col * (cellWidth + padding));
      const y = padding + (row * (cellHeight + padding));
      
      // Add to side photos array
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
