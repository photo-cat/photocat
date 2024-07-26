interface IPoint {
  x: number;
  y: number;
}

export function distanceBetween2Points(point1: IPoint, point2: IPoint) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

export function angleBetween2Points(point1: IPoint, point2: IPoint): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.atan2(dx, dy);
}
