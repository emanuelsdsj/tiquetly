import { useEffect, useRef, useState } from 'react'
import { EventCard } from './EventCard'
import { useLocale } from '../context/LocaleContext'
import './FeaturedCarousel.css'

const AUTOPLAY_MS = 5000
const ITEM_WIDTH = 280
const GAP = 24
const SLOT = ITEM_WIDTH + GAP

export function FeaturedCarousel({ events }) {
  const { t } = useLocale()
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = events.length

  useEffect(() => {
    if (paused || count < 2) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % count)
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [paused, count])

  const goTo = (index) => setActiveIndex((index + count) % count)

  const touchStart = useRef(null)
  const onTouchStart = (event) => {
    touchStart.current = event.touches[0].clientX
  }
  const onTouchEnd = (event) => {
    if (touchStart.current === null) return
    const delta = event.changedTouches[0].clientX - touchStart.current
    if (delta > 40) goTo(activeIndex - 1)
    else if (delta < -40) goTo(activeIndex + 1)
    touchStart.current = null
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') goTo(activeIndex - 1)
    else if (event.key === 'ArrowRight') goTo(activeIndex + 1)
  }

  if (count === 0) return null

  return (
    <div
      className="featured-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      <div
        className="featured-carousel__viewport"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="featured-carousel__track"
          style={{ transform: `translateX(calc(50% - ${activeIndex * SLOT + ITEM_WIDTH / 2}px))` }}
        >
          {events.map((event, index) => {
            const distance = Math.abs(index - activeIndex)
            const isActive = distance === 0
            return (
              <div
                key={event.id}
                className={`featured-carousel__item ${isActive ? 'featured-carousel__item--active' : ''}`}
                style={{
                  transform: `scale(${isActive ? 1 : distance === 1 ? 0.88 : 0.8})`,
                  opacity: isActive ? 1 : distance === 1 ? 0.65 : 0.32,
                  zIndex: isActive ? 2 : distance === 1 ? 1 : 0,
                }}
              >
                <EventCard event={event} />
              </div>
            )
          })}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className="featured-carousel__arrow featured-carousel__arrow--prev"
            onClick={() => goTo(activeIndex - 1)}
            aria-label={t('browse.featuredPrev')}
          >
            ‹
          </button>
          <button
            type="button"
            className="featured-carousel__arrow featured-carousel__arrow--next"
            onClick={() => goTo(activeIndex + 1)}
            aria-label={t('browse.featuredNext')}
          >
            ›
          </button>
          <div
            className="featured-carousel__dots"
            role="tablist"
            aria-label={t('browse.featuredDotsAriaLabel')}
          >
            {events.map((event, index) => (
              <button
                key={event.id}
                type="button"
                role="tab"
                className={`featured-carousel__dot ${index === activeIndex ? 'featured-carousel__dot--active' : ''}`}
                aria-selected={index === activeIndex}
                aria-label={t('browse.featuredGoToSlide', { position: index + 1 })}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
