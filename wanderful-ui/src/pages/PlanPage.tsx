import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Users, Wallet, Loader2, ArrowRight } from 'lucide-react'
import Header from '../components/Header'

export default function PlanPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    destination: '',
    travel_dates: '',
    travelers: 1,
    budget: 'mid-range'
  })
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.destination || !formData.travel_dates) return

    setLoading(true)
    setError('')
    setStatusMsg('Assembling your travel team...')

    try {
      const response = await fetch('http://localhost:8000/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect to the server')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.slice(6)
            try {
              const data = JSON.parse(dataStr)
              if (data.type === 'start') {
                setStatusMsg(data.message)
              } else if (data.type === 'agent_done') {
                setStatusMsg(`${data.label} completed their task...`)
              } else if (data.type === 'complete') {
                navigate('/result', { state: data })
                return
              } else if (data.type === 'error') {
                setError(data.message)
                setLoading(false)
                return
              }
            } catch (e) {
              console.error('Error parsing SSE', e)
            }
          }
        }
      }
      
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-[#0a0a0a] text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <Header />

      {/* pt-[72px] offsets the fixed header; then we add breathing room */}
      <main className="flex-1 flex flex-col items-center px-4 pt-[72px] pb-16 sm:px-6">

        {/* Page header */}
        <div className="w-full max-w-2xl text-center pt-14 pb-10">
          <h1
            className="text-white font-medium tracking-tight mb-3"
            style={{ fontSize: 'clamp(28px, 4vw, 42px)', letterSpacing: '-0.025em' }}
          >
            Design your escape
          </h1>
          <p className="text-white/45" style={{ fontSize: '15px' }}>
            Tell us where you want to go, we handle the rest.
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-2xl bg-[#111] border border-white/[0.08] rounded-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">

          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-white/[0.04] blur-[100px] rounded-full pointer-events-none" />

          <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-6">

            {/* DESTINATION */}
            <div className="flex flex-col gap-2">
              <label
                className="text-white/55 uppercase tracking-[0.13em]"
                style={{ fontSize: '10px', fontWeight: 600 }}
              >
                Destination
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Kyoto, Japan"
                  value={formData.destination}
                  onChange={e => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all"
                  style={{ height: '48px' }}
                />
              </div>
            </div>

            {/* DATES */}
            <div className="flex flex-col gap-2">
              <label
                className="text-white/55 uppercase tracking-[0.13em]"
                style={{ fontSize: '10px', fontWeight: 600 }}
              >
                Dates
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. December 2025, 2 weeks"
                  value={formData.travel_dates}
                  onChange={e => setFormData({ ...formData, travel_dates: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all"
                  style={{ height: '48px' }}
                />
              </div>
            </div>

            {/* TRAVELERS + BUDGET row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* TRAVELERS */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-white/55 uppercase tracking-[0.13em]"
                  style={{ fontSize: '10px', fontWeight: 600 }}
                >
                  Travelers
                </label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.travelers}
                    onChange={e => setFormData({ ...formData, travelers: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 text-white text-sm focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all"
                    style={{ height: '48px' }}
                  />
                </div>
              </div>

              {/* BUDGET */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-white/55 uppercase tracking-[0.13em]"
                  style={{ fontSize: '10px', fontWeight: 600 }}
                >
                  Budget
                </label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none z-10" />
                  <select
                    value={formData.budget}
                    onChange={e => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full border border-white/[0.08] rounded-xl pl-11 pr-4 text-white text-sm focus:outline-none focus:border-white/25 transition-all appearance-none cursor-pointer"
                    style={{
                      height: '48px',
                      background: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <option value="budget" style={{ background: '#1a1a1a' }}>Budget</option>
                    <option value="mid-range" style={{ background: '#1a1a1a' }}>Mid-range</option>
                    <option value="luxury" style={{ background: '#1a1a1a' }}>Luxury</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-medium rounded-full flex items-center justify-center gap-2.5 group transition-all duration-200 hover:bg-white/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              style={{ height: '52px', fontSize: '15px' }}
              onMouseEnter={e => !loading && (e.currentTarget.style.boxShadow = '0 0 28px 2px rgba(255,255,255,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{statusMsg || 'Loading...'}</span>
                </>
              ) : (
                <>
                  <span>Plan my escape</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

