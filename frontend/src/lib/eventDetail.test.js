import { describe, expect, it } from 'vitest'
import { describeSelectedSeats, remainingCapacity } from './eventDetail'

describe('remainingCapacity', () => {
  it('subtracts reserved_count from capacity', () => {
    expect(remainingCapacity({ capacity: 50, reserved_count: 12 })).toBe(38)
  })

  it('can reach zero when sold out', () => {
    expect(remainingCapacity({ capacity: 10, reserved_count: 10 })).toBe(0)
  })
})

describe('describeSelectedSeats', () => {
  const seats = [
    { id: 1, row: 'A', col: '1' },
    { id: 2, row: 'A', col: '2' },
    { id: 3, row: 'B', col: '5' },
  ]

  it('returns an empty label when nothing is selected', () => {
    expect(describeSelectedSeats(seats, [])).toEqual({
      selectedSeatLabels: '',
      seatLabelsPlural: false,
    })
  })

  it('returns an empty label when seats have not loaded yet', () => {
    expect(describeSelectedSeats(null, [1])).toEqual({
      selectedSeatLabels: '',
      seatLabelsPlural: false,
    })
  })

  it('labels a single selected seat without a comma', () => {
    expect(describeSelectedSeats(seats, [1])).toEqual({
      selectedSeatLabels: 'A1',
      seatLabelsPlural: false,
    })
  })

  it('joins multiple selected seats and marks them plural', () => {
    expect(describeSelectedSeats(seats, [1, 3])).toEqual({
      selectedSeatLabels: 'A1, B5',
      seatLabelsPlural: true,
    })
  })

  it('ignores a selected id that no longer matches a seat', () => {
    expect(describeSelectedSeats(seats, [1, 99])).toEqual({
      selectedSeatLabels: 'A1',
      seatLabelsPlural: false,
    })
  })
})
