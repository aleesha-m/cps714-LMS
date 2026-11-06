import { useState, type FormEvent } from 'react'
import { BookmarkX, Check, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import type { ApiWishlist } from '../api'
import type { CatalogBook } from '../books'
import BookCover from './BookCover'

interface WishlistCardProps {
  item: ApiWishlist
  book?: CatalogBook
  working: boolean
  onProgress: (chaptersRead: number, totalChapters: number) => Promise<boolean>
  onRemove: () => void
}

function WishlistCard({ item, book, working, onProgress, onRemove }: WishlistCardProps) {
  const [chapterCount, setChapterCount] = useState(item.totalChapters ? String(item.totalChapters) : '')
  const [chaptersRead, setChaptersRead] = useState(String(item.chaptersRead))
  const [editingChapterCount, setEditingChapterCount] = useState(false)
  const progress = item.totalChapters > 0 ? Math.round((item.chaptersRead / item.totalChapters) * 100) : 0
  const title = book?.title ?? `Book no longer in catalog (${item.ISBN})`

  const chapterCountForm = (
    <form className="chapter-count-form" onSubmit={saveChapterCount}>
      <label htmlFor={`chapters-${item.ISBN}`}>{item.totalChapters > 0 ? 'Total chapters' : 'How many chapters are in this book?'}</label>
      <div>
        <input
          id={`chapters-${item.ISBN}`}
          type="number"
          min="1"
          max="10000"
          step="1"
          required
          value={chapterCount}
          onChange={(event) => setChapterCount(event.target.value)}
        />
        <button className="button button-secondary" type="submit" disabled={working}>{item.totalChapters > 0 ? 'Save count' : 'Set chapters'}</button>
      </div>
    </form>
  )

  function saveChapterCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const total = Number(chapterCount)
    if (Number.isInteger(total) && total > 0 && total <= 10000) {
      void saveChapterTotal(Math.min(item.chaptersRead, total), total)
    }
  }

  function saveChaptersRead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const read = Number(chaptersRead)
    if (chaptersRead.trim() && Number.isInteger(read) && read >= 0 && read <= item.totalChapters) {
      void saveProgress(read, item.totalChapters)
    }
  }

  async function saveProgress(read: number, total: number) {
    if (await onProgress(read, total)) {
      setChapterCount(String(total))
      setChaptersRead(String(read))
    }
  }

  async function saveChapterTotal(read: number, total: number) {
    if (await onProgress(read, total)) {
      setChapterCount(String(total))
      setChaptersRead(String(read))
      setEditingChapterCount(false)
    }
  }

  return (
    <article className="wishlist-card">
      <BookCover title={title} cover={book?.cover ?? ''} size="sm" />
      <div className="wishlist-card-content">
        <div className="wishlist-card-heading">
          <div>
            <h2>{title}</h2>
            <p>{book?.author ?? item.ISBN}</p>
          </div>
          <button className="icon-button wishlist-remove" aria-label={`Remove ${title} from wishlist`} title="Remove from wishlist" disabled={working} onClick={onRemove}>
            <BookmarkX size={17} />
          </button>
        </div>

        {item.totalChapters > 0 ? (
          <>
            <div className="reading-progress-label">
              <span>{item.chaptersRead} of {item.totalChapters} chapters</span>
              <strong>{progress}%</strong>
            </div>
            <div className="reading-progress-row">
              <div
                className="reading-progress-track"
                role="progressbar"
                aria-label={`Reading progress for ${title}`}
                aria-valuemin={0}
                aria-valuemax={item.totalChapters}
                aria-valuenow={item.chaptersRead}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <button
                className="chapter-count-toggle"
                type="button"
                aria-label={editingChapterCount ? 'Close chapter settings' : 'Edit chapter progress and total'}
                aria-expanded={editingChapterCount}
                aria-controls={`chapter-settings-${item.ISBN}`}
                title="Edit chapter settings"
                onClick={() => setEditingChapterCount((editing) => !editing)}
              >
                {editingChapterCount ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            {editingChapterCount && (
              <div id={`chapter-settings-${item.ISBN}`} className="chapter-settings-panel">
                <form className="chapter-progress-form" onSubmit={saveChaptersRead}>
                  <label htmlFor={`read-${item.ISBN}`}>Chapters read</label>
                  <input
                    id={`read-${item.ISBN}`}
                    type="number"
                    min="0"
                    max={item.totalChapters}
                    step="1"
                    required
                    value={chaptersRead}
                    onChange={(event) => setChaptersRead(event.target.value)}
                  />
                  <button className="chapter-count-toggle" type="submit" disabled={working} aria-label="Save chapters read" title="Save chapters read">
                    <Check size={14} />
                  </button>
                </form>
                <form id={`total-chapters-${item.ISBN}`} className="chapter-total-edit-form" onSubmit={saveChapterCount}>
                  <label htmlFor={`chapters-${item.ISBN}`}>Total chapters</label>
                  <input
                    id={`chapters-${item.ISBN}`}
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    required
                    value={chapterCount}
                    onChange={(event) => setChapterCount(event.target.value)}
                  />
                  <button className="chapter-count-toggle" type="submit" disabled={working} aria-label="Save total chapter count" title="Save total chapter count">
                    <Check size={14} />
                  </button>
                </form>
              </div>
            )}
            <div className="wishlist-progress-controls">
              <div className="wishlist-card-actions">
                <button className="button button-primary chapter-button" disabled={working || item.chaptersRead === item.totalChapters} onClick={() => void saveProgress(item.chaptersRead + 1, item.totalChapters)}>
                  {item.chaptersRead === item.totalChapters ? <Check size={14} /> : <Plus size={14} />}
                  {item.chaptersRead === item.totalChapters ? 'Finished' : 'Read a chapter'}
                </button>
              </div>
            </div>
          </>
        ) : (
          chapterCountForm
        )}
      </div>
    </article>
  )
}

export default WishlistCard
