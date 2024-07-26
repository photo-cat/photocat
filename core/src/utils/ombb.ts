import { IPointData } from '@leafer/interface';

/**
 * 将某个点作为原点，并旋转坐标系一定角度，求原坐标系下的点位变换至新坐标系后的坐标
 * @param originX 变换前原点X坐标
 * @param originY 变换前原点Y坐标
 * @param coordinates 待变换的坐标点数组
 * @param angle 旋转角度
 * @returns 变换后的坐标系
 */
export function rotateCoordinates(
  originX: number,
  originY: number,
  coordinates: Array<IPointData>,
  angle: number,
) {
  const rotatedCoordinates: Array<IPointData> = [];

  const radians = (angle * Math.PI) / 180; // 将角度转换为弧度

  for (let i = 0; i < coordinates.length; i++) {
    const x = coordinates[i].x - originX;
    const y = coordinates[i].y - originY;

    const rotatedX = x * Math.cos(radians) - y * Math.sin(radians);
    const rotatedY = x * Math.sin(radians) + y * Math.cos(radians);

    rotatedCoordinates.push({ x: rotatedX, y: rotatedY });
  }

  return rotatedCoordinates;
}

// AABB
export function calculateAABB(points: Array<IPointData>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const x = point.x;
    const y = point.y;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const boundingBox = {
    minX: minX,
    minY: minY,
    maxX: maxX,
    maxY: maxY,
    width: width,
    height: height,
  };

  return boundingBox;
}

/**
 * 计算在指定旋转角度下
 * @param center
 * @param ar
 * @param vertexes
 * @param angle
 */
export function getMinCoverRectWH(
  center: IPointData,
  ar: number,
  vertexes: Array<IPointData>,
  angle: number,
) {
  // 先将图片中心点作为坐标原点，并将坐标系旋转，获取裁剪框的四个顶点坐标
  const newVertexes = rotateCoordinates(center.x, center.y, vertexes, angle);
  // 获取新坐标系下，这四个顶点的 AABB 包围盒
  const { minX, minY, maxX, maxY } = calculateAABB(newVertexes);
  // 获取绝对值更大的 X 与 Y 值
  const biggerX = Math.max(Math.abs(minX), Math.abs(maxX));
  const biggerY = Math.max(Math.abs(minY), Math.abs(maxY));

  const minCoverWidth = (biggerX / biggerY > ar ? biggerX : biggerY * ar) * 2;
  const minCoverHeight = minCoverWidth / ar;

  return {
    width: minCoverWidth,
    height: minCoverHeight,
  };
}
