import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Zap, ShieldCheck, Compass } from 'lucide-react'
import Header from '../components/Header'

const PILLARS = [
  {
    icon: Compass,
    title: 'Crafted for wanderers',
    body: 'Wanderful was born from a simple frustration: planning trips is tedious. We set out to make every itinerary feel like it was hand-crafted by a local friend who knows your taste.',
  },
  {
    icon: Zap,
    title: 'AI-powered, human-hearted',
    body: 'Our smart engine reads between the lines of your preferences — pace, vibe, budget, curiosity — and turns them into journeys that feel wholly yours.',
  },
  {
    icon: Globe,
    title: 'Every corner of the world',
    body: 'From weekend escapes to month-long odysseys, Wanderful covers 150+ countries with live data, local insights, and curated recommendations.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy by design',
    body: 'Zero data leaks. We never sell your travel data. Your itineraries are yours alone — encrypted, private, and deleted on demand.',
  },
]

export default function AboutPage() {
  const [mounted, setMounted] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col bg-[#080808] text-white"
      style={{ fontFamily: "'Inter', sans-serif", overflowY: 'auto' }}
    >
      <Header />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-white/[0.04] blur-[120px] rounded-full pointer-events-none" />
        <div
          className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <p className="uppercase tracking-[0.22em] text-white/35 mb-5" style={{ fontSize: '11px', fontWeight: 500 }}>
            Our story
          </p>
          <h1
            style={{ fontWeight: 400, fontSize: 'clamp(36px, 5vw, 68px)', lineHeight: 1.08, letterSpacing: '-0.03em', maxWidth: '820px' }}
          >
            Travel the world,{' '}
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>without the friction.</span>
          </h1>
          <p className="mt-7 text-white/50 leading-relaxed mx-auto" style={{ maxWidth: '560px', fontSize: '16px' }}>
            Wanderful is a small team of obsessed travellers and engineers on a mission to make
            exploring the world feel effortless, personal, and endlessly inspiring.
          </p>
        </div>
      </section>

      <div className="w-full max-w-4xl mx-auto px-6"><div className="h-px bg-white/[0.07]" /></div>

      {/* Pillars */}
      <section className="max-w-4xl w-full mx-auto px-6 py-20 grid grid-cols-1 sm:grid-cols-2 gap-8">
        {PILLARS.map(({ icon: Icon, title, body }, i) => (
          <div
            key={title}
            className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 flex flex-col gap-4 transition-all duration-700"
            style={{ transitionDelay: `${i * 100 + 200}ms`, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
              <Icon size={18} strokeWidth={1.5} className="text-white/70" />
            </div>
            <h2 className="text-white font-medium" style={{ fontSize: '17px', letterSpacing: '-0.01em' }}>{title}</h2>
            <p className="text-white/45 leading-relaxed" style={{ fontSize: '14px' }}>{body}</p>
          </div>
        ))}
      </section>

      <div className="w-full max-w-4xl mx-auto px-6"><div className="h-px bg-white/[0.07]" /></div>

      {/* Stats */}
      <section className="max-w-4xl w-full mx-auto px-6 py-16 grid grid-cols-3 gap-8 text-center">
        {[
          { value: '150+', label: 'Countries covered' },
          { value: '50K+', label: 'Itineraries generated' },
          { value: '4.9★', label: 'Average rating' },
        ].map(({ value, label }) => (
          <div key={label} className="flex flex-col gap-2">
            <span className="text-white font-medium" style={{ fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-0.03em' }}>{value}</span>
            <span className="text-white/35 uppercase tracking-[0.15em]" style={{ fontSize: '11px' }}>{label}</span>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section
        className={`flex flex-col items-center gap-5 pb-28 pt-4 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <p className="text-white/35" style={{ fontSize: '14px' }}>Ready to roam?</p>
        <button
          onClick={() => navigate('/plan')}
          className="bg-white text-black rounded-full px-9 py-3.5 font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
          style={{ fontSize: '15px' }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 32px 4px rgba(255,255,255,0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          Plan my escape today
        </button>
      </section>
    </div>
  )
}
