import { describe, expect, it } from 'vitest'
import { classify, comparableIndex, cvNeedsAttention, isBetter, quantileBreaks, rankEntries } from './stats'

describe('quantileBreaks', () => {
  it('splits into k classes with ascending thresholds', () => {
    const b = quantileBreaks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 5)
    expect(b).toEqual([3, 5, 7, 9])
  })

  it('removes duplicate thresholds for repeated values', () => {
    expect(quantileBreaks([1, 1, 1, 1, 1, 1, 2], 5)).toEqual([1])
  })

  it('returns no breaks for fewer than two values', () => {
    expect(quantileBreaks([4], 5)).toEqual([])
  })
})

describe('classify', () => {
  it('places threshold values in the upper class', () => {
    const b = [3, 5, 7, 9]
    expect(classify(1, b)).toBe(0)
    expect(classify(3, b)).toBe(1)
    expect(classify(8.9, b)).toBe(3)
    expect(classify(10, b)).toBe(4)
  })
})

describe('rankEntries', () => {
  const entries = [
    { sigla: 'A', value: 5 },
    { sigla: 'B', value: 2 },
    { sigla: 'C', value: null },
    { sigla: 'D', value: 5 },
    { sigla: 'E', value: 9 },
  ]

  it('ranks lower-is-better ascending with shared ties and missing last', () => {
    const r = rankEntries(entries, 'lower-is-better')
    expect(r.map((e) => [e.sigla, e.rank])).toEqual([
      ['B', 1],
      ['A', 2],
      ['D', 2],
      ['E', 4],
      ['C', null],
    ])
  })

  it('ranks higher-is-better descending', () => {
    expect(rankEntries(entries, 'higher-is-better')[0].sigla).toBe('E')
  })
})

describe('comparableIndex', () => {
  it('uses previous year for annual series, skipping unpublished years', () => {
    // 2019, 2020 (gap), 2021 (gap), 2022
    expect(comparableIndex([5, null, null, 4], 3, 'anual')).toBe(0)
  })

  it('uses the same quarter of the previous year for quarterly series', () => {
    const s = [1, 2, 3, 4, 5, 6]
    expect(comparableIndex(s, 5, 'trimestral')).toBe(1)
  })

  it('returns null when there is nothing to compare', () => {
    expect(comparableIndex([1, 2], 1, 'trimestral')).toBeNull()
  })
})

describe('isBetter / cv', () => {
  it('respects polarity', () => {
    expect(isBetter(3, 5, 'lower-is-better')).toBe(true)
    expect(isBetter(3, 5, 'higher-is-better')).toBe(false)
    expect(isBetter(3, 5, 'neutral')).toBeNull()
  })

  it('flags CV above 15%', () => {
    expect(cvNeedsAttention(15)).toBe(false)
    expect(cvNeedsAttention(15.1)).toBe(true)
    expect(cvNeedsAttention(null)).toBe(false)
  })
})
