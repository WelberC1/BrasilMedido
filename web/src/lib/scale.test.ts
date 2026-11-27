import { describe, expect, it } from 'vitest'
import { BAD, buildScale, GOOD, MID, SEQ } from './scale'

describe('buildScale', () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  it('colors better-than-Brasil in blue and worse in orange (lower is better)', () => {
    const s = buildScale(values, 5, 'lower-is-better')
    expect(GOOD).toContain(s.color(1))
    expect(BAD).toContain(s.color(9))
    expect(s.color(5)).toBe(MID)
  })

  it('flips sides for higher-is-better', () => {
    const s = buildScale(values, 5, 'higher-is-better')
    expect(GOOD).toContain(s.color(9))
    expect(BAD).toContain(s.color(1))
  })

  it('farther from Brasil means a stronger step', () => {
    const s = buildScale(values, 5, 'higher-is-better')
    expect(GOOD.indexOf(s.color(9) as (typeof GOOD)[number])).toBeGreaterThan(GOOD.indexOf(s.color(6) as (typeof GOOD)[number]))
  })

  it('uses a sequential ramp for neutral indicators', () => {
    const s = buildScale(values, 5, 'neutral')
    expect(s.kind).toBe('sequential')
    expect(SEQ).toContain(s.color(9))
  })
})
