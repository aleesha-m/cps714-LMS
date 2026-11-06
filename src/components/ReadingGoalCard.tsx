import { useState, type FormEvent } from 'react'
import { Check, Flame, Target } from 'lucide-react'
import type { ApiReadingGoal } from '../api'

interface ReadingGoalCardProps {
  goal: ApiReadingGoal
  working: boolean
  onSave: (targetBooks: number) => Promise<boolean>
}

function ReadingGoalCard({ goal, working, onSave }: ReadingGoalCardProps) {
  const [target, setTarget] = useState(String(goal.targetBooks))
  const progress = Math.min(100, Math.round((goal.booksCompleted / goal.targetBooks) * 100))

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = Number(target)
    if (Number.isInteger(value) && value >= 1 && value <= 1000 && await onSave(value)) {
      setTarget(String(value))
    }
  }

  return (
    <section className="reading-goal-card" aria-label={`${goal.year} reading goal`}>
      <div className="reading-goal-main">
        <div className="reading-goal-title">
          <span className="reading-goal-icon"><Target size={16} /></span>
          <div>
            <h2>{goal.year} reading goal</h2>
            <p>{goal.booksCompleted} of {goal.targetBooks} books completed</p>
          </div>
        </div>
        <div className="reading-goal-track" role="progressbar" aria-label="Yearly reading goal progress" aria-valuemin={0} aria-valuemax={goal.targetBooks} aria-valuenow={goal.booksCompleted}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      <form className="reading-goal-form" onSubmit={(event) => void saveGoal(event)}>
        <label htmlFor="reading-goal-target">Goal</label>
        <input id="reading-goal-target" type="number" min="1" max="1000" step="1" required value={target} onChange={(event) => setTarget(event.target.value)} />
        <button type="submit" disabled={working} aria-label="Save yearly reading goal" title="Save reading goal"><Check size={14} /></button>
      </form>
      <div className="reading-streak" title="Consecutive days logging reading progress">
        <Flame size={15} />
        <strong>{goal.currentStreak}</strong>
        <span>day streak</span>
      </div>
    </section>
  )
}

export default ReadingGoalCard
