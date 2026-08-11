import './SeatMap.css'

function groupByRow(seats) {
  const map = new Map()
  for (const seat of seats) {
    if (!map.has(seat.row)) map.set(seat.row, [])
    map.get(seat.row).push(seat)
  }
  return [...map.entries()]
}

export function SeatMap({ seats, selected, onToggle }) {
  const rows = groupByRow(seats)

  function renderSeat(seat) {
    const isSelected = selected.includes(seat.id)
    const isReserved = seat.status !== 'available'
    return (
      <button
        key={seat.id}
        type="button"
        className={[
          'seat-map__seat',
          isSelected && 'seat-map__seat--selected',
          isReserved && 'seat-map__seat--reserved',
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={isReserved}
        onClick={() => onToggle(seat.id)}
        aria-pressed={isSelected}
        aria-label={`Assento ${seat.row}${seat.col}`}
      >
        {seat.col}
      </button>
    )
  }

  return (
    <div className="seat-map">
      <div className="seat-map__screen-wrap" aria-hidden="true">
        <div className="seat-map__screen" />
      </div>
      <p className="seat-map__screen-label">Tela</p>

      <div className="seat-map__grid">
        {rows.map(([row, rowSeats]) => {
          const mid = Math.ceil(rowSeats.length / 2)
          const left = rowSeats.slice(0, mid)
          const right = rowSeats.slice(mid)
          return (
            <div className="seat-map__row" key={row}>
              <span className="seat-map__row-label">{row}</span>
              <div className="seat-map__block">{left.map(renderSeat)}</div>
              <div className="seat-map__aisle" aria-hidden="true" />
              <div className="seat-map__block">{right.map(renderSeat)}</div>
            </div>
          )
        })}
      </div>

      <div className="seat-map__legend">
        <span>
          <i className="seat-map__swatch seat-map__swatch--available" /> Disponível
        </span>
        <span>
          <i className="seat-map__swatch seat-map__swatch--selected" /> Selecionado
        </span>
        <span>
          <i className="seat-map__swatch seat-map__swatch--reserved" /> Ocupado
        </span>
      </div>
    </div>
  )
}
