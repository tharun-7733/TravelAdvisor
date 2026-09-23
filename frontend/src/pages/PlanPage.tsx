import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Users, Wallet, Loader2, CheckCircle2, Compass, ArrowLeft } from 'lucide-react'
import Header from '../components/Header'

const AGENTS = [
  { key: 'destination_agent', label: 'Destination Expert', icon: '🗺️', desc: 'Researching top spots & hidden gems' },
  { key: 'itinerary_agent', label: 'Itinerary Planner', icon: '📅', desc: 'Building your day-by-day adventure' },
  { key: 'budget_agent', label: 'Budget Analyst', icon: '💰', desc: 'Crunching costs & savings tips' },
  { key: 'hotel_agent', label: 'Hotel Scout', icon: '🏨', desc: 'Finding the perfect stays' },
  { key: 'weather_agent', label: 'Weather Advisor', icon: '🌤️', desc: 'Checking forecasts & packing tips' },
  { key: 'compile', label: 'Guide Compiler', icon: '✨', desc: 'Weaving your complete travel guide' },
]

type Status = 'idle' | 'loading' | 'error'

interface TripForm { destination: string; travel_dates: string; travelers: number; budget: string }

export default function PlanPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<TripForm>({ destination: '', travel_dates: '', travelers: 2, budget: 'mid-range' })
  const [status, setStatus] = useState<Status>('idle')
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set())
  const [activeAgent, setActiveAgent] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.destination.trim() || !form.travel_dates.trim()) return
    setStatus('loading')
    setCompletedAgents(new Set())
    setActiveAgent(AGENTS[0].key)
    setError('')

    try {
      const res = await fetch('http://localhost:8000/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok || !res.body) throw new Error('Server error')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const evt = JSON.parse(part.slice(6))
          if (evt.type === 'agent_done') {
            setCompletedAgents(prev => new Set([...prev, evt.agent]))
            const idx = AGENTS.findIndex(a => a.key === evt.agent)
            if (idx < AGENTS.length - 1) setActiveAgent(AGENTS[idx + 1].key)
          }
          if (evt.type === 'complete') {
            navigate('/result', { state: { plan: evt, tripInfo: form } })
          }
          if (evt.type === 'error') { setError(evt.message); setStatus('error') }
        }
      }
    } catch {
      setError('Could not reach the backend. Start the API with:\n\nsource myenv/bin/activate && uvicorn api:app --reload')
      setStatus('error')
    }
  }

  const isLoading = status === 'loading'

  return (
    <div className="min-h-screen bg-black text-white overflow-y-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Ambient BG */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 85% 100%, rgba(139,92,246,0.09) 0%, transparent 60%)'
      }} />
      <Header />

      <main className="relative z-10 flex items-center justify-center min-h-screen px-6 pt-28 pb-16">
        {!isLoading ? (
          <div className="w-full max-w-lg">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors cursor-pointer bg-transparent border-none outline-none">
              <ArrowLeft size={14} /> Back
            </button>
            <div className="mb-10">
              <div className="inline-flex items-center gap-2 liquid-glass rounded-full px-4 py-2 mb-5">
                <Compass size={12} className="text-white/50" />
                <span className="text-white/50 tracking-widest" style={{ fontSize: '10px' }}>PLAN YOUR ESCAPE</span>
              </div>
              <h1 className="font-light tracking-tight mb-2" style={{ fontSize: 'clamp(28px,4vw,42px)', letterSpacing: '-0.03em' }}>Where are you headed?</h1>
              <p className="text-white/40 text-sm">Tell us the basics. Our AI agents will handle the rest.</p>
            </div>

            {(status === 'error') && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 text-red-300 text-sm whitespace-pre-line">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="liquid-glass rounded-2xl p-6 space-y-5">
                <label className="block">
                  <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '0.14em' }}>
                    <MapPin size={10} strokeWidth={2} /> DESTINATION
                  </div>
                  <input type="text" placeholder="e.g. Kyoto, Japan" required value={form.destination}
                    onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                    className="w-full bg-transparent text-white text-base outline-none placeholder:text-white/20 border-b border-white/10 pb-2 focus:border-white/30 transition-colors" />
                </label>
                <label className="block">
                  <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '0.14em' }}>
                    <Calendar size={10} strokeWidth={2} /> TRAVEL DATES
                  </div>
                  <input type="text" placeholder="e.g. October 2026, 10 days" required value={form.travel_dates}
                    onChange={e => setForm(f => ({ ...f, travel_dates: e.target.value }))}
                    className="w-full bg-transparent text-white text-base outline-none placeholder:text-white/20 border-b border-white/10 pb-2 focus:border-white/30 transition-colors" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Travelers */}
                <div className="liquid-glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '0.14em' }}>
                    <Users size={10} strokeWidth={2} /> TRAVELERS
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setForm(f => ({ ...f, travelers: Math.max(1, f.travelers - 1) }))}
                      className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white cursor-pointer border-none text-xl">−</button>
                    <span className="text-2xl font-light w-6 text-center tabular-nums">{form.travelers}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, travelers: Math.min(20, f.travelers + 1) }))}
                      className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white cursor-pointer border-none text-xl">+</button>
                  </div>
                </div>

                {/* Budget */}
                <div className="liquid-glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '0.14em' }}>
                    <Wallet size={10} strokeWidth={2} /> BUDGET
                  </div>
                  <div className="flex flex-col gap-1">
                    {['budget','mid-range','luxury'].map(b => (
                      <button key={b} type="button" onClick={() => setForm(f => ({ ...f, budget: b }))}
                        className={`text-left text-xs tracking-wide rounded-full px-3 py-1.5 transition-all cursor-pointer border-none ${form.budget === b ? 'bg-white text-black font-semibold' : 'text-white/50 hover:text-white'}`}>
                        {b === 'budget' ? '✈️ Budget' : b === 'mid-range' ? '⭐ Mid-range' : '💎 Luxury'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit"
                className="w-full bg-white text-black rounded-full py-4 font-semibold text-base transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] hover:shadow-[0_0_32px_4px_rgba(255,255,255,0.15)] cursor-pointer">
                Generate My Travel Guide →
              </button>
            </form>
          </div>
        ) : (
          /* Loading / Agent Progress */
          <div className="w-full max-w-md text-center">
            <div className="mb-10">
              <div className="text-3xl font-light mb-2 tracking-tight" style={{ letterSpacing: '-0.03em' }}>Assembling your team…</div>
              <p className="text-white/40 text-sm">
                6 AI specialists crafting your perfect trip to <span className="text-white/70 font-medium">{form.destination}</span>
              </p>
            </div>

            <div className="space-y-3 text-left">
              {AGENTS.map(agent => {
                const done = completedAgents.has(agent.key)
                const active = activeAgent === agent.key && !done
                return (
                  <div key={agent.key}
                    className={`liquid-glass rounded-2xl px-5 py-4 flex items-center gap-4 transition-all duration-500 ${done ? 'opacity-100' : active ? 'opacity-100' : 'opacity-25'}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base transition-all ${done ? 'bg-emerald-400/15' : active ? 'bg-white/10' : 'bg-white/5'}`}>
                      {done ? <CheckCircle2 size={17} className="text-emerald-400" />
                        : active ? <Loader2 size={17} className="text-white/70 animate-spin" />
                        : <span className="text-base">{agent.icon}</span>}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${done || active ? 'text-white' : 'text-white/30'}`}>{agent.label}</div>
                      <div className={`text-xs mt-0.5 ${done ? 'text-emerald-400/70' : active ? 'text-white/45' : 'text-white/20'}`}>
                        {done ? '✓ Complete' : active ? agent.desc : 'Queued'}
                      </div>
                    </div>
                    {done && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />}
                  </div>
                )
              })}
            </div>
            <p className="text-white/25 text-xs mt-8 tracking-wide">This takes 1–3 minutes · Rate-limited for free tier</p>
          </div>
        )}
      </main>
    </div>
  )
}
