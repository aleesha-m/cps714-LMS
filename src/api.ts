export type Role = 'member' | 'librarian'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  profile_id: string
}

export interface ApiBook {
  _id: string
  ISBN: string
  title: string
  author: string
  genre: string
  available: boolean
  cover?: string
  description?: string
  // How many members are queued for this book, and this member's place in that queue (1 = next).
  queueLength: number
  myPosition: number | null
}

export interface BookInput {
  ISBN: string
  title: string
  author: string
  genre: string
  cover: string
  description: string
}

export interface ApiReservation {
  reservation_id: string
  user_id: string
  ISBN: string
  reserved_date: string
  status: 'active' | 'fulfilled' | 'cancelled'
}

export interface ApiLoan {
  loan_id: string
  user_id: string
  ISBN: string
  loan_date: string
  due_date: string
  return_date: string | null
}

export interface ApiMember {
  user_id: string
  name: string
  phone_num: string
  email: string
}

export interface SignupInput {
  name: string
  email: string
  password: string
  phone: string
  role: Role
  code: string
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Requests go to /api on the same origin (Vite proxies it to the Express server),
// so the httpOnly session cookie is sent automatically.
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, data.message ?? 'Something went wrong')
  return data as T
}

export const api = {
  me: () => request<User>('/auth/me'),
  login: (email: string, password: string) => request<User>('/auth/login', 'POST', { email, password }),
  signup: (input: SignupInput) => request<User>('/auth/signup', 'POST', input),
  logout: () => request<{ message: string }>('/auth/logout', 'POST'),
  books: () => request<ApiBook[]>('/books'),
  loans: () => request<ApiLoan[]>('/loans'),
  members: () => request<ApiMember[]>('/members'),
  checkOut: (ISBN: string) => request<ApiLoan>('/loans', 'POST', { ISBN }),
  returnLoan: (loanId: string) => request<unknown>(`/loans/${encodeURIComponent(loanId)}/return`, 'PUT'),
  addBook: (input: BookInput) => request<ApiBook>('/books', 'POST', input),
  updateBook: (isbn: string, input: Partial<Omit<BookInput, 'ISBN'>>) =>
    request<ApiBook>(`/books/${encodeURIComponent(isbn)}`, 'PUT', input),
  deleteBook: (isbn: string) => request<{ message: string }>(`/books/${encodeURIComponent(isbn)}`, 'DELETE'),
  reservations: () => request<ApiReservation[]>('/reservations'),
  reserve: (ISBN: string) => request<ApiReservation>('/reservations', 'POST', { ISBN }),
  cancelReservation: (id: string) => request<unknown>(`/reservations/${encodeURIComponent(id)}`, 'DELETE'),
}
