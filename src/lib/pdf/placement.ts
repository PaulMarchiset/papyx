/**
 * Placing a stamp on a page that carries a `/Rotate` entry.
 *
 * pdf-lib draws in the page's own coordinate system, but a reader shows that
 * system rotated. On a page with `/Rotate 90` a watermark drawn "at the top
 * left, horizontally" therefore lands on the side, in the wrong corner — which
 * is exactly what happens to scans and landscape exports.
 *
 * So the stamping tools compute where the text goes in *screen* space, where
 * the geometry is obvious, and convert with the helpers below. Adding the page
 * rotation to the text angle then makes it read horizontally again.
 */

export interface Point {
  x: number;
  y: number;
}

/** The page as the reader sees it: a quarter turn swaps the two dimensions. */
export function displayedSize(width: number, height: number, rotation: number) {
  const quarterTurn = normalizeAngle(rotation) % 180 === 90;
  return quarterTurn
    ? { width: height, height: width }
    : { width, height };
}

export function normalizeAngle(angle: number): number {
  return ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
}

/**
 * Maps a point from screen space (origin at the bottom-left of the page as
 * displayed) into the page's own coordinate system.
 */
export function screenToPdf(
  point: Point,
  width: number,
  height: number,
  rotation: number,
): Point {
  switch (normalizeAngle(rotation)) {
    case 90:
      return { x: width - point.y, y: point.x };
    case 180:
      return { x: width - point.x, y: height - point.y };
    case 270:
      return { x: point.y, y: height - point.x };
    default:
      return point;
  }
}
