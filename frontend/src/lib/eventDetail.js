export function remainingCapacity(event) {
  return event.capacity - event.reserved_count
}

export function describeSelectedSeats(seats, selectedSeatIds) {
  const selectedSeatLabels =
    seats && selectedSeatIds.length > 0
      ? selectedSeatIds
          .map((seatId) => seats.find((seat) => seat.id === seatId))
          .filter(Boolean)
          .map((seat) => `${seat.row}${seat.col}`)
          .join(', ')
      : ''
  return { selectedSeatLabels, seatLabelsPlural: selectedSeatLabels.includes(',') }
}
