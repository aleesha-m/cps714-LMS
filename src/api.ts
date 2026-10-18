export type Role = 'member' | 'librarian'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  profile_id: string
}

export interface ApiBook {
  ISBN: string
  title: string
  author: string
  genre: string
  available: boolean
  cover?: string
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
}
