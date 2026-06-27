// 経路ヘルパー：折れ線(PATH)を「累積距離→座標」に変換する。
// 敵は dist（進んだ距離）だけ持ち、毎フレーム posAt(dist) で x,y を得る。
// → Phaserの物理bodyを使わないので「bodyがspriteを駆動する」系の落とし穴が起きない。

export function buildPath(points) {
  const segments = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segments.push({ x1, y1, x2, y2, len, cum: total });
    total += len;
  }
  return { segments, total };
}

export function posAt(path, dist) {
  const { segments, total } = path;
  if (dist <= 0) {
    const s = segments[0];
    return { x: s.x1, y: s.y1 };
  }
  if (dist >= total) {
    const s = segments[segments.length - 1];
    return { x: s.x2, y: s.y2 };
  }
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (dist >= s.cum && dist < s.cum + s.len) {
      const t = (dist - s.cum) / s.len;
      return { x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t };
    }
  }
  const last = segments[segments.length - 1];
  return { x: last.x2, y: last.y2 };
}
