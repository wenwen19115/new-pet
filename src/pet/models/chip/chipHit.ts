/**
 * chip 屏上投影近似：中心椭圆（对齐 3D 斜视后的实体占地）。
 * NDC 相对桌宠 bodyBox。
 */
export function testChipHit(ndcX: number, ndcY: number): boolean {
  const x = ndcX / 0.78;
  const y = ndcY / 0.72;
  return x * x + y * y <= 1;
}
