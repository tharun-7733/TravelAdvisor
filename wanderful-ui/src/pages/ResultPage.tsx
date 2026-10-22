import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import Header from '../components/Header'

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface ResultData {
  final_plan: string
  destination?: string
  travel_dates?: string
  travelers?: number
  budget?: string
  destination_info?: string
  itinerary?: string
  budget_estimate?: string
  hotel_recommendations?: string
  weather_info?: string
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function splitSections(md: string) {
  const lines = md.split('\n')
  const sections: { heading: string; content: string[] }[] = []
  let current: { heading: string; content: string[] } | null = null
  for (const line of lines) {
    if (/^#{1,3} /.test(line)) {
      if (current) sections.push(current)
      current = { heading: line.replace(/^#{1,3} /, '').trim(), content: [] }
    } else if (current) {
      current.content.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

function extractDestination(md: string): string {
  const match = md.match(/^#+ (.+)/m)
  return match ? match[1].replace(/[*_`]/g, '').trim() : ''
}

// Pull bullet list items from a markdown block
function bullets(text: string): string[] {
  return text
    .split('\n')
    .filter(l => /^[-*•]/.test(l.trim()))
    .map(l => l.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
}

type ItineraryRow = {
  day: string
  baseCity: string
  morning: string
  afternoon: string
  evening: string
  hotel: string
}

function parseItineraryTable(text: string): ItineraryRow[] {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.startsWith('|'))
  if (lines.length < 3) return []

  const cells = (line: string) => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim().replace(/\\\|/g, '|').replace(/\*\*/g, '').replace(/^`|`$/g, ''))
  const header = cells(lines[0]).map(cell => cell.toLowerCase())
  if (!header.some(cell => cell.includes('day')) || !header.some(cell => cell.includes('morning'))) return []
  const column = (...keys: string[]) => header.findIndex(cell => keys.some(key => cell.includes(key)))
  const indexes = {
    day: column('day'),
    baseCity: column('base city', 'city'),
    morning: column('morning'),
    afternoon: column('afternoon'),
    evening: column('evening'),
    hotel: column('hotel', 'nightly rate', 'accommodation'),
  }
  return lines.slice(2).map(line => {
    const row = cells(line)
    const value = (index: number) => index >= 0 ? (row[index] || '').trim() : ''
    return {
      day: value(indexes.day),
      baseCity: value(indexes.baseCity),
      morning: value(indexes.morning),
      afternoon: value(indexes.afternoon),
      evening: value(indexes.evening),
      hotel: value(indexes.hotel),
    }
  }).filter(row => row.day)
}

// Symbols for time-of-day labels
const TIME_SYMBOLS: Record<string, string> = {
  morning: '△',
  afternoon: '□',
  evening: '○',
  night: '◇',
}
function timeSymbol(label: string) {
  const key = label.toLowerCase()
  for (const [k, v] of Object.entries(TIME_SYMBOLS)) {
    if (key.includes(k)) return v
  }
  return '·'
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function SectionCard({ id, title, sub, children }: {
  id: string; title: string; sub?: string; children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="py-12 border-t scroll-mt-[132px]"
      style={{ borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <h2
        className="font-semibold mb-1"
        style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 'clamp(22px,3.5vw,28px)', letterSpacing: '-0.01em', color: '#f2efe8' }}
      >
        {title}
      </h2>
      {sub && <p className="mb-5 text-sm" style={{ color: '#9d998d' }}>{sub}</p>}
      {children}
    </section>
  )
}

function VibeCard({ sym, title, desc }: { sym: string; title: string; desc: string }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: '#151517', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl text-lg font-bold"
        style={{ background: 'rgba(255,106,82,0.12)', color: '#ff6a52' }}
      >
        {sym}
      </div>
      <div>
        <h3 className="font-semibold text-sm mb-1" style={{ color: '#f2efe8' }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: '#9d998d' }}>{desc}</p>
      </div>
    </div>
  )
}

function TimelineItem({ label, text }: { label: string; text: string }) {
  return (
    <li
      className="relative rounded-2xl p-4 mb-3"
      style={{ background: '#151517', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="text-xs font-semibold mb-1" style={{ color: '#e0b25a' }}>
        {timeSymbol(label)} {label}
      </div>
      <p className="text-sm leading-relaxed m-0" style={{ color: 'rgba(242,239,232,0.8)' }}>{text}</p>
    </li>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state as ResultData | null
  const [activeSection, setActiveSection] = useState('overview')
  const [copied, setCopied] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  if (!data || !data.final_plan) {
    return <Navigate to="/plan" replace />
  }

  const md = data.final_plan
  const destination = data.destination || extractDestination(md)
  const sections = splitSections(md)

  // Map sections roughly by heading keywords
  const find = (...keys: string[]) =>
    sections.find(s => keys.some(k => s.heading.toLowerCase().includes(k)))

  const overviewSec = sections[0]
  const highlightSec = find('highlight', 'vibe', 'neighborhood', 'neighbourhood', 'overview')
  const itinerarySec = find('itinerary', 'day', 'schedule')
  const itineraryRows = parseItineraryTable(itinerarySec?.content.join('\n') || '')
  const hotelSec = find('hotel', 'stay', 'accommodation', 'lodging', 'where to stay')
  const budgetSec = find('budget', 'cost', 'spending', 'expense')
  const weatherSec = find('weather', 'pack', 'what to bring', 'climate')

  const NAV_ITEMS = [
    { id: 'overview', label: 'Overview' },
    { id: 'highlights', label: 'Highlights' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'stay', label: 'Stay' },
    { id: 'budget', label: 'Budget' },
    { id: 'pack', label: 'Pack' },
  ]

  // Intersection observer for sticky nav highlight
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) setActiveSection(e.target.id)
        })
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  // Parse itinerary days from section content
  const parseDays = (sec: { heading: string; content: string[] } | undefined) => {
    if (!sec) return []
    const raw = sec.content.join('\n')
    const dayBlocks = raw.split(/\n(?=#{1,4} Day\b|\n\*\*Day\b|\n- \*\*Day\b)/i)
    if (dayBlocks.length > 1) {
      return dayBlocks.map(block => {
        const lines = block.trim().split('\n')
        const title = lines[0].replace(/^[#\-*\s]+/, '').replace(/\*\*/g, '').trim()
        const slots: { label: string; text: string }[] = []
        let curLabel = ''
        let curText: string[] = []
        for (const line of lines.slice(1)) {
          const slotMatch = line.match(/^[-*]?\s*\*{0,2}(Morning|Afternoon|Evening|Night)\*{0,2}[:\s]+(.*)/i)
          if (slotMatch) {
            if (curLabel && curText.length) slots.push({ label: curLabel, text: curText.join(' ') })
            curLabel = slotMatch[1]
            curText = [slotMatch[2].replace(/\*\*/g, '').trim()]
          } else if (curLabel && line.trim()) {
            curText.push(line.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').trim())
          }
        }
        if (curLabel && curText.length) slots.push({ label: curLabel, text: curText.join(' ') })
        return { title, slots }
      }).filter(d => d.title)
    }
    // Fallback: treat bullet lines as a single day
    const items = bullets(raw)
    if (items.length) return [{ title: sec.heading, slots: items.map(i => ({ label: '', text: i })) }]
    return []
  }

  const days = parseDays(itinerarySec)
  const [activeDay, setActiveDay] = useState(0)

  // Parse hotel options
  const parseHotels = (sec: { heading: string; content: string[] } | undefined) => {
    if (!sec) return []
    const raw = sec.content.join('\n')
    const nameRx = /\*\*(.+?)\*\*/g
    const hotels: { name: string; details: string }[] = []
    let match
    while ((match = nameRx.exec(raw)) !== null) {
      const after = raw.slice(match.index + match[0].length, match.index + match[0].length + 200)
      hotels.push({ name: match[1], details: after.replace(/[:\-–]/,'').trim().split('\n')[0].replace(/\*\*/g,'') })
    }
    return hotels.slice(0, 4)
  }

  const hotels = parseHotels(hotelSec)
  const [selectedHotel, setSelectedHotel] = useState(0)

  // Packing list
  const packItems = weatherSec ? bullets(weatherSec.content.join('\n')) : []

  // Overview chips
  const itineraryDayCount = (data.itinerary?.match(/day \d+/gi) || []).length
    || sections.filter(s => s.heading.toLowerCase().includes('day')).length
  const chipInfo = [
    itineraryDayCount > 0 ? `${itineraryDayCount} days` : null,
    data.budget ? data.budget.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null,
    data.travelers ? `${data.travelers} traveler${data.travelers === 1 ? '' : 's'}` : null,
    destination,
  ].filter(Boolean) as string[]

  const lede = overviewSec?.content.filter(l => l.trim() && !l.startsWith('#')).slice(0, 2).join(' ').replace(/\*\*/g, '') || ''

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0b', color: '#f2efe8', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header />

      {/* ── Sticky section nav ─────────────────────────────────────────── */}
      <div
        className="fixed z-40 left-0 right-0 border-b"
        style={{ top: '72px', background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(14px)', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-0.5 overflow-x-auto" style={{ height: '48px', scrollbarWidth: 'none' }}>
          {NAV_ITEMS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                color: activeSection === id ? '#ff6a52' : '#9d998d',
                background: activeSection === id ? 'rgba(255,106,82,0.12)' : 'transparent',
                fontWeight: activeSection === id ? 600 : 400,
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      <main ref={mainRef} className="max-w-4xl mx-auto w-full px-4 pb-24" style={{ paddingTop: '136px' }}>

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => navigate('/plan')}
            className="flex items-center gap-2 text-xs font-medium transition-colors"
            style={{ color: '#9d998d' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f2efe8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9d998d')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Plan another trip
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f2efe8' }}
          >
            {copied ? <Check className="w-3.5 h-3.5" style={{ color: '#58c79a' }} /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy guide'}
          </button>
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        <div id="overview" className="pb-12 scroll-mt-[132px]">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#9d998d', letterSpacing: '0.12em' }}>
            Your custom travel guide
          </p>
          <h1
            className="font-semibold mb-5"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 'clamp(42px,8vw,72px)', lineHeight: 1.02, letterSpacing: '-0.02em', color: '#f2efe8' }}
          >
            {destination}
          </h1>
          <div className="flex flex-wrap gap-2 mb-6">
            {chipInfo.map((chip, i) => (
              <span
                key={i}
                className="rounded-full px-4 py-1.5 text-sm font-medium"
                style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f2efe8' }}
              >
                {chip}
              </span>
            ))}
          </div>
          {lede && (
            <p className="max-w-2xl leading-relaxed" style={{ color: '#9d998d', fontSize: '17px' }}>
              {lede}
            </p>
          )}
        </div>

        {/* ── HIGHLIGHTS ────────────────────────────────────────────────── */}
        <SectionCard id="highlights" title="Highlights & neighbourhood vibe" sub="What the trip feels like, in three moods.">
          {highlightSec ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              {(() => {
                const raw = highlightSec.content.join('\n')
                const items = raw.split(/\n(?=[-*]|\d\.|\*\*)/).filter(Boolean).slice(0, 6)
                const symbols = ['⬡', '◈', '◉', '◇', '△', '□']
                return items.map((item, i) => {
                  const clean = item.replace(/^[-*\d.]\s*/, '').replace(/\*\*/g, '').trim()
                  const colonIdx = clean.indexOf(':')
                  const title = colonIdx > 0 ? clean.slice(0, colonIdx).trim() : clean.slice(0, 32)
                  const desc = colonIdx > 0 ? clean.slice(colonIdx + 1).trim() : clean
                  return <VibeCard key={i} sym={symbols[i] || '·'} title={title} desc={desc} />
                })
              })()}
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              {[
                { sym: '⬡', title: 'Cultural Heart', desc: 'Historic temples, imperial gardens, and storied shrines in morning silence.' },
                { sym: '◈', title: 'Hidden Alleyways', desc: 'Narrow lanes for hand-drip coffee, antiquarian bookshops, and teahouses.' },
                { sym: '◉', title: 'Cuisine & Nightlife', desc: 'Counter-seat izakayas where locals linger over small plates and cold sake.' },
              ].map((v, i) => <VibeCard key={i} {...v} />)}
            </div>
          )}
        </SectionCard>

        {/* ── ITINERARY ─────────────────────────────────────────────────── */}
        <SectionCard id="itinerary" title="Day-by-day" sub="Pick a day to see how it flows.">
          {itineraryRows.length > 0 ? (
            <div className="space-y-4">
              <div className="hidden lg:block overflow-x-auto rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <table className="w-full min-w-[1050px] border-collapse text-left">
                  <thead style={{ background: '#151517' }}>
                    <tr>
                      {['Day', 'Base city', 'Morning', 'Afternoon', 'Evening', 'Luxury hotel · nightly rate'].map(label => (
                        <th key={label} className="px-4 py-3 text-[10px] uppercase tracking-[0.12em] font-semibold align-top" style={{ color: '#9d998d', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itineraryRows.map((row, index) => (
                      <tr key={`${row.day}-${index}`} style={{ background: index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                        <th scope="row" className="px-4 py-4 text-sm font-semibold whitespace-nowrap align-top" style={{ color: '#ff9a83', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.day}</th>
                        <td className="px-4 py-4 text-sm font-medium align-top" style={{ color: '#f2efe8', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.baseCity || '—'}</td>
                        {[row.morning, row.afternoon, row.evening, row.hotel].map((value, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-4 text-sm leading-relaxed align-top" style={{ color: 'rgba(242,239,232,0.78)', borderBottom: '1px solid rgba(255,255,255,0.06)', minWidth: cellIndex === 3 ? '220px' : '190px' }}>{value || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
                {itineraryRows.map((row, index) => (
                  <article key={`${row.day}-card-${index}`} className="rounded-2xl p-5 space-y-4" style={{ background: '#151517', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="m-0 text-base font-semibold" style={{ color: '#f2efe8' }}>{row.day}</h3>
                      {row.baseCity && <span className="rounded-full px-2.5 py-1 text-[11px] text-right" style={{ color: '#ff9a83', background: 'rgba(255,106,82,0.1)' }}>{row.baseCity}</span>}
                    </div>
                    {([['Morning', row.morning], ['Afternoon', row.afternoon], ['Evening', row.evening], ['Hotel', row.hotel]] as const).filter(([, value]) => value).map(([label, value]) => (
                      <div key={label}>
                        <p className="mb-1 text-[10px] uppercase tracking-[0.12em]" style={{ color: '#9d998d' }}>{label}</p>
                        <p className="m-0 text-sm leading-relaxed" style={{ color: 'rgba(242,239,232,0.82)' }}>{value}</p>
                      </div>
                    ))}
                  </article>
                ))}
              </div>
            </div>
          ) : days.length > 0 ? (
            <>
              {/* Day tabs */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {days.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDay(i)}
                    className="flex-shrink-0 text-left rounded-2xl px-4 py-3 transition-all"
                    style={{
                      minWidth: '140px',
                      border: activeDay === i ? '1px solid #ff6a52' : '1px solid rgba(255,255,255,0.07)',
                      background: activeDay === i ? 'rgba(255,106,82,0.1)' : '#151517',
                    }}
                  >
                    <span className="block text-xs mb-0.5" style={{ color: '#9d998d' }}>Day {i + 1}</span>
                    <strong className="text-sm font-semibold leading-tight" style={{ color: '#f2efe8' }}>{d.title}</strong>
                  </button>
                ))}
              </div>
              {/* Timeline */}
              <ul
                className="m-0 list-none relative"
                style={{ padding: '0 0 0 22px' }}
              >
                <li
                  className="absolute"
                  style={{ left: '7px', top: '10px', bottom: '10px', width: '2px', background: 'rgba(255,255,255,0.07)' }}
                  aria-hidden
                />
                {days[activeDay]?.slots.map((slot, i) => (
                  <li key={i} className="relative" style={{ listStyle: 'none' }}>
                    <div
                      className="absolute rounded-full"
                      style={{ left: '-21px', top: '22px', width: '12px', height: '12px', background: '#ff6a52', border: '3px solid #0a0a0b' }}
                    />
                    <TimelineItem label={slot.label || `Stop ${i + 1}`} text={slot.text} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="rounded-2xl p-6" style={{ background: '#151517', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-sm leading-relaxed" style={{ color: '#9d998d' }}>
                {itinerarySec?.content.join('\n').replace(/\*\*/g, '') || 'Your day-by-day itinerary will appear here.'}
              </p>
            </div>
          )}
        </SectionCard>

        {/* ── WHERE TO STAY ─────────────────────────────────────────────── */}
        <SectionCard id="stay" title="Where to stay" sub="A curated selection matched to your style.">
          {hotels.length > 0 ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              {hotels.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedHotel(i)}
                  className="text-left rounded-2xl p-5 flex flex-col gap-2 transition-all"
                  style={{
                    border: selectedHotel === i ? '1px solid #ff6a52' : '1px solid rgba(255,255,255,0.07)',
                    background: selectedHotel === i ? 'rgba(255,106,82,0.07)' : '#151517',
                    boxShadow: selectedHotel === i ? '0 0 0 1px #ff6a52' : 'none',
                  }}
                >
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full self-start"
                    style={{
                      background: selectedHotel === i ? 'rgba(255,106,82,0.15)' : 'rgba(255,255,255,0.05)',
                      color: selectedHotel === i ? '#ff6a52' : '#9d998d',
                    }}
                  >
                    {selectedHotel === i ? '✔ Selected' : `Option ${i + 1}`}
                  </span>
                  <h3 className="text-base font-semibold m-0" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#f2efe8' }}>{h.name}</h3>
                  <p className="text-sm m-0 leading-relaxed" style={{ color: '#9d998d' }}>{h.details || 'Premium accommodation in a prime location.'}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl p-6" style={{ background: '#151517', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-sm" style={{ color: '#9d998d' }}>
                {hotelSec?.content.join('\n').replace(/\*\*/g, '') || 'Hotel recommendations will appear here.'}
              </p>
            </div>
          )}
        </SectionCard>

        {/* ── BUDGET ────────────────────────────────────────────────────── */}
        <SectionCard id="budget" title="Budget & spending" sub="A rough cost breakdown to help you plan.">
          <div className="rounded-2xl p-6" style={{ background: '#151517', border: '1px solid rgba(255,255,255,0.07)' }}>
            {budgetSec ? (
              <div className="flex flex-col gap-3">
                {budgetSec.content
                  .filter(l => l.trim() && !l.startsWith('#'))
                  .slice(0, 12)
                  .map((line, i) => {
                    const clean = line.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').trim()
                    if (!clean) return null
                    const colonIdx = clean.indexOf(':')
                    if (colonIdx > 0) {
                      const label = clean.slice(0, colonIdx).trim()
                      const value = clean.slice(colonIdx + 1).trim()
                      return (
                        <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span className="text-sm" style={{ color: '#9d998d' }}>{label}</span>
                          <span className="text-sm font-semibold" style={{ color: '#f2efe8' }}>{value}</span>
                        </div>
                      )
                    }
                    return (
                      <p key={i} className="text-sm leading-relaxed" style={{ color: '#9d998d' }}>{clean}</p>
                    )
                  })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#9d998d' }}>Budget breakdown will appear here based on your trip details.</p>
            )}
            {/* Tip */}
            <div className="mt-5 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(255,106,82,0.1)', color: 'rgba(242,239,232,0.85)' }}>
              <b style={{ color: '#ff6a52' }}>▸ Tip:</b> Tap-to-pay via mobile or a contactless card is widely accepted in most destinations.
            </div>
          </div>
        </SectionCard>

        {/* ── WEATHER & PACK ────────────────────────────────────────────── */}
        <SectionCard id="pack" title="Weather & what to pack" sub="Check items off as you pack.">
          {/* Weather cards */}
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <VibeCard sym="◈" title="Conditions" desc={
              weatherSec?.content.filter(l => !l.startsWith('-') && !l.startsWith('*') && l.trim()).slice(0, 1)[0]?.replace(/\*\*/g,'').trim()
              || 'Check local forecasts before departure for the most accurate conditions.'
            } />
            <VibeCard sym="□" title="What to pack" desc="Comfortable walking shoes, versatile layers, a compact umbrella, and a light jacket for evenings." />
          </div>

          {/* Pack checklist */}
          {packItems.length > 0 ? (
            <PackList items={packItems} />
          ) : (
            <PackList items={[
              'Comfortable walking shoes',
              'Breathable merino layers',
              'Compact travel umbrella',
              'Sunglasses',
              'Light down jacket',
              'Universal power adapter',
              'Pocket Wi-Fi or SIM card',
            ]} />
          )}
        </SectionCard>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <footer className="pt-10 pb-4 text-center text-sm" style={{ color: '#9d998d' }}>
          Safe travels — {destination} awaits. ☆
        </footer>
      </main>
    </div>
  )
}

/* ─── Pack checklist with local-storage persistence ─────────────────────── */
function PackList({ items }: { items: string[] }) {
  const storageKey = 'voyaura-pack-react'
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}') } catch { return {} }
  })

  const toggle = (i: number) => {
    const next = { ...checked, [i]: !checked[i] }
    setChecked(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }

  const doneCount = Object.values(checked).filter(Boolean).length
  const pct = items.length ? (doneCount / items.length) * 100 : 0

  return (
    <>
      {/* Progress bar */}
      <div className="mb-4 rounded-full overflow-hidden" style={{ height: '6px', background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: '#58c79a' }}
        />
      </div>
      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i}>
            <label
              className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all"
              style={{ background: '#151517', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={() => toggle(i)}
                className="w-4 h-4 rounded"
                style={{ accentColor: '#ff6a52' }}
              />
              <span
                className="text-sm"
                style={{ color: checked[i] ? '#9d998d' : '#f2efe8', textDecoration: checked[i] ? 'line-through' : 'none' }}
              >
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </>
  )
}
