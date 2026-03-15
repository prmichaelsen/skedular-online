import { useState, useCallback, useRef, useEffect, useMemo } from 'react'

// ── Types ──────────────────────────────────────────────────────────

export type CalendarPainterValue =
  | { mode: 'soonest' }
  | {
      mode: 'custom'
      windows: Array<{
        dayOfWeek: number
        startHour: number
        endHour: number
      }>
    }

interface CalendarPainterProps {
  value: CalendarPainterValue
  onChange: (value: CalendarPainterValue) => void
}

// ── Constants ──────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0] as const // Mon=1 … Sun=0
const START_HOUR = 7
const END_HOUR = 21 // exclusive — last row label is 20 (8 PM)
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i
)

function formatHour(h: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display} ${suffix}`
}

// ── Grid helpers ───────────────────────────────────────────────────

/** Build a flat Set<string> key "day-hour" from windows for O(1) lookup */
function windowsToSet(
  windows: Array<{ dayOfWeek: number; startHour: number; endHour: number }>
): Set<string> {
  const s = new Set<string>()
  for (const w of windows) {
    for (let h = w.startHour; h < w.endHour; h++) {
      s.add(`${w.dayOfWeek}-${h}`)
    }
  }
  return s
}

/** Collapse a Set<string> back into contiguous windows */
function setToWindows(
  s: Set<string>
): Array<{ dayOfWeek: number; startHour: number; endHour: number }> {
  // Group by day
  const byDay = new Map<number, number[]>()
  Array.from(s).forEach((key) => {
    const [d, h] = key.split('-').map(Number)
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(h)
  })

  const windows: Array<{
    dayOfWeek: number
    startHour: number
    endHour: number
  }> = []

  Array.from(byDay.entries()).forEach(([day, hours]) => {
    hours.sort((a, b) => a - b)
    let start = hours[0]
    let prev = hours[0]
    for (let i = 1; i < hours.length; i++) {
      if (hours[i] === prev + 1) {
        prev = hours[i]
      } else {
        windows.push({ dayOfWeek: day, startHour: start, endHour: prev + 1 })
        start = hours[i]
        prev = hours[i]
      }
    }
    windows.push({ dayOfWeek: day, startHour: start, endHour: prev + 1 })
  })

  // Sort for deterministic output
  windows.sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startHour - b.startHour
  )
  return windows
}

function cellKey(day: number, hour: number) {
  return `${day}-${hour}`
}

// ── Component ──────────────────────────────────────────────────────

export function CalendarPainter({ value, onChange }: CalendarPainterProps) {
  const isSoonest = value.mode === 'soonest'

  // Derived selected-cell set (only meaningful in custom mode)
  const selected = useMemo(
    () => (value.mode === 'custom' ? windowsToSet(value.windows) : new Set<string>()),
    [value]
  )

  // Paint state
  const paintingRef = useRef(false)
  const paintModeRef = useRef<'add' | 'remove'>('add')
  // Track which cells were affected during the current drag so we can batch
  const dragCellsRef = useRef(new Set<string>())

  // For keyboard focus tracking
  const [focusDay, setFocusDay] = useState(0)
  const [focusHour, setFocusHour] = useState(START_HOUR)
  const gridRef = useRef<HTMLDivElement>(null)

  // Mobile: currently displayed day index into DAY_INDICES
  const [mobileDayIdx, setMobileDayIdx] = useState(0)

  // ── Helpers ────────────────────────────────────────────────────

  const commitSet = useCallback(
    (next: Set<string>) => {
      onChange({ mode: 'custom', windows: setToWindows(next) })
    },
    [onChange]
  )

  const toggleCell = useCallback(
    (day: number, hour: number, mode: 'add' | 'remove') => {
      const key = cellKey(day, hour)
      const next = new Set(selected)
      if (mode === 'add') {
        next.add(key)
      } else {
        next.delete(key)
      }
      commitSet(next)
    },
    [selected, commitSet]
  )

  // ── Pointer (mouse + touch) handlers ──────────────────────────

  const handleCellPointerDown = useCallback(
    (day: number, hour: number) => {
      if (isSoonest) return
      paintingRef.current = true
      const key = cellKey(day, hour)
      paintModeRef.current = selected.has(key) ? 'remove' : 'add'
      dragCellsRef.current = new Set<string>()
      toggleCell(day, hour, paintModeRef.current)
      dragCellsRef.current.add(key)
    },
    [isSoonest, selected, toggleCell]
  )

  const handleCellPointerEnter = useCallback(
    (day: number, hour: number) => {
      if (!paintingRef.current || isSoonest) return
      const key = cellKey(day, hour)
      if (dragCellsRef.current.has(key)) return
      dragCellsRef.current.add(key)
      toggleCell(day, hour, paintModeRef.current)
    },
    [isSoonest, toggleCell]
  )

  // Global pointer-up to end painting
  useEffect(() => {
    const handleUp = () => {
      paintingRef.current = false
      dragCellsRef.current = new Set()
    }
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [])

  // ── Column/row header toggles ─────────────────────────────────

  const toggleDay = useCallback(
    (day: number) => {
      if (isSoonest) return
      const next = new Set(selected)
      const allSelected = HOURS.every((h) => next.has(cellKey(day, h)))
      for (const h of HOURS) {
        const key = cellKey(day, h)
        if (allSelected) {
          next.delete(key)
        } else {
          next.add(key)
        }
      }
      commitSet(next)
    },
    [isSoonest, selected, commitSet]
  )

  const toggleHour = useCallback(
    (hour: number) => {
      if (isSoonest) return
      const next = new Set(selected)
      const allSelected = DAY_INDICES.every((d) =>
        next.has(cellKey(d, hour))
      )
      for (const d of DAY_INDICES) {
        const key = cellKey(d, hour)
        if (allSelected) {
          next.delete(key)
        } else {
          next.add(key)
        }
      }
      commitSet(next)
    },
    [isSoonest, selected, commitSet]
  )

  // ── Keyboard navigation ───────────────────────────────────────

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSoonest) return

      const dayIdx = DAY_INDICES.indexOf(focusDay as (typeof DAY_INDICES)[number])
      let nextDayIdx = dayIdx
      let nextHour = focusHour

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          nextDayIdx = Math.min(dayIdx + 1, DAY_INDICES.length - 1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          nextDayIdx = Math.max(dayIdx - 1, 0)
          break
        case 'ArrowDown':
          e.preventDefault()
          nextHour = Math.min(focusHour + 1, END_HOUR - 1)
          break
        case 'ArrowUp':
          e.preventDefault()
          nextHour = Math.max(focusHour - 1, START_HOUR)
          break
        case ' ':
        case 'Enter':
          e.preventDefault()
          {
            const key = cellKey(focusDay, focusHour)
            toggleCell(
              focusDay,
              focusHour,
              selected.has(key) ? 'remove' : 'add'
            )
          }
          return
        default:
          return
      }

      setFocusDay(DAY_INDICES[nextDayIdx])
      setFocusHour(nextHour)

      // Move DOM focus to the new cell
      const cell = gridRef.current?.querySelector(
        `[data-cell="${cellKey(DAY_INDICES[nextDayIdx], nextHour)}"]`
      ) as HTMLElement | null
      cell?.focus()
    },
    [isSoonest, focusDay, focusHour, selected, toggleCell]
  )

  // ── Soonest toggle ────────────────────────────────────────────

  const handleSoonestToggle = useCallback(() => {
    if (isSoonest) {
      // Switch to custom — start with empty grid
      onChange({ mode: 'custom', windows: [] })
    } else {
      onChange({ mode: 'soonest' })
    }
  }, [isSoonest, onChange])

  // ── Cell renderer ─────────────────────────────────────────────

  const renderCell = (day: number, hour: number) => {
    const key = cellKey(day, hour)
    const active = selected.has(key)
    const isFocused = focusDay === day && focusHour === hour

    return (
      <div
        key={key}
        data-cell={key}
        role="gridcell"
        tabIndex={isFocused ? 0 : -1}
        aria-selected={active}
        aria-label={`${DAYS[DAY_INDICES.indexOf(day as (typeof DAY_INDICES)[number])]} ${formatHour(hour)}`}
        className={`
          h-8 border select-none cursor-pointer transition-colors
          ${
            active
              ? 'bg-primary/20 border-primary'
              : 'bg-bg-card border-border-default hover:bg-surface/50'
          }
          focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary
        `}
        onPointerDown={(e) => {
          e.preventDefault() // prevent text selection during drag
          handleCellPointerDown(day, hour)
        }}
        onPointerEnter={() => handleCellPointerEnter(day, hour)}
        onFocus={() => {
          setFocusDay(day)
          setFocusHour(hour)
        }}
      />
    )
  }

  // ── Desktop grid (md+) ────────────────────────────────────────

  const desktopGrid = (
    <div className="hidden md:block">
      <div
        ref={gridRef}
        role="grid"
        aria-label="Weekly availability grid"
        onKeyDown={handleGridKeyDown}
        className="select-none"
        style={{ touchAction: 'none' }}
      >
        {/* Day headers row */}
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] gap-0">
          {/* Top-left corner spacer */}
          <div className="h-8" />
          {DAYS.map((day, i) => {
            const dayIdx = DAY_INDICES[i]
            const allSelected = HOURS.every((h) =>
              selected.has(cellKey(dayIdx, h))
            )
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(dayIdx)}
                className={`
                  h-8 text-xs font-medium flex items-center justify-center
                  border border-border-default cursor-pointer transition-colors
                  ${
                    allSelected
                      ? 'bg-primary/20 text-primary border-primary'
                      : 'bg-bg-elevated text-text-secondary hover:bg-surface/50'
                  }
                `}
                aria-label={`Toggle all ${day} slots`}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Time rows */}
        {HOURS.map((hour) => {
          const allSelected = DAY_INDICES.every((d) =>
            selected.has(cellKey(d, hour))
          )
          return (
            <div
              key={hour}
              className="grid grid-cols-[3.5rem_repeat(7,1fr)] gap-0"
              role="row"
            >
              {/* Hour header */}
              <button
                type="button"
                onClick={() => toggleHour(hour)}
                className={`
                  h-8 text-[0.65rem] leading-none font-medium flex items-center justify-end pr-2
                  border border-border-default cursor-pointer transition-colors
                  ${
                    allSelected
                      ? 'bg-primary/20 text-primary border-primary'
                      : 'bg-bg-elevated text-text-muted hover:bg-surface/50'
                  }
                `}
                aria-label={`Toggle all ${formatHour(hour)} slots`}
              >
                {formatHour(hour)}
              </button>

              {/* Day cells */}
              {DAY_INDICES.map((dayIdx) => renderCell(dayIdx, hour))}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Mobile day-at-a-time view (<md) ───────────────────────────

  const mobileView = (
    <div className="block md:hidden">
      {/* Day tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {DAYS.map((day, i) => {
          const active = mobileDayIdx === i
          return (
            <button
              key={day}
              type="button"
              onClick={() => setMobileDayIdx(i)}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${
                  active
                    ? 'bg-primary text-white'
                    : 'bg-bg-elevated text-text-secondary hover:bg-surface/50'
                }
              `}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Single day column */}
      <div
        role="grid"
        aria-label={`${DAYS[mobileDayIdx]} availability`}
        onKeyDown={handleGridKeyDown}
        style={{ touchAction: 'none' }}
      >
        {HOURS.map((hour) => {
          const dayIdx = DAY_INDICES[mobileDayIdx]
          const key = cellKey(dayIdx, hour)
          const isActive = selected.has(key)

          return (
            <div
              key={hour}
              className="grid grid-cols-[3.5rem_1fr] gap-0"
              role="row"
            >
              {/* Hour label */}
              <div className="h-10 text-[0.65rem] font-medium flex items-center justify-end pr-2 text-text-muted border border-border-default bg-bg-elevated">
                {formatHour(hour)}
              </div>
              {/* Cell */}
              <div
                data-cell={key}
                role="gridcell"
                tabIndex={
                  focusDay === dayIdx && focusHour === hour ? 0 : -1
                }
                aria-selected={isActive}
                aria-label={`${DAYS[mobileDayIdx]} ${formatHour(hour)}`}
                className={`
                  h-10 border select-none cursor-pointer transition-colors flex items-center pl-3 text-xs
                  ${
                    isActive
                      ? 'bg-primary/20 border-primary text-primary font-medium'
                      : 'bg-bg-card border-border-default text-text-muted hover:bg-surface/50'
                  }
                  focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary
                `}
                onPointerDown={(e) => {
                  e.preventDefault()
                  handleCellPointerDown(dayIdx, hour)
                }}
                onPointerEnter={() =>
                  handleCellPointerEnter(dayIdx, hour)
                }
                onFocus={() => {
                  setFocusDay(dayIdx)
                  setFocusHour(hour)
                }}
              >
                {isActive ? 'Available' : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Mode selector buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            if (isSoonest) onChange({ mode: 'custom', windows: [] })
          }}
          className={`
            flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border
            ${
              !isSoonest
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-bg-card border-border-default text-text-secondary hover:bg-surface/50'
            }
          `}
          aria-pressed={!isSoonest}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Select availability
        </button>
        <button
          type="button"
          onClick={handleSoonestToggle}
          className={`
            flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border
            ${
              isSoonest
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-bg-card border-border-default text-text-secondary hover:bg-surface/50'
            }
          `}
          aria-pressed={isSoonest}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          I'm flexible
        </button>
      </div>

      {/* Grid (shown when in custom mode) */}
      {!isSoonest && (
        <>
          <p className="text-xs text-text-muted">
            Click and drag to paint your available times. Click a day or
            time header to select the entire column or row.
          </p>
          {desktopGrid}
          {mobileView}
        </>
      )}
    </div>
  )
}
