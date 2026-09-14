import { useRef, useState, type PointerEvent } from 'react'
import { getStroke } from 'perfect-freehand'
import { Eraser, Pen, Trash2, Undo2 } from 'lucide-react'

export type InkStroke = { id: string; points: [number, number, number][] }

type Props = { strokes: InkStroke[]; onChange: (strokes: InkStroke[]) => void }

const getSvgPoint = (element: SVGSVGElement, event: PointerEvent<SVGSVGElement>) => {
  const rect = element.getBoundingClientRect()
  return [event.clientX - rect.left, event.clientY - rect.top, event.pressure || 0.5] as [number, number, number]
}

const outlineToPath = (points: number[][]) => {
  if (points.length < 2) return ''
  const start = points[0]
  return `M ${start[0]} ${start[1]} ${points.slice(1).map(point => `L ${point[0]} ${point[1]}`).join(' ')} Z`
}

export function InteractiveWhiteboard({ strokes, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [draft, setDraft] = useState<[number, number, number][]>([])
  const [history, setHistory] = useState<InkStroke[][]>([])

  const begin = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = getSvgPoint(event.currentTarget, event)
    if (tool === 'eraser') {
      const hit = strokes.findIndex(stroke => stroke.points.some(p => Math.hypot(p[0] - point[0], p[1] - point[1]) < 24))
      if (hit >= 0) { setHistory(h => [...h.slice(-19), strokes]); onChange(strokes.filter((_, i) => i !== hit)) }
      return
    }
    setDraft([point])
  }

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!draft.length || tool !== 'pen') return
    setDraft(points => [...points, getSvgPoint(event.currentTarget, event)])
  }

  const end = () => {
    if (!draft.length) return
    setHistory(h => [...h.slice(-19), strokes])
    onChange([...strokes, { id: crypto.randomUUID(), points: draft }])
    setDraft([])
  }

  const undo = () => {
    const previous = history[history.length - 1]
    if (!previous) return
    setHistory(history.slice(0, -1))
    onChange(previous)
  }

  const clear = () => {
    if (!strokes.length) return
    setHistory(h => [...h.slice(-19), strokes])
    onChange([])
  }

  const allStrokes = draft.length ? [...strokes, { id: 'draft', points: draft }] : strokes
  return <div className="mt-3 overflow-hidden rounded-2xl border border-[#cfdddd] bg-[#fffef9]">
    <div className="flex items-center justify-between border-b border-[#e4eae8] bg-white px-3 py-2">
      <span className="text-xs font-bold text-[#63818c]">Your ink · {strokes.length} strokes</span>
      <div className="flex items-center gap-1">
        <button aria-label="Pen" onClick={() => setTool('pen')} className={`rounded-lg p-2 ${tool === 'pen' ? 'bg-[#fff1c9] text-[#80550a]' : 'text-[#527184]'}`}><Pen size={15}/></button>
        <button aria-label="Eraser" onClick={() => setTool('eraser')} className={`rounded-lg p-2 ${tool === 'eraser' ? 'bg-[#fce3d8] text-[#b94e2a]' : 'text-[#527184]'}`}><Eraser size={15}/></button>
        <button aria-label="Undo ink" disabled={!history.length} onClick={undo} className="rounded-lg p-2 text-[#527184] disabled:opacity-30"><Undo2 size={15}/></button>
        <button aria-label="Clear ink" disabled={!strokes.length} onClick={clear} className="rounded-lg p-2 text-[#b94e2a] disabled:opacity-30"><Trash2 size={15}/></button>
      </div>
    </div>
    <svg ref={svgRef} viewBox="0 0 900 430" className="h-[280px] w-full touch-none bg-white sm:h-[340px]" role="img" aria-label="Freehand learner whiteboard. Draw with a mouse, stylus or finger.">
      {allStrokes.map(stroke => {
        const outline = getStroke(stroke.points, { size: 3.5, thinning: 0.55, smoothing: 0.55, easing: t => t })
        return <path key={stroke.id} d={outlineToPath(outline)} fill="#17384a" opacity={stroke.id === 'draft' ? 0.55 : 0.9}/>
      })}
      <rect x="0" y="0" width="900" height="430" fill="transparent" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}/>
    </svg>
  </div>
}
