import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Download, ArrowLeft, MapPin, Calendar, Users, Wallet, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import Header from '../components/Header'

interface PlanData {
  final_plan: string
  destination_info: string
  itinerary: string
  budget_estimate: string
  hotel_recommendations: string
  weather_info: string
}
interface TripInfo { destination: string; travel_dates: string; travelers: number; budget: string }

const SECTIONS = [
  { key: 'destination_info', icon: '🗺️', label: 'Destination Overview' },
  { key: 'itinerary', icon: '📅', label: 'Day-by-Day Itinerary' },
  { key: 'budget_estimate', icon: '💰', label: 'Budget Breakdown' },
  { key: 'hotel_recommendations', icon: '🏨', label: 'Where to Stay' },
  { key: 'weather_info', icon: '🌤️', label: 'Weather & Packing' },
]

function Section({ icon, label, content }: { icon: string; label: string; content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="liquid-glass rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 flex items-center justify-between text-left cursor-pointer border-none bg-transparent outline-none group">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-semibold text-white group-hover:text-white/80 transition-colors">{label}</span>
        </div>
        {open ? <ChevronUp size={15} className="text-white/40" /> : <ChevronDown size={15} className="text-white/40" />}
      </button>
      {open && (
        <div className="px-6 pb-5 border-t border-white/5">
          <div className="result-prose pt-4">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResultPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t) }, [])

  if (!state?.plan) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="text-center">
          <p className="text-white/50 mb-4">No travel guide found.</p>
          <button onClick={() => navigate('/plan')} className="bg-white text-black rounded-full px-6 py-3 text-sm font-medium cursor-pointer">
            Plan a Trip
          </button>
        </div>
      </div>
    )
  }

  const plan: PlanData = state.plan
  const trip: TripInfo = state.tripInfo

  const handleDownload = () => {
    const content = `Travel Guide: ${trip.destination}\nTravelers: ${trip.travelers} | Dates: ${trip.travel_dates} | Budget: ${trip.budget}\n${'='.repeat(70)}\n\n${plan.final_plan}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `travel_guide_${trip.destination.replace(/[^a-z0-9]/gi, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="fixed inset-0 z-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 70%)'
      }} />
      <Header />

      <main className={`relative z-10 max-w-2xl mx-auto px-6 pt-28 pb-20 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Back */}
        <button onClick={() => navigate('/plan')} className="flex items-center gap-2 text-white/35 hover:text-white/60 text-sm mb-8 transition-colors cursor-pointer bg-transparent border-none outline-none">
          <ArrowLeft size={14} /> Plan another trip
        </button>

        {/* Trip meta */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1.5 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium tracking-wide">Your guide is ready</span>
          </div>
          <h1 className="font-light tracking-tight mb-4" style={{ fontSize: 'clamp(28px,5vw,48px)', letterSpacing: '-0.03em' }}>
            {trip.destination}
          </h1>
          <div className="flex flex-wrap gap-3">
            {[
              { icon: <Calendar size={11} />, text: trip.travel_dates },
              { icon: <Users size={11} />, text: `${trip.travelers} traveler${trip.travelers > 1 ? 's' : ''}` },
              { icon: <Wallet size={11} />, text: trip.budget },
              { icon: <MapPin size={11} />, text: 'AI-crafted' },
            ].map(({ icon, text }) => (
              <span key={text} className="flex items-center gap-1.5 liquid-glass rounded-full px-3 py-1 text-white/60 text-xs">
                {icon} {text}
              </span>
            ))}
          </div>
        </div>

        {/* Full Guide */}
        <div className="liquid-glass rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold tracking-wide text-white/80">🗺️  Complete Travel Guide</h2>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 liquid-glass rounded-full px-3 py-1.5 text-white/60 hover:text-white text-xs transition-colors cursor-pointer border-none">
              <Download size={11} /> Download
            </button>
          </div>
          <div className="result-prose">
            <ReactMarkdown>{plan.final_plan}</ReactMarkdown>
          </div>
        </div>

        {/* Agent Reports */}
        <div className="mb-3">
          <p className="text-white/30 text-xs tracking-widest mb-3 px-1">AGENT REPORTS</p>
          <div className="space-y-2">
            {SECTIONS.map(s => {
              const content = plan[s.key as keyof PlanData]
              if (!content) return null
              return <Section key={s.key} icon={s.icon} label={s.label} content={content} />
            })}
          </div>
        </div>

        {/* Download CTA */}
        <div className="mt-10 text-center">
          <button onClick={handleDownload}
            className="bg-white text-black rounded-full px-8 py-3.5 font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_32px_4px_rgba(255,255,255,0.12)] cursor-pointer">
            Download Travel Guide
          </button>
          <p className="text-white/25 text-xs mt-4">Saved as a plain-text file you can read anywhere</p>
        </div>
      </main>
    </div>
  )
}
