import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ANIMATION_DURATION,
  chapterTime,
  collectiveTransfer,
  getMotionFrame,
  motionChapters,
} from '../src/motion.ts'
import { defaults } from '../src/model.ts'

test('every lens has seekable chapters with bounded, finite progress', () => {
  for (const mode of ['requests', 'kv', 'collectives', 'tensors'] as const) {
    for (let index = 0; index < motionChapters[mode].length; index++) {
      const frame = getMotionFrame(chapterTime(mode, index), mode)
      assert.equal(frame.chapterIndex, index)
      assert.ok(frame.progress >= 0 && frame.progress <= 1)
      assert.ok(frame.chapterProgress >= 0 && frame.chapterProgress <= 1)
      assert.ok(Number.isFinite(frame.cacheMiB))
    }
  }
  assert.equal(getMotionFrame(-100, 'requests').time, 0)
  assert.equal(getMotionFrame(Infinity, 'requests').time, 0)
  assert.equal(getMotionFrame(100, 'requests').time, ANIMATION_DURATION)
})

test('KV state fills, transfers eight exact shards, appends, and releases', () => {
  const empty = getMotionFrame(0, 'kv')
  const transfer = getMotionFrame(chapterTime('kv', 2), 'kv')
  const append = getMotionFrame(ANIMATION_DURATION * 0.7, 'kv')
  const released = getMotionFrame(ANIMATION_DURATION, 'kv')
  assert.equal(empty.cacheMiB, 0)
  assert.equal(transfer.cacheMiB, 640)
  assert.equal(transfer.shardMiB, 80)
  assert.ok(append.contextTokens > defaults.inputTokens)
  assert.equal(append.cacheMiB, append.shardMiB * 8)
  assert.equal(released.cacheMiB, 0)
  assert.equal(released.contextTokens, 0)
})

test('the 3D ring exposes the same correct partial sums as the algorithm playground', () => {
  const reduced = getMotionFrame(ANIMATION_DURATION / 2, 'collectives')
  assert.equal(reduced.collectiveStep, 7)
  reduced.buffers.forEach((row, rank) => {
    assert.equal(row[(rank + 1) % 8], 36)
    assert.equal(reduced.contributions[rank].filter((n) => n === 8).length, 1)
  })
  const complete = getMotionFrame(ANIMATION_DURATION, 'collectives')
  assert.equal(complete.collectiveStep, 14)
  complete.buffers.forEach((row) => assert.deepEqual(row, Array(8).fill(36)))
})

test('network and prompt controls change analytical transfer size and latency', () => {
  const normal = getMotionFrame(24, 'kv')
  const slow = getMotionFrame(24, 'kv', { ...defaults, networkGbps: 25 })
  const long = getMotionFrame(24, 'kv', { ...defaults, inputTokens: 8192 })
  assert.equal(slow.transferMs, normal.transferMs * 16)
  assert.equal(long.cacheMiB, normal.cacheMiB * 4)
  assert.equal(long.transferMs, normal.transferMs * 4)
})

test('tensor flow contains the complete dimensional transformation and causal constraint', () => {
  assert.equal(motionChapters.tensors.length, 8)
  assert.match(motionChapters.tensors[1].payload, /64,128/)
  assert.match(motionChapters.tensors[1].payload, /8,128/)
  assert.match(motionChapters.tensors[3].payload, /causal mask/)
  assert.match(motionChapters.tensors[7].payload, /next decode/)
})

test('a picked collective parcel contains the actual sender chunk and partial sum', () => {
  assert.deepEqual(collectiveTransfer(0, 0), {
    sender: 0,
    receiver: 1,
    chunk: 0,
    value: 1,
    contributions: 1,
    complete: false,
  })
  const partial = collectiveTransfer(1, 0)
  assert.equal(partial.chunk, 7)
  assert.equal(partial.value, 9)
  assert.equal(partial.contributions, 2)
  const reduced = collectiveTransfer(7, 0)
  assert.equal(reduced.chunk, 1)
  assert.equal(reduced.value, 36)
  assert.equal(reduced.contributions, 8)
  assert.equal(collectiveTransfer(14, 4).complete, true)
})
