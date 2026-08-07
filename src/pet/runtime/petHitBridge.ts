/**
 * 精确命中桥：各形象在桌宠窗注册，pointer 采样查询。
 * 无注册时返回 null（调用方走矩形盒）。
 */

type PetHitTester = (ndcX: number, ndcY: number) => boolean;

let tester: PetHitTester | null = null;

export function registerPetHitTester(fn: PetHitTester | null) {
  tester = fn;
}

export function testPetPreciseHit(ndcX: number, ndcY: number): boolean | null {
  if (!tester) return null;
  if (Math.abs(ndcX) > 1.02 || Math.abs(ndcY) > 1.02) return false;
  return tester(ndcX, ndcY);
}
