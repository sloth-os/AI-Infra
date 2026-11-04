import test from 'node:test'
import assert from 'node:assert/strict'
import { ringAllReduce } from '../src/collective.ts'

test('each rank starts with only its own contributions', () => {
  const { buffers, counts } = ringAllReduce(0)
  buffers.forEach((row, rank) => assert.deepEqual(row, Array(8).fill(rank + 1)))
  counts.forEach((row) => assert.deepEqual(row, Array(8).fill(1)))
})

test('reduce-scatter leaves exactly one fully reduced chunk on each rank', () => {
  const { buffers, counts } = ringAllReduce(7)
  buffers.forEach((row, rank) => {
    assert.equal(row[(rank + 1) % 8], 36)
    assert.equal(counts[rank].filter((c) => c === 8).length, 1)
  })
})

test('all-gather leaves all ranks with the complete reduced vector', () => {
  const { buffers, counts } = ringAllReduce(14)
  buffers.forEach((row) => assert.deepEqual(row, Array(8).fill(36)))
  counts.forEach((row) => assert.deepEqual(row, Array(8).fill(8)))
})
