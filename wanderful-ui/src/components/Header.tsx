import { useNavigate, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'JOURNEY', href: '/' },
  { label: 'BENEFITS', href: '/#benefits' },
  { label: 'ABOUT', href: '/about' },
  { label: 'JOURNAL', href: '/#journal' },
  { label: 'GUIDEBOOK', href: '/#guidebook' },
]

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-10 py-6" style={{ height: '72px' }}>
      {/* Brand – left */}
      <button
        onClick={() => navigate('/')}
        className="text-white cursor-pointer bg-transparent border-none shrink-0"
        style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.02em' }}
      >
        Wanderful<sup className="text-[10px] ml-0.5 align-super opacity-70">TM</sup>
      </button>

      {/* Nav – absolutely centred */}
      <nav
        className="liquid-glass rounded-full px-2 py-1.5 flex items-center gap-0.5 absolute left-1/2"
        style={{ transform: 'translateX(-50%)' }}
      >
        {NAV_LINKS.map(({ label, href }) => {
          const isActive =
            href === '/'
              ? location.pathname === '/'
              : location.pathname === href || location.hash === href.split('#')[1]
          return (
            <a
              key={label}
              href={href.startsWith('/') && !href.includes('#') ? undefined : href}
              onClick={href.startsWith('/') && !href.includes('#')
                ? (e) => { e.preventDefault(); navigate(href) }
                : undefined}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
              style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em' }}
            >
              {label}
            </a>
          )
        })}
      </nav>

      {/* CTA – right */}
      <button
        onClick={() => navigate('/plan')}
        className="liquid-glass rounded-full px-5 py-2.5 text-white/90 hover:text-white transition-colors duration-200 cursor-pointer ml-auto shrink-0"
        style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em' }}
      >
        GET ROAMING
      </button>
    </header>
  )
}
