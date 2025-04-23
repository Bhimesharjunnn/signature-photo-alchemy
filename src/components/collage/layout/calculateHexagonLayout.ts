
/**
 * Calculates a hexagonal layout for collage images with multiple rings
 */

interface HexagonPosition {
  x: number;
  y: number;
  size: number;
}

interface HexagonLayout {
  centerHexagon: HexagonPosition;
  sideHexagons: HexagonPosition[];
}

interface HexCoord {
  q: number;
  r: number;
}

export function calculateHexagonLayout({
  canvasWidth,
  canvasHeight,
  padding,
  imagesCount,
}: {
  canvasWidth: number;
  canvasHeight: number;
  padding: number;
  imagesCount: number;
}): HexagonLayout {
  // Need at least one image
  if (imagesCount < 1) {
    return {
      centerHexagon: { x: canvasWidth / 2, y: canvasHeight / 2, size: 0 },
      sideHexagons: [],
    };
  }

  // Calculate layout dimensions
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  // Calculate maximum radius that will fit in the canvas
  const maxRadius = Math.min(canvasWidth, canvasHeight) * 0.45;
  
  // Determine how many rings we need based on image count
  // Ring 1 has 6 hexes, Ring 2 has 12 hexes, Ring 3 has 18 hexes, etc.
  const sideCount = imagesCount - 1; // One image is the main image
  
  // Calculate required rings and sizes
  const ringData = calculateHexagonRings(sideCount);
  
  // Calculate hexagon size based on number of rings
  // Fixed: Adjusted size calculation to avoid overlap
  const hexSize = maxRadius / (ringData.rings * 1.5 + 0.5) - padding;
  
  // Create hexagon positions using axial coordinates
  const hexPositions = generateHexPositions(ringData.rings, hexSize);
  
  // Only take as many as we need
  const sideHexagons = hexPositions.slice(0, sideCount).map(hex => ({
    x: centerX + hex.x,
    y: centerY + hex.y,
    size: hexSize
  }));

  return {
    centerHexagon: { 
      x: centerX, 
      y: centerY, 
      size: hexSize * (ringData.rings > 1 ? 1.25 : 1.15) // Make center slightly larger
    },
    sideHexagons
  };
}

/**
 * Calculates how many rings are needed for the given number of images
 */
function calculateHexagonRings(sideCount: number): { rings: number, totalHexes: number } {
  if (sideCount <= 6) return { rings: 1, totalHexes: 6 };
  if (sideCount <= 18) return { rings: 2, totalHexes: 18 };
  if (sideCount <= 36) return { rings: 3, totalHexes: 36 };
  return { rings: 4, totalHexes: 60 }; // Maximum 4 rings (60 hexes + center)
}

/**
 * Generates hexagon positions for the given number of rings
 */
function generateHexPositions(rings: number, hexSize: number): { x: number, y: number }[] {
  const positions: { x: number, y: number }[] = [];
  // FIX: Adjusted spacing calculation to prevent overlap
  const hexWidth = hexSize * 2; // Doubled for no overlap
  const hexHeight = hexSize * 2; 
  const vertSpacing = hexHeight * 0.85; // Increased from 0.75 to 0.85
  
  // Generate coordinates for each ring
  for (let ring = 1; ring <= rings; ring++) {
    const ringPositions = generateRingPositions(ring);
    for (const pos of ringPositions) {
      // Convert axial coordinates to pixel positions with adjusted spacing
      positions.push({
        x: pos.q * hexWidth,
        y: pos.r * vertSpacing + pos.q * vertSpacing / 2
      });
    }
  }
  
  return positions;
}

/**
 * Generates axial coordinates for hexagons in a specific ring
 */
function generateRingPositions(ring: number): HexCoord[] {
  const results: HexCoord[] = [];
  
  // Handle special case for first ring
  if (ring === 1) {
    // Six hexagons around the center
    return [
      { q: 1, r: -1 },  // NE
      { q: 0, r: -1 },  // N
      { q: -1, r: 0 },  // NW
      { q: -1, r: 1 },  // SW
      { q: 0, r: 1 },   // S
      { q: 1, r: 0 }    // SE
    ];
  }
  
  // Start at the top-right corner of the ring
  let q = ring;
  let r = -ring;
  
  // Direction vectors for moving around the ring
  const directions = [
    { dq: -1, dr: 0 },  // NW
    { dq: -1, dr: 1 },  // W
    { dq: 0, dr: 1 },   // SW
    { dq: 1, dr: 0 },   // SE
    { dq: 1, dr: -1 },  // E
    { dq: 0, dr: -1 }   // NE
  ];
  
  // For each of the six sides
  for (let side = 0; side < 6; side++) {
    // Move ring steps along this side
    for (let step = 0; step < ring; step++) {
      results.push({ q, r });
      q += directions[side].dq;
      r += directions[side].dr;
    }
  }
  
  return results;
}
