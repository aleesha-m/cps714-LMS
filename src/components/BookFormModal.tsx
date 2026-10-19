import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { BookInput } from '../api'
import type { CatalogBook } from '../books'
import BookCover from './BookCover'
import { useModal } from './useModal'

interface BookFormModalProps {
  // null = adding a new book, otherwise editing this one
  book: CatalogBook | null
  genres: string[]
  onSave: (values: BookInput) => Promise<void>
  onClose: () => void
}

function BookFormModal({ book, genres, onSave, onClose }: BookFormModalProps) {
  const dialogRef = useModal(onClose)
  const editing = book !== null
  const [values, setValues] = useState<BookInput>({
    ISBN: book?.id ?? '',
    title: book?.title ?? '',
    author: book?.author ?? '',
    genre: book?.genre ?? '',
    cover: book?.cover ?? '',
    description: book?.description ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (field: keyof BookInput) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(values)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this book')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal modal-form" role="dialog" aria-modal="true" aria-labelledby="book-form-title" ref={dialogRef}>
        <button className="icon-button modal-close" aria-label="Close form" onClick={onClose}><X size={18} /></button>
        <h2 id="book-form-title">{editing ? 'Edit book' : 'Add a book'}</h2>
        <p className="modal-subtitle">{editing ? 'Update the details readers see in the catalog.' : 'Add a new title to the library catalog.'}</p>
        <form className="book-form" onSubmit={(event) => void submit(event)}>
          <div className="book-form-fields">
            <label htmlFor="book-isbn">ISBN</label>
            <input id="book-isbn" value={values.ISBN} onChange={set('ISBN')} disabled={editing} required maxLength={20} data-autofocus={editing ? undefined : true} />
            {editing && <small>The ISBN identifies the book and cannot be changed.</small>}

            <label htmlFor="book-title">Title</label>
            <input id="book-title" value={values.title} onChange={set('title')} required maxLength={200} data-autofocus={editing ? true : undefined} />

            <label htmlFor="book-author">Author</label>
            <input id="book-author" value={values.author} onChange={set('author')} required maxLength={120} />

            <label htmlFor="book-genre">Genre</label>
            <input id="book-genre" value={values.genre} onChange={set('genre')} list="genre-options" required maxLength={60} />
            <datalist id="genre-options">{genres.map((genre) => <option key={genre} value={genre} />)}</datalist>

            <label htmlFor="book-cover">Cover image link <span className="optional">(optional)</span></label>
            <input id="book-cover" type="url" value={values.cover} onChange={set('cover')} placeholder="https://..." />

            <label htmlFor="book-description">Description <span className="optional">(optional)</span></label>
            <textarea id="book-description" value={values.description} onChange={set('description')} rows={4} maxLength={1500} />
          </div>
          <div className="book-form-preview" aria-hidden="true">
            <span>Cover preview</span>
            <BookCover title={values.title || 'Untitled'} cover={values.cover.trim()} size="lg" />
          </div>
          {error && <p className="auth-error book-form-error" role="alert">{error}</p>}
          <div className="modal-actions book-form-actions">
            <button className="button button-primary" type="submit" disabled={saving}>{editing ? 'Save changes' : 'Add book'}</button>
            <button className="button button-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BookFormModal
