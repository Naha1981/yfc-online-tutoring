// Lesson engine intentionally has no React dependency. It is the seam between the
// classroom UI and a future session API / tutor provider.
export type BoardAction = {
  id: string
  type: 'WRITE' | 'UNDERLINE' | 'BOX' | 'ARROW' | 'HIGHLIGHT'
  content?: string
  x: number
  y: number
  target?: string
}

export type LessonPhase = 'welcome' | 'teaching' | 'check' | 'remediation' | 'practice' | 'complete'
export type LessonMessage = { role: 'teacher' | 'learner'; text: string }
export type GradeResult = { correct: boolean; misconception?: 'premature-division' | 'unknown'; feedback: string; nextPhase: LessonPhase }

export const linearEquationBoard: BoardAction[] = [
  { id: 'equation', type: 'WRITE', content: '3x + 5 = 20', x: 50, y: 38 },
  { id: 'prompt', type: 'WRITE', content: 'Let’s solve for x.', x: 50, y: 105 },
]

export function lessonStorageKey(grade: string, subject: string, topic: string) {
  return `nahalabs:tutor:${grade}:${subject}:${topic}`
}

export function lessonProgress(phase: LessonPhase) {
  const values: Record<LessonPhase, number> = { welcome: 8, teaching: 22, check: 35, remediation: 48, practice: 78, complete: 100 }
  return values[phase]
}

function normalise(text: string) {
  return text.toLowerCase().replace(/[\s.,]/g, '')
}

export function gradeFirstStep(answer: string): GradeResult {
  const normalised = normalise(answer)
  const correct = normalised.includes('subtract5') || normalised.includes('minus5') || normalised.includes('-5')
  if (correct) return {
    correct: true,
    feedback: 'Exactly. We subtract 5 from both sides to keep the equation balanced.',
    nextPhase: 'practice',
  }
  return {
    correct: false,
    misconception: normalised.includes('divide') ? 'premature-division' : 'unknown',
    feedback: 'You are close. The +5 is attached to 3x, so we undo it by subtracting 5 from both sides.',
    nextPhase: 'remediation',
  }
}

export function gradePracticeAnswer(answer: string): GradeResult {
  const normalised = normalise(answer)
  const correct = normalised === '5' || normalised === 'x=5'
  return correct
    ? { correct: true, feedback: 'Well done — x = 5. You kept the equation balanced at every step.', nextPhase: 'complete' }
    : { correct: false, misconception: 'unknown', feedback: 'Try once more: 15 divided by 3 equals…', nextPhase: 'practice' }
}

export function tutorInterruptionAnswer(question: string) {
  return question.toLowerCase().includes('why')
    ? 'Great question. We subtract 5 because it cancels the +5. Whatever we do to one side, we do to the other so the equation stays balanced. Now, let’s return to your step.'
    : 'That is a thoughtful question. For this lesson, remember that an equation is balanced when both sides have the same value. Let’s return to where we were.'
}
