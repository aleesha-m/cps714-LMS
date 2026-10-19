import { useState } from 'react'
import { Bookmark, BookmarkX, Pencil, Trash2, X } from 'lucide-react'
import { canCheckOut, statusClass, type CatalogBook } from '../books'
import BookCover from './BookCover'
import { useModal } from './useModal'

interface BookDetailModalProps {
  book: CatalogBook
  isLibrarian: boolean
  hasLoan: boolean
  working: boolean
  message: string
  onClose: () => void
  onCheckOut: () => void
  onReserve: () => void
  onCancelReservation: () => void
  onEdit: () => void
  onDelete: () => void
}

function BookDetailModal({
  book, isLibrarian, hasLoan, working, message,
  onClose, onCheckOut, onReserve, onCancelReservation, onEdit, onDelete,
}: BookDetailModalProps) {
  const dialogRef = useModal(onClose)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const inQueue = book.myPosition !== null
  const ready = book.status === 'Ready for you'

  let note = ''
  if (!isLibrarian) {
    if (hasLoan) note = 'You currently have this book checked out.'
    else if (ready) note = 'This book has been held for you. Check it out whenever you are ready.'
    else if (inQueue) note = `You are number ${book.myPosition} in line for this book.`
    else if (!canCheckOut(book)) note = 'Reserve it and you will be next in line when it comes back.'
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal modal-book" role="dialog" aria-modal="true" aria-labelledby="book-modal-title" ref={dialogRef}>
        <button className="icon-button modal-close" aria-label="Close book details" onClick={onClose} data-autofocus><X size={18} /></button>
        <div className="book-detail">
          <BookCover title={book.title} cover={book.cover} size="lg" />
          <div className="book-detail-body">
            <span className={`status ${statusClass(book.status)}`}><i />{book.status}</span>
            <h2 id="book-modal-title">{book.title}</h2>
            <p className="book-detail-author">by {book.author}</p>
            <p className="book-detail-description">{book.description || 'No description has been added for this book yet.'}</p>
            <dl className="book-facts">
              <div><dt>Genre</dt><dd>{book.genre}</dd></div>
              <div><dt>ISBN</dt><dd className="book-id">{book.id}</dd></div>
              <div><dt>Waiting list</dt><dd>{book.queueLength === 0 ? 'No one waiting' : `${book.queueLength} waiting`}</dd></div>
            </dl>

            {message && <p className="notice" role="status">{message}</p>}
            {note && <p className="book-note">{note}</p>}

            {confirmingDelete ? (
              <div className="delete-confirm" role="alertdialog" aria-label="Confirm delete">
                <p>Delete <strong>{book.title}</strong>? Any reservations for it will be cancelled, and this cannot be undone.</p>
                <div className="modal-actions">
                  <button className="button button-danger" disabled={working} onClick={onDelete}><Trash2 size={15} /> Delete book</button>
                  <button className="button button-secondary" disabled={working} onClick={() => setConfirmingDelete(false)}>Keep book</button>
                </div>
              </div>
            ) : (
              <div className="modal-actions">
                {!hasLoan && canCheckOut(book) && (
                  <button className="button button-primary" disabled={working} onClick={onCheckOut}>Check out</button>
                )}
                {!isLibrarian && !hasLoan && !inQueue && !canCheckOut(book) && (
                  <button className="button button-primary" disabled={working} onClick={onReserve}><Bookmark size={15} /> Reserve this book</button>
                )}
                {!isLibrarian && inQueue && (
                  <button className="button button-secondary" disabled={working} onClick={onCancelReservation}><BookmarkX size={15} /> Cancel reservation</button>
                )}
                {isLibrarian && (
                  <>
                    <button className="button button-secondary" disabled={working} onClick={onEdit}><Pencil size={15} /> Edit</button>
                    <button className="button button-secondary button-danger-outline" disabled={working || !book.available} onClick={() => setConfirmingDelete(true)}><Trash2 size={15} /> Delete</button>
                  </>
                )}
              </div>
            )}
            {isLibrarian && !book.available && !confirmingDelete && <p className="book-note">Check this book in before deleting it.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookDetailModal
