import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import Header from '../components/Header'

interface ResultData {
  final_plan: string
  destination?: string
  travel_dates?: string
  travelers?: number
  budget?: string
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'essentials', label: 'Essentials' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'budget', label: 'Budget' },
  { id: 'stay', label: 'Stay' },
  { id: 'pack', label: 'Weather & packing' },
]

function textFromChildren(children: React.ReactNode): string {
  return React.Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child)
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) return textFromChildren(child.props.children)
    return ''
  }).join('')
}

function sectionIdForHeading(heading: string) {
  const value = heading.toLowerCase()
  if (/quick.?look|overview|snapshot/.test(value)) return 'overview'
  if (/highlight/.test(value)) return 'highlights'
  if (/getting there|legal|visa|flight|transport|logistic|essential/.test(value)) return 'essentials'
  if (/itinerary|day.by.day|schedule/.test(value)) return 'itinerary'
  if (/budget|cost|spend|expense/.test(value)) return 'budget'
  if (/where to stay|hotel|accommodation|lodging/.test(value)) return 'stay'
  if (/weather|packing|climate/.test(value)) return 'pack'
  return undefined
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mb-5 mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: '#f2efe8', fontFamily: "'Fraunces', Georgia, serif" }}>{children}</h1>,
  h2: ({ children }) => {
    const title = textFromChildren(children)
    const id = sectionIdForHeading(title)
    return <h2 id={id === 'overview' ? undefined : id} className="mb-4 mt-10 scroll-mt-[132px] border-b pb-3 text-2xl font-semibold first:mt-0" style={{ color: '#f2efe8', borderColor: 'rgba(255,255,255,0.08)', fontFamily: "'Fraunces', Georgia, serif" }}>{children}</h2>
  },
  h3: ({ children }) => {
    const title = textFromChildren(children)
    const sectionId = sectionIdForHeading(title)
    const id = sectionId === 'highlights' || sectionId === 'essentials' ? sectionId : undefined
    return <h3 id={id} className="mb-3 mt-7 scroll-mt-[132px] text-lg font-semibold" style={{ color: '#f2efe8' }}>{children}</h3>
  },
  p: ({ children }) => <p className="my-3 text-sm leading-7" style={{ color: 'rgba(242,239,232,0.8)' }}>{children}</p>,
  ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 text-sm leading-6" style={{ color: 'rgba(242,239,232,0.8)' }}>{children}</ul>,
  ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 text-sm leading-6" style={{ color: 'rgba(242,239,232,0.8)' }}>{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold" style={{ color: '#f2efe8' }}>{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-2 pl-4" style={{ borderColor: '#ff6a52', color: '#b9b5aa' }}>{children}</blockquote>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-4" style={{ color: '#ff9a83' }}>{children}</a>,
}

type MarkdownChunk = { type: 'text'; value: string } | { type: 'table'; rows: string[][] }

function splitMarkdownTables(markdown: string): MarkdownChunk[] {
  const lines = markdown.split('\n')
  const chunks: MarkdownChunk[] = []
  let textLines: string[] = []
  const flushText = () => {
    const value = textLines.join('\n').trim()
    if (value) chunks.push({ type: 'text', value })
    textLines = []
  }
  const parseCells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim().replace(/\\\|/g, '|'))
  const isSeparator = (line: string) => /^\|?\s*:?-{3,}.*\|\s*:?-{3,}/.test(line.trim())

  for (let i = 0; i < lines.length;) {
    if (lines[i].trim().startsWith('|') && lines[i + 1]?.trim().startsWith('|') && isSeparator(lines[i + 1])) {
      flushText()
      const rows = [parseCells(lines[i])]
      i += 2
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(parseCells(lines[i++]))
      chunks.push({ type: 'table', rows })
    } else {
      textLines.push(lines[i++])
    }
  }
  flushText()
  return chunks
}

function StructuredMarkdown({ content }: { content: string }) {
  const chunks = splitMarkdownTables(content)
  return <div>
    {chunks.map((chunk, index) => chunk.type === 'text' ? (
      <ReactMarkdown key={index} components={markdownComponents}>{chunk.value}</ReactMarkdown>
    ) : (
      <div key={index} className="my-5 overflow-x-auto rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead style={{ background: '#1a1a1d' }}>
            <tr>{chunk.rows[0].map((cell, cellIndex) => <th key={cellIndex} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] align-top" style={{ color: '#c3beb2', borderBottom: '1px solid rgba(255,255,255,0.09)' }}>{cell}</th>)}</tr>
          </thead>
          <tbody>
            {chunk.rows.slice(1).map((row, rowIndex) => <tr key={rowIndex} style={{ background: rowIndex % 2 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
              {chunk.rows[0].map((_, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-sm leading-relaxed align-top" style={{ minWidth: '150px', color: 'rgba(242,239,232,0.82)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <ReactMarkdown components={{ p: ({ children }) => <span>{children}</span>, strong: ({ children }) => <strong style={{ color: '#f2efe8' }}>{children}</strong> }}>{row[cellIndex] || '—'}</ReactMarkdown>
              </td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    ))}
  </div>
}

export default function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state as ResultData | null
  const [activeSection, setActiveSection] = useState('overview')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveSection(entry.target.id)
      })
    }, { rootMargin: '-25% 0px -65% 0px' })
    NAV_ITEMS.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [data?.final_plan])

  if (!data?.final_plan) return <Navigate to="/plan" replace />

  const md = data.final_plan
  const destination = data.destination || md.match(/^#\s+(.+)$/m)?.[1]?.replace(/[*_`]/g, '').trim() || 'Your travel guide'
  const guideBody = md.replace(/^#\s+[^\n]+\n*/, '')
  const chips = [data.travel_dates, data.budget?.replace(/-/g, ' '), data.travelers ? `${data.travelers} traveler${data.travelers === 1 ? '' : 's'}` : null].filter(Boolean)

  const handleCopy = () => {
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0b', color: '#f2efe8', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header />
      <div className="fixed left-0 right-0 top-[72px] z-40 border-b" style={{ background: 'rgba(10,10,11,0.88)', backdropFilter: 'blur(14px)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <nav aria-label="Guide sections" className="mx-auto flex h-12 max-w-5xl items-center gap-1 overflow-x-auto px-4" style={{ scrollbarWidth: 'none' }}>
          {NAV_ITEMS.map(({ id, label }) => <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors" style={{ color: activeSection === id ? '#ff9a83' : '#9d998d', background: activeSection === id ? 'rgba(255,106,82,0.12)' : 'transparent' }}>{label}</a>)}
        </nav>
      </div>

      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-[150px] sm:px-6">
        <div className="mb-9 flex items-center justify-between gap-4">
          <button onClick={() => navigate('/plan')} className="flex items-center gap-2 text-xs font-medium transition-colors" style={{ color: '#aaa69b' }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Plan another trip
          </button>
          <button onClick={handleCopy} className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#f2efe8' }}>
            {copied ? <Check className="h-3.5 w-3.5" style={{ color: '#58c79a' }} /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy guide'}
          </button>
        </div>

        <header id="overview" className="mb-10 scroll-mt-[132px]">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: '#9d998d' }}>Your custom travel guide</p>
          <h1 className="mb-5 text-4xl font-semibold leading-tight sm:text-6xl" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#f2efe8' }}>{destination}</h1>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip, index) => <span key={index} className="rounded-full border px-3 py-1.5 text-xs capitalize" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#dedacf' }}>{chip}</span>)}
          </div>
        </header>

        <article className="rounded-2xl border px-5 py-2 sm:px-9 sm:py-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#101012' }}>
          <StructuredMarkdown content={guideBody} />
        </article>

        <footer className="pt-10 text-center text-sm" style={{ color: '#9d998d' }}>Safe travels — {destination} awaits. ☆</footer>
      </main>
    </div>
  )
}
