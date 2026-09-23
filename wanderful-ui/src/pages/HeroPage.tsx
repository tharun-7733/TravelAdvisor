import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import gsap from 'gsap'
import Header from '../components/Header'

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260510_060007_60275ce7-030c-4668-a160-8f364ec537d3.mp4'

export default function HeroPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoBgRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    let cx = 0, cy = 0, tx = 0, ty = 0, rafId: number
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth / 2, h = window.innerHeight / 2
      tx = ((e.clientX - w) / w) * 20
      ty = ((e.clientY - h) / h) * 20
    }
    const tick = () => {
      cx += (tx - cx) * 0.06
      cy += (ty - cy) * 0.06
      if (videoBgRef.current) gsap.set(videoBgRef.current, { x: cx, y: cy })
      rafId = requestAnimationFrame(tick)
    }
    window.addEventListener('mousemove', onMove)
    rafId = requestAnimationFrame(tick)
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(rafId) }
  }, [])

  return (
    <div className="min-h-screen h-screen flex flex-col bg-black text-white overflow-hidden relative" style={{ fontFamily: "'Inter', sans-serif" }}>

      <div ref={videoBgRef} className="absolute inset-0 z-0" style={{ transform: 'scale(1.08)', transformOrigin: 'center' }}>
        <video ref={videoRef} src={VIDEO_SRC} autoPlay muted loop playsInline
          onLoadedMetadata={() => { if (videoRef.current) videoRef.current.playbackRate = 1.25 }}
          className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)' }} />
      </div>

      <div className="relative z-20">
        <Header />
      </div>

      <main className="relative z-20 flex-1 flex flex-col items-center justify-between pt-[8vh] pb-14 px-4">
        {/* Top Text */}
        <div className={`flex flex-col items-center text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h1 style={{ fontWeight: 400, fontSize: 'clamp(40px, 5.4vw, 72px)', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff' }}>
            Venture without edges.
          </h1>
          <p style={{ fontWeight: 400, fontSize: 'clamp(40px, 5.4vw, 72px)', lineHeight: 1.1, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>
            Uncover with keen instinct.
          </p>
        </div>

        {/* Bottom Text / CTA */}
        <div className={`flex flex-col items-center gap-6 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-center leading-relaxed" style={{ maxWidth: '620px', fontSize: '15px' }}>
            <span className="text-white">Our smart itineraries shape around you — your rhythm, your vibe, your hunger for adventure.</span>
            <span className="text-white/55"> Each getaway is tailored, seamless, and wholly yours.</span>
          </p>
          <button
            onClick={() => navigate('/plan')}
            className="bg-white text-black rounded-full px-8 py-3.5 font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
            style={{ fontSize: '15px' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 32px 4px rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            Plan my escape today
          </button>
          <div className="flex items-center gap-2">
            <Lock size={13} strokeWidth={1.5} className="text-white/70" />
            <span className="text-white/70 font-medium" style={{ fontSize: '11px', letterSpacing: '0.14em' }}>
              SECURE BY DESIGN. ZERO DATA LEAKS.
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
