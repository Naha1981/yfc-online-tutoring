import { useEffect, useRef, useState } from 'react'
import { BoardAction, LessonMessage, LessonPhase, gradeFirstStep, gradePracticeAnswer, lessonProgress, lessonStorageKey, linearEquationBoard, tutorInterruptionAnswer } from './lessonEngine'
import { createSessionRepository, LessonIdentity } from './sessionRepository'
import { InteractiveWhiteboard, InkStroke } from './InteractiveWhiteboard'
import { createSpeechRecognizer, speakTutor, stopTutorSpeech, VoiceStatus } from './voice/tutorVoice'
import { OpenLiveClient, readOpenLiveUrl } from './voice/openLiveClient'
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight,
  GraduationCap, Lightbulb, MessageCircle, PenLine, Play,
  RotateCcw, Send, Sparkles, Volume2, X
} from 'lucide-react'

const sessionRepository = createSessionRepository()

function Board({ actions, phase, inkStrokes, onInkChange }: { actions: BoardAction[]; phase: LessonPhase; inkStrokes: InkStroke[]; onInkChange: (strokes: InkStroke[]) => void }) {
  const visible = phase === 'welcome' ? [] : actions
  return <section aria-label="Interactive lesson whiteboard" className="relative min-h-[420px] overflow-hidden rounded-[28px] border-[10px] border-[#183446] bg-[#fdfbf5] shadow-[inset_0_0_35px_rgba(21,48,64,.10),0_22px_36px_rgba(10,28,43,.16)]">
    <div className="absolute inset-0 opacity-[.16]" style={{ backgroundImage: 'radial-gradient(#274d63 0.7px, transparent 0.7px)', backgroundSize: '5px 5px' }} />
    <div className="absolute inset-x-0 top-0 h-12 border-b border-[#26495c]/15 bg-[#f8f3e8]" />
    <div className="relative p-7 sm:p-10">
      <p className="font-mono text-xs font-bold tracking-[.18em] text-[#527184]">WORKED EXAMPLE · LINEAR EQUATIONS</p>
      <div className="relative min-h-[230px]">
        {visible.map((action) => <BoardElement key={action.id} action={action} />)}
        {phase === 'teaching' && <div className="absolute left-0 top-[155px] animate-pulse rounded-lg bg-[#eaf2e9] px-3 py-2 text-sm font-medium text-[#315447]">Teacher is writing…</div>}
        {phase === 'check' && <div className="absolute left-0 right-0 top-[155px] rounded-xl border-2 border-dashed border-[#c38d31] bg-[#fff8e8] p-5 text-[#704d17]"><strong>Your turn:</strong> What should we do first to isolate <em>x</em>?</div>}
        {phase === 'remediation' && <div className="absolute left-0 right-0 top-[145px] space-y-3 font-serif text-2xl text-[#17384a]"><p>First, undo the <span className="rounded bg-[#ffe9a6] px-1">+ 5</span>.</p><p>Subtract 5 from <strong>both sides</strong>:</p><p className="pl-8 text-3xl">3x + 5 <span className="text-[#b35034]">− 5</span> = 20 <span className="text-[#b35034]">− 5</span></p></div>}
        {(phase === 'practice' || phase === 'complete') && <div className="absolute left-0 right-0 top-[145px] space-y-3 font-serif text-2xl text-[#17384a]"><p>Now divide both sides by 3:</p><p className="pl-8 text-3xl">3x = 15 → x = <span className="rounded bg-[#d9f0df] px-2">5</span></p><div className="mt-8 h-1 w-56 bg-[#58a36d]" /></div>}
      </div>
      <InteractiveWhiteboard strokes={inkStrokes} onChange={onInkChange} />
    </div>
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-[#183446] px-5 py-2 text-xs text-[#d5e3e9]"><span>Structured board + learner ink · {visible.length} teacher actions</span><span>Replay-ready</span></div>
  </section>
}

function BoardElement({ action }: { action: BoardAction }) {
  const common = 'absolute font-serif text-[#17384a]'
  if (action.type === 'WRITE') return <p className={`${common} ${action.id === 'equation' ? 'text-4xl sm:text-5xl font-semibold tracking-wide' : 'text-xl italic'}`} style={{ left: `${action.x}px`, top: `${action.y}px` }}>{action.content}</p>
  return null
}

function Selection({ title, value, options, onSelect }: { title: string; value: string; options: string[]; onSelect: (v: string) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-[#27495d]">{title}</span><div className="relative"><select value={value} onChange={e => onSelect(e.target.value)} className="w-full appearance-none rounded-xl border border-[#c8d8d8] bg-white px-4 py-3 pr-9 text-[#17384a] outline-none transition focus:border-[#d76f45] focus:ring-4 focus:ring-[#fce3d8]">{options.map(o => <option key={o}>{o}</option>)}</select><ChevronRight className="pointer-events-none absolute right-3 top-3 rotate-90 text-[#527184]" size={18} /></div></label>
}

function AppShell() {
  const [screen, setScreen] = useState<'setup' | 'classroom'>('setup')
  const [grade, setGrade] = useState('Grade 8')
  const [subject, setSubject] = useState('Mathematics')
  const [topic, setTopic] = useState('Linear Equations')
  const [phase, setPhase] = useState<LessonPhase>('welcome')
  const [answer, setAnswer] = useState('')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<LessonMessage[]>([])
  const [notice, setNotice] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [inkStrokes, setInkStrokes] = useState<InkStroke[]>([])
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [openLiveReady, setOpenLiveReady] = useState(false)
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognizer>>(null)
  const openLiveRef = useRef<OpenLiveClient | null>(null)
  const liveReplyRef = useRef('')

  const progress = lessonProgress(phase)
  const storageKey = lessonStorageKey(grade, subject, topic)
  const lessonIdentity: LessonIdentity = { lessonKey: storageKey, grade, subject, topic }
  const inkStorageKey = `${storageKey}:ink`

  useEffect(() => {
    if (screen !== 'classroom') return
    try {
      const raw = window.localStorage.getItem(inkStorageKey)
      setInkStrokes(raw ? JSON.parse(raw) as InkStroke[] : [])
    } catch { setInkStrokes([]) }
  }, [screen, inkStorageKey])

  useEffect(() => {
    if (screen !== 'classroom') return
    try { window.localStorage.setItem(inkStorageKey, JSON.stringify(inkStrokes)) } catch { /* offline/private mode */ }
  }, [screen, inkStorageKey, inkStrokes])

  useEffect(() => {
    if (screen !== 'classroom') { setSessionReady(false); return }
    let cancelled = false
    setSessionReady(false)
    sessionRepository.load(lessonIdentity).then(saved => {
      if (cancelled) return
      if (saved) {
        setPhase(saved.phase)
        setMessages(saved.messages)
        setNotice('Your saved lesson has been resumed.')
      } else {
        setPhase('welcome')
        setMessages([])
      }
      setSessionReady(true)
    })
    return () => { cancelled = true }
  }, [screen, storageKey])

  useEffect(() => {
    if (screen !== 'classroom' || !sessionReady) return
    const recognizer = createSpeechRecognizer({
      onStatus: setVoiceStatus,
      onTranscript: result => {
        if (!result.isFinal) return
        const text = result.transcript.trim()
        if (!text) return
        if (openLiveRef.current?.ready) {
          openLiveRef.current.userText(text)
          setMessages(m => [...m, { role: 'learner', text }])
          setVoiceStatus('thinking')
          return
        }
        if (phase === 'check' || phase === 'practice') {
          const grader = phase === 'practice' ? gradePracticeAnswer : gradeFirstStep
          const result = grader(text)
          setMessages(m => [...m, { role: 'learner', text }, { role: 'teacher', text: result.feedback }])
          setPhase(result.nextPhase)
          speakTutor(result.feedback, () => setVoiceStatus('speaking'), () => setVoiceStatus('idle'))
          setAnswer('')
          return
        }
        const feedback = tutorInterruptionAnswer(text)
        setMessages(m => [...m, { role: 'learner', text }, { role: 'teacher', text: feedback }])
        speakTutor(feedback, () => setVoiceStatus('speaking'), () => setVoiceStatus('idle'))
      },
      onError: message => { setVoiceStatus('error'); setNotice(message) },
    })
    recognitionRef.current = recognizer
    setVoiceSupported(Boolean(recognizer) && 'speechSynthesis' in window)
    const url = readOpenLiveUrl()
    if (url) {
      const client = new OpenLiveClient(url)
      client.connect(storageKey, { onOpen: () => setOpenLiveReady(true), onClose: () => setOpenLiveReady(false) })
      client.on(event => {
        if (event.type === 'text_delta' && event.text) {
          liveReplyRef.current += event.text
          setVoiceStatus('thinking')
        }
        if (event.type === 'done') {
          const reply = liveReplyRef.current.trim()
          liveReplyRef.current = ''
          if (reply) {
            setMessages(m => [...m, { role: 'teacher', text: reply }])
            speakTutor(reply, () => setVoiceStatus('speaking'), () => setVoiceStatus('idle'))
          }
        }
        if (event.type === 'error') {
          setOpenLiveReady(false)
          setNotice('OpenLive is unavailable; browser voice fallback remains active.')
          setVoiceStatus('error')
        }
      })
      openLiveRef.current = client
    }
    return () => {
      recognitionRef.current?.stop()
      recognitionRef.current = null
      stopTutorSpeech()
      openLiveRef.current?.close()
      openLiveRef.current = null
    }
  }, [screen, sessionReady, storageKey, phase])

  useEffect(() => {
    if (screen === 'classroom' && sessionReady) void sessionRepository.save(lessonIdentity, { phase, messages })
  }, [phase, messages, screen, sessionReady, storageKey])

  const start = () => { setNotice(''); setScreen('classroom') }
  const teach = () => setPhase('teaching')
  const continueLesson = () => setPhase('check')
  const submitAnswer = () => {
    const result = gradeFirstStep(answer)
    setMessages(m => [...m, { role: 'learner', text: answer }, { role: 'teacher', text: result.feedback }])
    setAnswer(''); setPhase(result.nextPhase)
  }
  const submitPractice = () => {
    const result = gradePracticeAnswer(answer)
    setMessages(m => result.correct ? [...m, { role: 'learner', text: answer }, { role: 'teacher', text: result.feedback }] : [...m, { role: 'teacher', text: result.feedback }])
    setAnswer(''); setPhase(result.nextPhase)
  }
  const ask = () => {
    if (!question.trim()) return
    const feedback = tutorInterruptionAnswer(question)
    setMessages(m => [...m, { role: 'learner', text: question }, { role: 'teacher', text: feedback }])
    setQuestion(''); setNotice('Answered your question — the lesson stays at this exact point.')
    speakTutor(feedback, () => setVoiceStatus('speaking'), () => setVoiceStatus('idle'))
  }
  const startVoice = () => {
    stopTutorSpeech(() => setVoiceStatus('interrupted'))
    if (!recognitionRef.current) { setNotice('Voice input is not available in this browser. You can still use the text controls.'); return }
    recognitionRef.current.start()
  }
  const speakCurrentTutor = () => {
    const copy: Record<LessonPhase, string> = { welcome: 'Welcome! Today we will solve a linear equation by keeping both sides balanced. Ready to begin?', teaching: 'Look at the equation on the board. We want x on its own. First, we need to undo the plus five.', check: 'Your turn. What operation will undo plus five?', remediation: 'We subtract five from both sides because that cancels the plus five while keeping the equation balanced.', practice: 'Excellent. We now have three x equals fifteen. What is x?', complete: 'Well done. You completed the lesson step and your progress has been saved.' }
    if (!voiceSupported) { setNotice('Speech output is not available in this browser.'); return }
    speakTutor(copy[phase], () => setVoiceStatus('speaking'), () => setVoiceStatus('idle'))
  }
  const stopVoice = () => { recognitionRef.current?.stop(); stopTutorSpeech(() => setVoiceStatus('interrupted')); openLiveRef.current?.cancel() }

  if (screen === 'setup') return <main className="min-h-screen bg-[#f3f7f5] text-[#17384a]"><header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#17384a] text-[#f8cd70]"><Sparkles size={21} /></div><div><p className="text-lg font-black tracking-tight">NahaLabs</p><p className="text-xs font-semibold tracking-wide text-[#65808c]">AI WHITEBOARD TUTOR</p></div></div><span className="rounded-full bg-[#e4f0e5] px-3 py-1 text-xs font-bold text-[#2f724c]">Phase 1 classroom</span></header><section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center"><div><p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#fff1c9] px-3 py-1 text-sm font-bold text-[#80550a]"><GraduationCap size={16} /> Learn actively, not passively</p><h1 className="max-w-xl text-5xl font-black leading-[.95] tracking-tight sm:text-6xl">A teacher at the board, <span className="text-[#d76f45]">just for you.</span></h1><p className="mt-6 max-w-lg text-lg leading-8 text-[#527184]">Choose a CAPS-aligned learning path. Your tutor teaches step by step, checks your thinking, and adapts when you need help.</p><div className="mt-8 flex gap-5 text-sm font-semibold text-[#476b76]"><span className="flex items-center gap-2"><Check className="text-[#3c9b61]" size={17}/>Progress saved</span><span className="flex items-center gap-2"><Check className="text-[#3c9b61]" size={17}/>Low-distraction</span></div></div><div className="rounded-[28px] bg-white p-6 shadow-xl shadow-[#17384a]/10 sm:p-8"><p className="text-sm font-bold uppercase tracking-[.14em] text-[#d76f45]">Start a lesson</p><h2 className="mt-2 text-2xl font-black">Where would you like to begin?</h2><div className="mt-7 space-y-5"><Selection title="Grade" value={grade} options={['Grade 7','Grade 8','Grade 9']} onSelect={setGrade}/><Selection title="Subject" value={subject} options={['Mathematics','Natural Sciences','English']} onSelect={setSubject}/><Selection title="Topic" value={topic} options={subject === 'Mathematics' ? ['Linear Equations','Algebraic Expressions','Integers'] : ['Introduction']} onSelect={setTopic}/></div><button onClick={start} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d76f45] px-4 py-3.5 font-bold text-white transition hover:bg-[#bd5933]">Enter classroom <ArrowRight size={18}/></button><p className="mt-4 text-center text-xs text-[#6b8792]">Demo lesson · learning state persists in this browser</p></div></section></main>

  if (!sessionReady) return <main className="grid min-h-screen place-items-center bg-[#eaf0ef] text-[#17384a]"><div className="rounded-2xl bg-white px-6 py-5 text-center shadow-sm"><Sparkles className="mx-auto mb-2 text-[#d76f45]"/><p className="font-black">Opening your classroom…</p><p className="mt-1 text-sm text-[#527184]">Checking your saved lesson progress.</p></div></main>

  return <main className="min-h-screen bg-[#eaf0ef] text-[#17384a]"><header className="sticky top-0 z-10 border-b border-[#cfdddd] bg-[#f9fcfb]/95 backdrop-blur"><div className="mx-auto flex max-w-[1500px] items-center gap-3 px-3 py-3 sm:px-6"><button aria-label="Return to lesson selection" onClick={() => setScreen('setup')} className="rounded-lg p-2 hover:bg-[#e6efed]"><ArrowLeft size={19}/></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{grade} · {subject}</p><p className="truncate text-xs text-[#63818c]">{topic} · Solving equations by balancing</p></div><div className="hidden items-center gap-2 text-xs font-bold text-[#63818c] sm:flex"><span>Teacher: Ms Nandi</span><span>•</span><span>{openLiveReady ? 'OpenLive' : 'Browser voice'}</span></div></div></header><div className="mx-auto max-w-[1500px] px-3 py-5 sm:px-6"><div className="mb-3 h-2 overflow-hidden rounded-full bg-[#d7e4e1]"><div className="h-full rounded-full bg-[#d76f45] transition-all" style={{ width: `${progress}%` }}/></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="min-w-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#63818c]">Lesson progress · {progress}%</p><h1 className="text-xl font-black">Solving Linear Equations</h1></div><div className="flex items-center gap-2"><button onClick={() => setPhase('welcome')} className="rounded-lg border border-[#c9d9d6] bg-white p-2 text-[#527184] hover:bg-[#f6faf9]" title="Restart lesson"><RotateCcw size={17}/></button><button className="rounded-lg border border-[#c9d9d6] bg-white p-2 text-[#527184] hover:bg-[#f6faf9]" title="Board tools"><PenLine size={17}/></button></div></div><Board actions={linearEquationBoard} phase={phase} inkStrokes={inkStrokes} onInkChange={setInkStrokes}/>{notice && <div role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-[#e2f2e7] px-4 py-3 text-sm font-medium text-[#25633d]"><Check size={17}/>{notice}<button className="ml-auto" onClick={() => setNotice('')}><X size={16}/></button></div>}<LessonControls phase={phase} answer={answer} setAnswer={setAnswer} teach={teach} continueLesson={continueLesson} submitAnswer={phase === 'practice' ? submitPractice : submitAnswer} setPhase={setPhase}/></div><aside className="flex min-h-[520px] flex-col rounded-[24px] border border-[#d2dfdc] bg-white shadow-sm"><div className="border-b border-[#e1eae8] p-5"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-[#fce3d8] text-[#b94e2a]"><Sparkles size={19}/></div><div><p className="font-black">Ms Nandi</p><p className="text-xs text-[#63818c]">Your mathematics tutor · Online</p></div><button aria-label="Read current tutor message aloud" onClick={speakCurrentTutor} className="ml-auto rounded-lg p-2 text-[#527184] hover:bg-[#edf4f2]"><Volume2 size={17}/></button></div></div><div className="flex-1 space-y-4 overflow-auto p-5"><TutorSpeech phase={phase}/>{messages.map((m,i) => <div key={i} className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${m.role === 'teacher' ? 'bg-[#edf5f2] text-[#244a56]' : 'ml-auto bg-[#17384a] text-white'}`}>{m.text}</div>)}</div><div className="border-t border-[#e1eae8] p-4"><div className="mb-3 flex items-center gap-2"><button aria-label="Start Voice Tutor" onClick={startVoice} disabled={!voiceSupported} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#d76f45] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#bd5933] disabled:opacity-40"><Volume2 size={16}/> {voiceStatus === 'listening' ? 'Listening…' : 'Start Voice Tutor'}</button><button aria-label="Stop voice tutor" onClick={stopVoice} className="rounded-xl border border-[#c9d9d6] px-3 py-2.5 text-[#527184] hover:bg-[#f2f7f5]"><X size={16}/></button></div><div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#63818c]"><span className={`size-2 rounded-full ${voiceStatus === 'listening' ? 'bg-[#3c9b61] animate-pulse' : voiceStatus === 'speaking' ? 'bg-[#d76f45] animate-pulse' : voiceStatus === 'error' ? 'bg-[#b35034]' : 'bg-[#9eb2b8]'}`}/>{voiceStatus === 'listening' ? 'Listening' : voiceStatus === 'thinking' ? 'Thinking' : voiceStatus === 'speaking' ? 'Speaking' : voiceStatus === 'interrupted' ? 'Interrupted' : voiceStatus === 'error' ? 'Voice error' : openLiveReady ? 'OpenLive connected' : 'Voice ready'}</div><label className="mb-2 flex items-center gap-2 text-xs font-bold text-[#63818c]"><MessageCircle size={14}/> Interrupt & ask a question</label><div className="flex gap-2"><input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key === 'Enter' && ask()} placeholder="Why did you subtract 5?" className="min-w-0 flex-1 rounded-xl border border-[#c9d9d6] px-3 py-2.5 text-sm outline-none focus:border-[#d76f45]"/><button aria-label="Send question" onClick={ask} className="rounded-xl bg-[#17384a] px-3 text-white hover:bg-[#274f62]"><Send size={17}/></button></div></div></aside></div></div></div></main>
}

function TutorSpeech({ phase }: { phase: LessonPhase }) {
  const copy: Record<LessonPhase, string> = { welcome: 'Welcome! Today we will solve a linear equation by keeping both sides balanced. Ready to begin?', teaching: 'Look at the equation on the board. We want x on its own. First, we need to undo the + 5.', check: 'Your turn: what operation will undo + 5? Write your answer below.', remediation: 'A common mix-up is dividing too early. We first undo addition or subtraction, then multiplication or division.', practice: 'Excellent. We now have 3x = 15. What is x?', complete: 'You have completed this lesson step. You can revisit the board anytime to review the worked example.' }
  return <div className="rounded-2xl bg-[#fff5cf] px-4 py-3 text-sm leading-6 text-[#624c18]">{copy[phase]}</div>
}

function LessonControls({ phase, answer, setAnswer, teach, continueLesson, submitAnswer, setPhase }: { phase: LessonPhase; answer: string; setAnswer: (value:string)=>void; teach:()=>void; continueLesson:()=>void; submitAnswer:()=>void; setPhase:(p:LessonPhase)=>void }) {
  if (phase === 'welcome') return <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm text-[#527184]">Take your time. The tutor will reveal the solution one step at a time.</p><button onClick={teach} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#d76f45] px-4 py-2.5 font-bold text-white hover:bg-[#bd5933]"><Play size={16} fill="currentColor"/> Begin</button></div>
  if (phase === 'teaching') return <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm text-[#527184]">Why do we need to make the equation balanced?</p><button onClick={continueLesson} className="flex items-center gap-2 rounded-xl bg-[#d76f45] px-4 py-2.5 font-bold text-white hover:bg-[#bd5933]">I understand <ArrowRight size={16}/></button></div>
  if (phase === 'check' || phase === 'practice') return <form onSubmit={e=>{e.preventDefault();submitAnswer()}} className="mt-4 rounded-2xl bg-white p-4 shadow-sm"><label className="mb-2 block text-sm font-bold">{phase === 'practice' ? 'Find the value of x' : 'What should we do first?'}</label><div className="flex gap-2"><input autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={phase === 'practice' ? 'e.g. 5' : 'e.g. subtract 5 from both sides'} className="min-w-0 flex-1 rounded-xl border border-[#c9d9d6] px-3 py-3 outline-none focus:border-[#d76f45]"/><button className="rounded-xl bg-[#17384a] px-4 font-bold text-white hover:bg-[#274f62]">Check</button></div><p className="mt-2 text-xs text-[#6f8992]">A wrong answer is useful information — Ms Nandi will help you work through it.</p></form>
  if (phase === 'remediation') return <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-sm text-[#527184]"><Lightbulb className="text-[#d29321]" size={18}/> Notice how +5 and −5 cancel out.</p><button onClick={()=>setPhase('practice')} className="rounded-xl bg-[#d76f45] px-4 py-2.5 font-bold text-white hover:bg-[#bd5933]">Try the next step</button></div>
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#e0f2e5] p-4"><p className="flex items-center gap-2 font-bold text-[#27603b]"><Check/> Lesson step completed and saved</p><button onClick={()=>setPhase('welcome')} className="flex items-center gap-2 rounded-xl border border-[#8ab99a] bg-white px-4 py-2.5 font-bold text-[#27603b]"><BookOpen size={16}/> Review lesson</button></div>
}

export function App() { return <AppShell /> }
