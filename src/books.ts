import type { ApiBook } from './api'

export type BookStatus = 'Available' | 'Ready for you' | 'Reserved' | 'Checked out'
export type AvailabilityFilter = 'all' | 'available' | 'checked-out'
export type SortKey = 'title-asc' | 'title-desc' | 'author-asc' | 'genre-asc' | 'newest'

export interface CatalogBook {
  id: string
  addedKey: string
  title: string
  author: string
  genre: string
  cover: string
  description: string
  available: boolean
  queueLength: number
  myPosition: number | null
  status: BookStatus
}

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'author-asc', label: 'Author A–Z' },
  { value: 'genre-asc', label: 'Genre' },
  { value: 'newest', label: 'Newest first' },
]

// Available            -> on the shelf, anyone can borrow it
// Ready for you        -> on the shelf, and you are first in the reservation queue
// Reserved             -> on the shelf, but being held for someone else in the queue
// Checked out          -> on loan
function statusOf(book: ApiBook): BookStatus {
  if (!book.available) return 'Checked out'
  if (book.queueLength > 0) return book.myPosition === 1 ? 'Ready for you' : 'Reserved'
  return 'Available'
}

export function toCatalogBook(book: ApiBook): CatalogBook {
  return {
    id: book.ISBN,
    addedKey: book._id,
    title: book.title,
    author: book.author,
    genre: book.genre,
    cover: book.cover ?? '',
    description: book.description ?? '',
    available: book.available,
    queueLength: book.queueLength ?? 0,
    myPosition: book.myPosition ?? null,
    status: statusOf(book),
  }
}

export const statusClass = (status: BookStatus) => `status-${status.toLowerCase().replace(/\s+/g, '-')}`

// Can this person borrow the book right now? (The server enforces the same rule.)
export const canCheckOut = (book: CatalogBook) => book.status === 'Available' || book.status === 'Ready for you'

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

export function sortBooks(list: CatalogBook[], sort: SortKey): CatalogBook[] {
  const copy = [...list]
  switch (sort) {
    case 'title-asc': return copy.sort((a, b) => collator.compare(a.title, b.title))
    case 'title-desc': return copy.sort((a, b) => collator.compare(b.title, a.title))
    case 'author-asc': return copy.sort((a, b) => collator.compare(a.author, b.author) || collator.compare(a.title, b.title))
    case 'genre-asc': return copy.sort((a, b) => collator.compare(a.genre, b.genre) || collator.compare(a.title, b.title))
    // MongoDB ids start with a creation timestamp, so a later id means a book added later.
    case 'newest': return copy.sort((a, b) => (a.addedKey < b.addedKey ? 1 : a.addedKey > b.addedKey ? -1 : 0))
  }
}

export function filterBooks(list: CatalogBook[], query: string, genre: string, availability: AvailabilityFilter) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return list.filter((book) => {
    const haystack = `${book.title} ${book.author} ${book.genre} ${book.id}`.toLowerCase()
    if (!words.every((word) => haystack.includes(word))) return false
    if (genre !== 'All genres' && book.genre !== genre) return false
    if (availability === 'available') return book.available
    if (availability === 'checked-out') return !book.available
    return true
  })
}
