import { useNavigate, useLocation } from 'react-router-dom'

const NAV_LINKS = ['JOURNEY', 'BENEFITS', 'JOURNAL', 'GUIDEBOOK']

export default function Header() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isHero = pathname === '/'

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-10 py-8 flex justify-between items-center">
      <button onClick={() => navigate('/')} className="text-white cursor-pointer bg-transparent border-none outline-none"
        style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.02em', fontFamily: "'Inter', sans-serif" }}>
        Wanderful<sup className="text-[10px] ml-0.5 align-super opacity-70">TM</sup>
      </button>

      {isHero && (
        <nav className="liquid-glass rounded-full px-2 py-2 hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <a key={link} href="#"
              className="text-white/90 hover:text-white px-4 py-1.5 rounded-full transition-colors duration-200"
              style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em' }}>
              {link}
            </a>
          ))}
        </nav>
      )}

      <button onClick={() => navigate('/plan')}
        className="liquid-glass rounded-full px-5 py-2.5 text-white/90 hover:text-white transition-colors duration-200 cursor-pointer outline-none border-none bg-transparent"
        style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em', fontFamily: "'Inter', sans-serif" }}>
        GET ROAMING
      </button>
    </header>
  )
}
