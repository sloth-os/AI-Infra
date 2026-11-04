export const RANKS = 8

// Ring all-reduce for an eight-chunk vector. Rank r starts with the vector
// [r+1, …, r+1]. Every step takes a snapshot so all sends happen concurrently.
export function ringAllReduce(step: number) {
  let buffers = Array.from({ length: RANKS }, (_, r) =>
    Array<number>(RANKS).fill(r + 1),
  )
  const counts = Array.from({ length: RANKS }, () =>
    Array<number>(RANKS).fill(1),
  )
  for (
    let exchange = 0;
    exchange < Math.min(14, Math.max(0, step));
    exchange++
  ) {
    const before = buffers.map((row) => [...row])
    const beforeCounts = counts.map((row) => [...row])
    buffers = before.map((row) => [...row])
    for (let rank = 0; rank < RANKS; rank++) {
      const previous = (rank - 1 + RANKS) % RANKS
      if (exchange < RANKS - 1) {
        const chunk = (rank - exchange - 1 + RANKS) % RANKS
        buffers[rank][chunk] += before[previous][chunk]
        counts[rank][chunk] += beforeCounts[previous][chunk]
      } else {
        const round = exchange - (RANKS - 1)
        const chunk = (rank - round + RANKS) % RANKS
        buffers[rank][chunk] = before[previous][chunk]
        counts[rank][chunk] = beforeCounts[previous][chunk]
      }
    }
  }
  return { buffers, counts }
}
