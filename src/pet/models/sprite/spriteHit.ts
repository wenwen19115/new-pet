/**
 * 精灵宠命中：NDC 为 [-1,1]、Y 向上（与 cursorToBodyNdc / toon 一致）。
 * 角色贴底，椭圆略偏下。
 */
export function testSpriteHit(ndcX: number, ndcY: number): boolean {
  const x = ndcX / 0.82;
  const y = (ndcY + 0.18) / 0.88;
  return x * x + y * y <= 1;
}
