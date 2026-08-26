// 위키피디아 "Binomial proportion confidence interval" — 신뢰구간 하한(95%)을 점수로 사용
// 표본(투표 수)이 적으면 점수를 낮게 잡아, "1표만 받고 100%"인 댓글이 "표는 많은데 90%"인 댓글보다 위로 오는 것을 방지한다
export function wilsonScore(upvotes: number, downvotes: number): number {
  const n = upvotes + downvotes
  if (n === 0) return 0
  const z = 1.96
  const phat = upvotes / n
  return (phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) / (1 + (z * z) / n)
}
