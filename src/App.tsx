import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookCopy,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Bookmark,
  ChevronDown,
  CircleHelp,
  Clock3,
  History as HistoryIcon,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  UsersRound,
} from 'lucide-react'
import { api, ApiError, type ApiBook, type ApiLoan, type ApiMember, type ApiReservation, type BookInput, type MemberInput, type Role, type User } from './api'
import { canCheckOut, filterBooks, sortBooks, sortOptions, statusClass, toCatalogBook, type AvailabilityFilter, type SortKey } from './books'
import BookCover from './components/BookCover'
import BookDetailModal from './components/BookDetailModal'
import BookFormModal from './components/BookFormModal'
import MemberFormModal from './components/MemberFormModal'
import './App.css'

type Section = 'Overview' | 'Catalog' | 'Members' | 'Loans' | 'History' | 'Reservations' | 'Settings' | 'Help & support'
type LandingSection = 'Overview' | 'Catalog' | 'Loans' | 'History'

function getLandingSection(role: Role, profileId: string): LandingSection {
  const saved = localStorage.getItem(`lms-default-view:${profileId}`)
  const allowed: LandingSection[] = role === 'librarian' ? ['Overview', 'Catalog', 'Loans'] : ['Catalog', 'Loans', 'History']
  return allowed.includes(saved as LandingSection) ? saved as LandingSection : role === 'librarian' ? 'Overview' : 'Catalog'
}

function sectionLabel(section: Section, isLibrarian: boolean) {
  switch (section) {
    case 'Catalog': return 'Browse'
    case 'Loans': return isLibrarian ? 'Loans' : 'My loans'
    case 'History': return 'Borrowing history'
    case 'Reservations': return isLibrarian ? 'Reservations' : 'My reservations'
    default: return section
  }
}

function sectionBlurb(section: Section, isLibrarian: boolean) {
  switch (section) {
    case 'Catalog': return isLibrarian ? 'Browse, search, and manage every title in your collection.' : 'Find your next read. Search, filter, and sort the whole collection.'
    case 'Members': return 'Get to know the people who make this library.'
    case 'Loans': return isLibrarian ? 'Keep track of checkouts, returns, and what’s due.' : 'Books you have checked out, and when they’re due back.'
    case 'History': return 'Every book you have borrowed, and when it went back.'
    case 'Reservations': return isLibrarian ? 'Members waiting for books that are checked out.' : 'Books you are waiting for. We will hold each one when it comes back.'
    case 'Settings': return 'Manage your account details and sign-in destination.'
    case 'Help & support': return 'Find help with borrowing, catalog tasks, and account access.'
    default: return ''
  }
}

type BookFormState = { mode: 'add' } | { mode: 'edit'; isbn: string } | null

const avatarColors = ['sage', 'peach', 'lavender']

function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function formatDue(iso: string) {
  const due = new Date(iso)
  const today = new Date()
  if (due.toDateString() === today.toDateString()) return 'Today'
  return due.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [signupRole, setSignupRole] = useState<Role>('member')
  const [authError, setAuthError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [apiBooks, setApiBooks] = useState<ApiBook[]>([])
  const [apiLoans, setApiLoans] = useState<ApiLoan[]>([])
  const [apiMembers, setApiMembers] = useState<ApiMember[]>([])
  const [apiReservations, setApiReservations] = useState<ApiReservation[]>([])
  const [dashboardNow, setDashboardNow] = useState(0)
  const [defaultView, setDefaultView] = useState<LandingSection>('Catalog')
  const [activeSection, setActiveSection] = useState<Section>('Overview')
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('All genres')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [sort, setSort] = useState<SortKey>('title-asc')
  const [selectedIsbn, setSelectedIsbn] = useState<string | null>(null)
  const [bookForm, setBookForm] = useState<BookFormState>(null)
  const [memberFormOpen, setMemberFormOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isLibrarian = user?.role === 'librarian'

  const books = useMemo(() => apiBooks.map(toCatalogBook), [apiBooks])
  const genres = useMemo(() => [...new Set(books.map((book) => book.genre))].sort((a, b) => a.localeCompare(b)), [books])
  const genreFilter = genres.includes(genre) ? genre : 'All genres'
  const filteredBooks = useMemo(
    () => sortBooks(filterBooks(books, query, genreFilter, availability), sort),
    [books, query, genreFilter, availability, sort],
  )
  const filtersActive = query !== '' || genreFilter !== 'All genres' || availability !== 'all'
  const newestBooks = useMemo(() => sortBooks(books, 'newest'), [books])
  const selectedBook = books.find((book) => book.id === selectedIsbn) ?? null
  const editingBook = bookForm?.mode === 'edit' ? books.find((book) => book.id === bookForm.isbn) ?? null : null
  const myActiveLoanIsbns = useMemo(
    () => new Set(apiLoans.filter((loan) => !loan.return_date && loan.user_id === user?.profile_id).map((loan) => loan.ISBN)),
    [apiLoans, user],
  )
  const loanRows = useMemo(
    () => apiLoans
      .filter((loan) => !loan.return_date)
      .sort((x, y) => new Date(x.due_date).getTime() - new Date(y.due_date).getTime())
      .map((loan, index) => {
        const member = loan.user_id === user?.profile_id
          ? user.name
          : apiMembers.find((m) => m.user_id === loan.user_id)?.name ?? loan.user_id
        return {
          loanId: loan.loan_id,
          member: isLibrarian ? member : 'you',
          initials: initialsOf(member),
          book: apiBooks.find((b) => b.ISBN === loan.ISBN)?.title ?? loan.ISBN,
          due: formatDue(loan.due_date),
          overdue: new Date(loan.due_date).getTime() < dashboardNow,
          color: avatarColors[index % 3],
        }
      }),
    [apiLoans, apiBooks, apiMembers, user, isLibrarian, dashboardNow],
  )
  const dueSoon = loanRows.slice(0, 3)
  const overdueCount = loanRows.filter((loan) => loan.overdue).length
  const circulationByDay = useMemo(() => {
    const lastDay = new Date(dashboardNow)
    lastDay.setHours(0, 0, 0, 0)
    const firstDay = new Date(lastDay)
    firstDay.setDate(firstDay.getDate() - 6)
    const checkoutsByDay = new Map<number, number>()

    for (const loan of apiLoans) {
      const loanDay = new Date(loan.loan_date)
      loanDay.setHours(0, 0, 0, 0)
      const timestamp = loanDay.getTime()
      if (timestamp >= firstDay.getTime() && timestamp <= lastDay.getTime()) {
        checkoutsByDay.set(timestamp, (checkoutsByDay.get(timestamp) ?? 0) + 1)
      }
    }

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(firstDay)
      day.setDate(firstDay.getDate() + index)
      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        count: checkoutsByDay.get(day.getTime()) ?? 0,
      }
    })
  }, [apiLoans, dashboardNow])
  const circulationTotal = circulationByDay.reduce((total, day) => total + day.count, 0)
  const circulationScale = Math.max(4, Math.ceil(Math.max(...circulationByDay.map((day) => day.count)) / 4) * 4)
  const circulationTicks = [4, 3, 2, 1, 0].map((step) => (circulationScale * step) / 4)
  const circulationPoints = circulationByDay
    .map((day, index) => `${index * (600 / (circulationByDay.length - 1))},${140 - (day.count / circulationScale) * 120}`)
    .join(' ')
  const circulationAreaPoints = `0,140 ${circulationPoints} 600,140`
  const historyRows = useMemo(
    () => [...apiLoans]
      .sort((x, y) => new Date(y.loan_date).getTime() - new Date(x.loan_date).getTime())
      .map((loan) => {
        const book = apiBooks.find((b) => b.ISBN === loan.ISBN)
        const overdue = !loan.return_date && new Date(loan.due_date).getTime() < dashboardNow
        return {
          loanId: loan.loan_id,
          title: book?.title ?? loan.ISBN,
          author: book?.author ?? 'Book no longer in the catalog',
          cover: book?.cover ?? '',
          borrowed: formatDate(loan.loan_date),
          overdue,
          status: loan.return_date ? `Returned ${formatDate(loan.return_date)}` : overdue ? `Overdue since ${formatDate(loan.due_date)}` : `Due ${formatDue(loan.due_date)}`,
        }
      }),
    [apiLoans, apiBooks, dashboardNow],
  )
  const reservationRows = useMemo(() => {
    // Librarians receive every reservation, oldest first, so counting per book gives each one its place
    // in line. Members only receive their own, so their place comes from the book itself.
    const placeInLine = new Map<string, number>()
    return apiReservations.map((reservation) => {
      const book = apiBooks.find((b) => b.ISBN === reservation.ISBN)
      const counted = (placeInLine.get(reservation.ISBN) ?? 0) + 1
      placeInLine.set(reservation.ISBN, counted)
      const position = reservation.queue_position
      const memberName = reservation.user_id === user?.profile_id
        ? user.name
        : apiMembers.find((m) => m.user_id === reservation.user_id)?.name ?? reservation.user_id
      return {
        reservationId: reservation.reservation_id,
        isbn: reservation.ISBN,
        title: book?.title ?? reservation.ISBN,
        author: book?.author ?? '',
        cover: book?.cover ?? '',
        reserved: formatDate(reservation.reserved_date),
        position,
        ready: Boolean(book?.available) && position === 1,
        estimatedReady: reservation.estimated_ready_date,
        member: memberName,
      }
    })
  }, [apiReservations, apiBooks, apiMembers, user])

  const loadData = useCallback(async (current: User) => {
    try {
      const [booksData, loansData, membersData, reservationsData] = await Promise.all([
        api.books(),
        api.loans(),
        current.role === 'librarian' ? api.members() : Promise.resolve<ApiMember[]>([]),
        api.reservations(),
      ])
      setDashboardNow(Date.now())
      setApiBooks(booksData)
      setApiLoans(loansData)
      setApiMembers(membersData)
      setApiReservations(reservationsData)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null)
        setAuthError('Your session expired. Please sign in again.')
      } else {
        setNotice(error instanceof Error ? error.message : 'Could not load data')
      }
    }
  }, [])

  useEffect(() => {
    api.me()
      .then((current) => {
        setUser(current)
        const landing = getLandingSection(current.role, current.profile_id)
        setDefaultView(landing)
        setActiveSection(landing)
      })
      .catch(() => undefined)
      .finally(() => setCheckingSession(false))
  }, [])

  useEffect(() => {
    if (user) void loadData(user)
  }, [user, loadData])

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? '')
    setBusy(true)
    setAuthError('')
    try {
      const signedIn = authMode === 'signin'
        ? await api.login(field('email'), field('password'))
        : await api.signup({
            name: field('name'),
            email: field('email'),
            password: field('password'),
            phone: field('phone'),
            role: signupRole,
            code: field('code'),
          })
      setUser(signedIn)
      const landing = getLandingSection(signedIn.role, signedIn.profile_id)
      setDefaultView(landing)
      setActiveSection(landing)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    await api.logout().catch(() => undefined)
    setUser(null)
    setApiBooks([])
    setApiLoans([])
    setApiMembers([])
    setApiReservations([])
    setSelectedIsbn(null)
    setBookForm(null)
    setNotice('')
    setAuthError('')
  }

  async function runAction(action: () => Promise<unknown>, success: string): Promise<boolean> {
    setNotice('')
    setWorking(true)
    try {
      await action()
      setNotice(success)
      if (user) await loadData(user)
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null)
        setAuthError('Your session expired. Please sign in again.')
      } else {
        setNotice(error instanceof Error ? error.message : 'Something went wrong')
      }
      return false
    } finally {
      setWorking(false)
    }
  }

  function goTo(section: Section) {
    setActiveSection(section)
    setQuery('')
    setMobileNavOpen(false)
  }

  function openBook(isbn: string) {
    setNotice('')
    setSelectedIsbn(isbn)
  }

  function openAddBook() {
    setNotice('')
    setActiveSection('Catalog')
    setBookForm({ mode: 'add' })
  }

  function openAddMember() {
    setNotice('')
    goTo('Members')
    setMemberFormOpen(true)
  }

  function openEditBook(isbn: string) {
    setNotice('')
    setSelectedIsbn(null)
    setBookForm({ mode: 'edit', isbn })
  }

  function closeBookForm() {
    if (bookForm?.mode === 'edit') setSelectedIsbn(bookForm.isbn)
    setBookForm(null)
  }

  async function saveBook(values: BookInput) {
    if (!user || !bookForm) return
    try {
      if (bookForm.mode === 'edit') {
        const { title, author, genre, cover, description } = values
        await api.updateBook(bookForm.isbn, { title, author, genre, cover, description })
      } else {
        await api.addBook(values)
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null)
        setAuthError('Your session expired. Please sign in again.')
        return
      }
      throw error
    }
    await loadData(user)
    setNotice(bookForm.mode === 'edit' ? 'Book updated.' : 'Book added.')
    if (bookForm.mode === 'edit') setSelectedIsbn(bookForm.isbn)
    setBookForm(null)
  }

  async function saveMember(values: MemberInput) {
    if (!user) return
    try {
      const savedMember = await api.addMember(values)
      setApiMembers((members) => [...members, savedMember])
      setMemberFormOpen(false)
      setNotice(values.role === 'librarian' ? 'Librarian account created.' : 'Member account created.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null)
        setAuthError('Your session expired. Please sign in again.')
        return
      }
      throw error
    }
  }

  async function deleteBook(isbn: string) {
    if (await runAction(() => api.deleteBook(isbn), 'Book deleted.')) setSelectedIsbn(null)
  }

  async function checkOutBook(isbn: string) {
    const checkedOut = await runAction(() => api.checkOut(isbn), 'Book checked out.')
    if (checkedOut && !isLibrarian) {
      setSelectedIsbn(null)
      goTo('Loans')
    }
  }

  function changeDefaultView(view: LandingSection) {
    if (!user) return
    setDefaultView(view)
    localStorage.setItem(`lms-default-view:${user.profile_id}`, view)
    setNotice('Default page saved for this browser.')
  }
  async function reserveBook(isbn: string) {
    const reserved = await runAction(() => api.reserve(isbn), 'Book reserved. Your place in line is now available in Reservations.')
    if (reserved && !isLibrarian) {
      setSelectedIsbn(null)
      goTo('Reservations')
    }
  }
  const cancelReservation = (reservationId: string) => runAction(() => api.cancelReservation(reservationId), 'Reservation cancelled.')

  if (checkingSession) return null

  if (!user) {
    return (
      <main className="login-page">
        <section className="login-visual" aria-label="A quiet library reading room">
          <div className="visual-topline">
            <a className="brand brand-light" href="#home" aria-label="Commonplace home">
              <span className="brand-mark"><LibraryBig size={18} strokeWidth={1.8} /></span>
              <span>commonplace<span className="brand-period">.</span></span>
            </a>
            <span className="edition-tag">LIBRARY MANAGEMENT</span>
          </div>
          <div className="visual-caption">
            <span className="eyebrow eyebrow-light">A place for every story</span>
            <h1>Keep good<br />stories moving.</h1>
            <p>A thoughtful space to care for your collection and the people who love it.</p>
            <div className="visual-credit"><span className="credit-line" /> THE READING ROOM <span>·</span> EST. 1986</div>
          </div>
          <div className="visual-index"><span>01</span><span className="index-track"><i /></span><span>03</span></div>
        </section>

        <section className="login-panel">
          <div className="login-mobile-brand">
            <span className="brand-mark"><LibraryBig size={18} strokeWidth={1.8} /></span>
            commonplace<span className="brand-period">.</span>
          </div>
          <div className="login-form-wrap">
            <div className="login-heading">
              <span className="eyebrow">{authMode === 'signin' ? 'WELCOME BACK' : 'JOIN THE LIBRARY'}</span>
              <h2>Your library,<br />in good hands.</h2>
              <p>{authMode === 'signin' ? 'Sign in to manage your collection and community.' : 'Create an account to borrow books and manage your loans.'}</p>
            </div>
            <form className="login-form" onSubmit={submitAuth}>
              {authMode === 'signup' && (
                <>
                  <label htmlFor="name">Full name</label>
                  <input id="name" name="name" type="text" placeholder="Your name" autoComplete="name" maxLength={50} required />
                </>
              )}
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" placeholder="you@yourlibrary.org" autoComplete="username" required />
              {authMode === 'signup' && (
                <>
                  <label htmlFor="phone">Phone number{signupRole === 'librarian' ? ' (optional)' : ''}</label>
                  <input id="phone" name="phone" type="tel" placeholder="416-555-0123" autoComplete="tel" required={signupRole === 'member'} />
                  <label htmlFor="role">I am a</label>
                  <select id="role" name="role" className="auth-select" value={signupRole} onChange={(event) => setSignupRole(event.target.value as Role)}>
                    <option value="member">Library member</option>
                    <option value="librarian">Librarian</option>
                  </select>
                  {signupRole === 'librarian' && (
                    <>
                      <label htmlFor="code">Librarian invite code</label>
                      <input id="code" name="code" type="password" placeholder="Ask your head librarian" autoComplete="off" required />
                    </>
                  )}
                </>
              )}
              <div className="password-label"><label htmlFor="password">Password</label>{authMode === 'signin' && <a href="#forgot">Forgot password?</a>}</div>
              <input id="password" name="password" type="password" placeholder={authMode === 'signin' ? 'Enter your password' : 'At least 8 characters'} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} minLength={authMode === 'signup' ? 8 : undefined} required />
              {authError && <p className="auth-error" role="alert">{authError}</p>}
              <button className="button button-primary sign-in-button" type="submit" disabled={busy}>{authMode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button>
            </form>
            <div className="login-divider"><span /> or <span /></div>
            <button className="button button-secondary demo-button" type="button" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError('') }}>
              {authMode === 'signin' ? 'Create an account' : 'I already have an account'}
            </button>
            <p className="login-help">Need a hand? <a href="mailto:hello@commonplace.library">Get in touch</a></p>
          </div>
          <footer className="login-footer"><span>© 2026 Commonplace Library</span><a href="#privacy">Privacy</a><a href="#support">Support</a></footer>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard-shell">
      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand sidebar-brand" href="#dashboard">
          <span className="brand-mark"><LibraryBig size={18} strokeWidth={1.8} /></span>
          <span>commonplace<span className="brand-period">.</span></span>
        </a>
        <div className="library-switcher">
          <div className="library-avatar"><BookOpen size={17} /></div>
          <div className="library-details"><strong>Northwood Library</strong><span>Community branch</span></div>
          <ChevronDown size={15} />
        </div>
        <span className="side-label">WORKSPACE</span>
        <nav className="side-nav" aria-label="Main navigation">
          {([
            ['Overview', LayoutDashboard],
            ['Catalog', BookCopy],
            ['Members', UsersRound],
            ['Loans', ArrowDownToLine],
            ['Reservations', Bookmark],
            ['History', HistoryIcon],
          ] as const).filter(([section]) => isLibrarian ? section !== 'History' : section !== 'Overview' && section !== 'Members').map(([section, Icon]) => (
            <button key={section} className={`nav-link ${activeSection === section ? 'nav-link-active' : ''}`} onClick={() => goTo(section)}>
              <Icon size={17} strokeWidth={1.8} /><span>{sectionLabel(section, isLibrarian)}</span>
              {section === 'Loans' && loanRows.length > 0 && <span className="nav-count">{loanRows.length}</span>}
              {section === 'Reservations' && reservationRows.length > 0 && <span className="nav-count">{reservationRows.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className={`nav-link ${activeSection === 'Settings' ? 'nav-link-active' : ''}`} onClick={() => goTo('Settings')}><Settings2 size={17} /><span>Settings</span></button>
          <button className={`nav-link ${activeSection === 'Help & support' ? 'nav-link-active' : ''}`} onClick={() => goTo('Help & support')}><CircleHelp size={17} /><span>Help & support</span></button>
          <div className="sidebar-user">
            <div className="user-avatar">{initialsOf(user.name)}</div>
            <div className="user-info"><strong>{user.name}</strong><span>{isLibrarian ? 'Librarian' : 'Member'}</span></div>
            <button className="icon-button sign-out" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Northwood Library</span><span className="breadcrumb-slash">/</span><strong>{sectionLabel(activeSection, isLibrarian)}</strong></div>
          <div className="topbar-actions">
            <div className="topbar-date"><CalendarDays size={15} /><span>Thursday, October 2, 2026</span></div>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <div className="topbar-avatar">{initialsOf(user.name)}</div>
          </div>
        </header>

        <div className="content-wrap">
          {notice && <p className="notice" role="status">{notice}</p>}
          {activeSection === 'Overview' ? (
            <>
              <div className="page-heading">
                <div><span className="eyebrow">THURSDAY, OCTOBER 2, 2026</span><h1>Good morning, {user.name.split(' ')[0]} <span className="wave">✳</span></h1><p>Here’s what’s happening at your library today.</p></div>
                <button className="button button-primary add-button" onClick={openAddBook}><Plus size={16} /> Add a book</button>
              </div>
              <section className="stats-grid" aria-label="Library statistics">
                <article className="stat-card stat-card-featured"><div className="stat-top"><span>Total books</span><span className="stat-icon"><BookOpen size={17} /></span></div><strong className="stat-number">{books.length.toLocaleString()}</strong><div className="stat-foot"><span>Catalog records</span></div></article>
                <article className="stat-card"><div className="stat-top"><span>On loan</span><span className="stat-icon stat-icon-blue"><ArrowDownToLine size={17} /></span></div><strong className="stat-number">{loanRows.length.toLocaleString()}</strong><div className="stat-foot"><span>Currently checked out</span></div></article>
                <article className="stat-card"><div className="stat-top"><span>Registered members</span><span className="stat-icon stat-icon-yellow"><UsersRound size={17} /></span></div><strong className="stat-number">{apiMembers.filter((member) => member.role === 'member').length.toLocaleString()}</strong><div className="stat-foot"><span>General member accounts</span></div></article>
                <article className="stat-card"><div className="stat-top"><span>Overdue</span><span className="stat-icon stat-icon-rose"><Clock3 size={17} /></span></div><strong className="stat-number">{overdueCount.toLocaleString()}</strong><div className="stat-foot"><span>Past due and not returned</span></div></article>
              </section>

              <section className="dashboard-columns">
                <div className="panel catalog-panel">
                  <div className="panel-heading"><div><h2>Recently added</h2><p>Fresh on the shelves this week</p></div><button className="text-button" onClick={() => setActiveSection('Catalog')}>View catalog <ArrowRight size={14} /></button></div>
                  <div className="book-table-wrap"><table className="book-table"><thead><tr><th>BOOK TITLE</th><th>GENRE</th><th>STATUS</th><th>ID</th></tr></thead><tbody>{newestBooks.slice(0, 4).map((book) => <tr key={book.id}><td><div className="book-cell">{book.cover ? <img src={book.cover} alt="" /> : <i className="cover-fallback" />}<span><strong>{book.title}</strong><small>{book.author}</small></span></div></td><td>{book.genre}</td><td><span className={`status ${statusClass(book.status)}`}><i />{book.status}</span></td><td className="book-id">{book.id}</td></tr>)}</tbody></table></div>
                </div>
                <div className="panel activity-panel">
                  <div className="panel-heading"><div><h2>Due back soon</h2><p>Keep an eye on these returns</p></div><button className="icon-button panel-more" aria-label="View loan activity" title="View loans" onClick={() => setActiveSection('Loans')}><ArrowUpRight size={17} /></button></div>
                  <div className="loan-list">{dueSoon.length === 0 && <p className="empty-state">No active loans.</p>}{dueSoon.map((loan) => <div className="loan-item" key={loan.loanId}><div className={`member-avatar avatar-${loan.color}`}>{loan.initials}</div><div className="loan-person"><strong>{loan.member}</strong><span>{loan.book}</span></div><div className={`loan-due ${loan.due === 'Today' || loan.overdue ? 'due-today' : ''}`}>{loan.due}</div></div>)}</div>
                  <button className="activity-link" onClick={() => setActiveSection('Loans')}>See all loans <ArrowRight size={14} /></button>
                </div>
              </section>

              <section className="bottom-grid">
                <div className="panel circulation-panel">
                  <div className="panel-heading">
                    <div><h2>Circulation</h2><p>{circulationTotal.toLocaleString()} checkouts by loan date in the last 7 days</p></div>
                    <span className="select-button">Last 7 days <ChevronDown size={14} /></span>
                  </div>
                  <div className="chart-area">
                    <div className="chart-y-labels">{circulationTicks.map((tick) => <span key={tick}>{tick.toLocaleString()}</span>)}</div>
                    <div className="chart">
                      <div className="chart-grid"><i /><i /><i /><i /><i /></div>
                      <svg viewBox="0 0 600 160" preserveAspectRatio="none" role="img" aria-label={`Daily checkouts for the last seven days, ${circulationTotal} total`}>
                        <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#70947a" stopOpacity=".2" /><stop offset="100%" stopColor="#70947a" stopOpacity="0" /></linearGradient></defs>
                        <polygon className="chart-area-fill" points={circulationAreaPoints} />
                        <polyline className="chart-line" points={circulationPoints} />
                      </svg>
                      <div className="chart-x-labels">{circulationByDay.map((day) => <span key={day.label}>{day.label}</span>)}</div>
                    </div>
                  </div>
                </div>
                <div className="panel quick-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Common tasks, one click away</p></div></div><button className="quick-action" onClick={openAddBook}><span className="quick-icon quick-icon-green"><Plus size={17} /></span><span><strong>Add new book</strong><small>Add a title to your catalog</small></span><ArrowRight size={15} /></button><button className="quick-action" onClick={openAddMember}><span className="quick-icon quick-icon-yellow"><UsersRound size={17} /></span><span><strong>Register a member</strong><small>Welcome someone new</small></span><ArrowRight size={15} /></button><button className="quick-action" onClick={() => setActiveSection('Loans')}><span className="quick-icon quick-icon-blue"><ChartNoAxesCombined size={17} /></span><span><strong>View loan report</strong><small>See what’s moving</small></span><ArrowRight size={15} /></button></div>
              </section>
              <footer className="dashboard-footer"><span>Made for the love of reading.</span><span>COMMONPLACE LIBRARY SYSTEM <i>·</i> 2026</span></footer>
            </>
          ) : (
            <>
              <div className="page-heading section-page-heading">
                <div>
                  <span className="eyebrow">NORTHWOOD LIBRARY</span>
                  <h1>{sectionLabel(activeSection, isLibrarian)}</h1>
                  <p>{sectionBlurb(activeSection, isLibrarian)}</p>
                </div>
                {isLibrarian && (activeSection === 'Catalog' || activeSection === 'Members' || activeSection === 'Loans') && (
                  <button className="button button-primary add-button" onClick={() => activeSection === 'Catalog' ? openAddBook() : activeSection === 'Members' ? openAddMember() : setActiveSection('Overview')}>
                    <Plus size={16} /> {activeSection === 'Catalog' ? 'Add a book' : activeSection === 'Members' ? 'Add a member' : 'New loan'}
                  </button>
                )}
              </div>
              <div className="panel section-panel">
                {activeSection === 'Settings' ? (
                  <div className="utility-content">
                    <section className="utility-section">
                      <h2>Account</h2>
                      <p>Your library account information.</p>
                      <dl className="account-grid">
                        <div><dt>Name</dt><dd>{user.name}</dd></div>
                        <div><dt>Email</dt><dd>{user.email}</dd></div>
                        <div><dt>Account type</dt><dd>{isLibrarian ? 'Librarian' : 'Member'}</dd></div>
                        <div><dt>Library ID</dt><dd className="book-id">{user.profile_id}</dd></div>
                      </dl>
                    </section>
                    <section className="utility-section">
                      <h2>Preferences</h2>
                      <p>Choose the page to open after you sign in. This setting is saved in this browser.</p>
                      <label className="settings-control" htmlFor="default-view">
                        <span>Default page</span>
                        <select id="default-view" className="genre-select" value={defaultView} onChange={(event) => changeDefaultView(event.target.value as LandingSection)}>
                          {isLibrarian ? (
                            <><option value="Overview">Overview</option><option value="Catalog">Catalog</option><option value="Loans">Loans</option></>
                          ) : (
                            <><option value="Catalog">Catalog</option><option value="Loans">My loans</option><option value="History">Borrowing history</option></>
                          )}
                        </select>
                      </label>
                    </section>
                  </div>
                ) : activeSection === 'Help & support' ? (
                  <div className="utility-content help-content">
                    <section className="utility-section">
                      <h2>{isLibrarian ? 'Librarian guide' : 'Member guide'}</h2>
                      {isLibrarian ? (
                        <>
                          <details><summary>How do I add or update a book?</summary><p>Open Catalog and choose Add a book. To edit an existing title, open its details and choose Edit.</p></details>
                          <details><summary>How do I check in a book?</summary><p>Open Loans and choose Mark returned on the loan. The book becomes available to the next person in its reservation queue.</p></details>
                          <details><summary>How do reservations work?</summary><p>Members can reserve checked-out books. Reservations are served in order; the first member can check out the book once it is available.</p></details>
                        </>
                      ) : (
                        <>
                          <details><summary>How do I check out a book?</summary><p>In Catalog, choose Check out on an available book, or open its details and choose Check out. You will be taken to My loans after checkout.</p></details>
                          <details><summary>What if a book is already checked out?</summary><p>Open the book and choose Reserve. You can see your place in line under My reservations.</p></details>
                          <details><summary>Where can I see my due dates?</summary><p>Open My loans to see active checkouts and due dates. Returned books appear in Borrowing history.</p></details>
                        </>
                      )}
                    </section>
                    <section className="utility-section support-contact">
                      <h2>Still need help?</h2>
                      <p>Contact the library support team for account or borrowing assistance.</p>
                      <a className="button button-secondary" href="mailto:hello@commonplace.library">Email support <ArrowRight size={15} /></a>
                    </section>
                  </div>
                ) : (
                  <>
                <div className="list-toolbar">
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      type="search"
                      aria-label={`Search ${sectionLabel(activeSection, isLibrarian).toLowerCase()}`}
                      placeholder={activeSection === 'Catalog' ? 'Search by title, author, genre, or ISBN...' : `Search ${sectionLabel(activeSection, isLibrarian).toLowerCase()}...`}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                  {activeSection === 'Catalog' && (
                    <>
                      <select className="genre-select" aria-label="Filter by genre" value={genreFilter} onChange={(event) => setGenre(event.target.value)}>
                        <option>All genres</option>
                        {genres.map((name) => <option key={name}>{name}</option>)}
                      </select>
                      <select className="genre-select" aria-label="Filter by availability" value={availability} onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)}>
                        <option value="all">All books</option>
                        <option value="available">On the shelf</option>
                        <option value="checked-out">Checked out</option>
                      </select>
                      <select className="genre-select" aria-label="Sort books" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                        {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </>
                  )}
                  <button className="button button-secondary export-button" onClick={() => window.print()}><ArrowDownToLine size={15} /> Export</button>
                </div>

                {activeSection === 'Catalog' && (
                  <>
                    <div className="results-bar" aria-live="polite">
                      <span>{filteredBooks.length === books.length ? `${books.length} ${books.length === 1 ? 'book' : 'books'}` : `${filteredBooks.length} of ${books.length} books`}</span>
                      {filtersActive && (
                        <button className="text-button" onClick={() => { setQuery(''); setGenre('All genres'); setAvailability('all') }}>Clear search and filters</button>
                      )}
                    </div>
                    {filteredBooks.length === 0 ? (
                      <p className="empty-state">
                        {books.length === 0
                          ? (isLibrarian ? 'No books yet. Choose Add a book to create the first one.' : 'The catalog is empty.')
                          : 'No books match your search or filters.'}
                      </p>
                    ) : (
                      <div className="book-grid">
                        {filteredBooks.map((book) => {
                          const hasLoan = myActiveLoanIsbns.has(book.id)
                          return (
                            <article key={book.id} className="book-card">
                              <button className="book-card-open" onClick={() => openBook(book.id)} aria-label={`${book.title} by ${book.author}. ${book.status}. View details`}>
                                <BookCover title={book.title} cover={book.cover} />
                                <strong className="book-card-title">{book.title}</strong>
                                <span className="book-card-author">{book.author}</span>
                                <span className={`status ${statusClass(book.status)}`}><i />{book.status}</span>
                              </button>
                              {!isLibrarian && !hasLoan && canCheckOut(book) && (
                                <button className="text-button book-card-checkout" disabled={working} onClick={() => void checkOutBook(book.id)}>Check out <ArrowRight size={14} /></button>
                              )}
                              {!isLibrarian && !hasLoan && !canCheckOut(book) && (
                                book.myPosition === null
                                  ? <button className="text-button book-card-checkout" disabled={working} onClick={() => void reserveBook(book.id)}><Bookmark size={14} /> Reserve</button>
                                  : <span className="book-card-queue">Your place: #{book.myPosition}</span>
                              )}
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                {activeSection === 'Members' && (
                  <div className="generic-list">
                    {apiMembers.filter((m) => `${m.name} ${m.email}`.toLowerCase().includes(query.toLowerCase())).map((m, index) => (
                      <div className="generic-row" key={m.user_id}>
                        <div className={`member-avatar avatar-${avatarColors[index % 3]}`}>{initialsOf(m.name)}</div>
                        <div><strong>{m.name}</strong><span>{m.email}</span><small className="member-id">ID {m.user_id}</small></div>
                        <span className="member-since">{m.phone_num || '—'}</span>
                        <span className={`member-role ${m.role === 'librarian' ? 'member-role-librarian' : ''}`}>{m.role === 'librarian' ? 'Librarian' : 'General member'}</span>
                      </div>
                    ))}
                    {apiMembers.length === 0 && <p className="empty-state">No members yet.</p>}
                  </div>
                )}

                {activeSection === 'Loans' && (
                  <div className="generic-list">
                    {loanRows.length === 0 && <p className="empty-state">No active loans.</p>}
                    {loanRows.filter((loan) => `${loan.member} ${loan.book}`.toLowerCase().includes(query.toLowerCase())).map((loan) => (
                      <div className="generic-row" key={loan.loanId}>
                        <div className={`member-avatar avatar-${loan.color}`}>{loan.initials}</div>
                        <div><strong>{loan.book}</strong><span>Checked out by {loan.member}</span></div>
                        <span className={`loan-due ${loan.due === 'Today' || loan.overdue ? 'due-today' : ''}`}>Due {loan.due}</span>
                        <button className="text-button return-button" disabled={working} onClick={() => void runAction(() => api.returnLoan(loan.loanId), 'Book checked in.')}>{isLibrarian ? 'Mark returned' : 'Check in'} <ArrowRight size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === 'History' && (
                  <div className="generic-list">
                    {historyRows.length === 0 && <p className="empty-state">You have not borrowed any books yet. Browse the catalog to find your first read.</p>}
                    {historyRows.filter((row) => `${row.title} ${row.author}`.toLowerCase().includes(query.toLowerCase())).map((row) => (
                      <div className="generic-row" key={row.loanId}>
                        <BookCover title={row.title} cover={row.cover} size="sm" />
                        <div><strong>{row.title}</strong><span>{row.author}</span></div>
                        <span className="member-since">Borrowed {row.borrowed}</span>
                        <span className={`loan-due ${row.overdue ? 'due-today' : ''}`}>{row.status}</span>
                      </div>
                    ))}
                    {historyRows.length > 0 && query !== '' && !historyRows.some((row) => `${row.title} ${row.author}`.toLowerCase().includes(query.toLowerCase())) && (
                      <p className="empty-state">No borrowed books match that search.</p>
                    )}
                  </div>
                )}

                {activeSection === 'Reservations' && (
                  <div className="generic-list">
                    {reservationRows.length === 0 && (
                      <p className="empty-state">{isLibrarian ? 'No active reservations.' : 'You have no reservations. When a book you want is checked out, open it and choose Reserve.'}</p>
                    )}
                    {reservationRows.filter((row) => `${row.title} ${row.author} ${isLibrarian ? row.member : ''}`.toLowerCase().includes(query.toLowerCase())).map((row) => (
                      <div className="generic-row" key={row.reservationId}>
                        <BookCover title={row.title} cover={row.cover} size="sm" />
                        <div><strong>{row.title}</strong><span>{isLibrarian ? `Reserved by ${row.member} on ${row.reserved}` : `Reserved on ${row.reserved}`}</span></div>
                        <div className="reservation-timing">
                          <strong className={row.ready ? 'ready-now' : ''}>{row.ready ? 'Ready to check out' : `Number ${row.position} in line`}</strong>
                          <span>{row.ready ? 'Available now' : `Est. ready ${formatDate(row.estimatedReady)}`}</span>
                        </div>
                        <div className="row-actions">
                          {!isLibrarian && row.ready && <button className="text-button" disabled={working} onClick={() => void checkOutBook(row.isbn)}>Check out</button>}
                          <button className="text-button" disabled={working} onClick={() => void cancelReservation(row.reservationId)}>Cancel</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                  </>
                )}
              </div>
              <footer className="dashboard-footer"><span>Made for the love of reading.</span><span>COMMONPLACE LIBRARY SYSTEM <i>·</i> 2026</span></footer>
            </>
          )}
        </div>
      </section>

      {selectedBook && (
        <BookDetailModal
          key={selectedBook.id}
          book={selectedBook}
          isLibrarian={isLibrarian}
          hasLoan={myActiveLoanIsbns.has(selectedBook.id)}
          working={working}
          message={notice}
          onClose={() => setSelectedIsbn(null)}
          onCheckOut={() => void checkOutBook(selectedBook.id)}
          onReserve={() => void reserveBook(selectedBook.id)}
          onCancelReservation={() => {
            const mine = apiReservations.find((r) => r.ISBN === selectedBook.id && r.user_id === user.profile_id)
            if (mine) void cancelReservation(mine.reservation_id)
          }}
          onEdit={() => openEditBook(selectedBook.id)}
          onDelete={() => void deleteBook(selectedBook.id)}
        />
      )}
      {bookForm && (bookForm.mode === 'add' || editingBook) && (
        <BookFormModal
          key={bookForm.mode === 'edit' ? bookForm.isbn : 'new'}
          book={editingBook}
          genres={genres}
          onSave={saveBook}
          onClose={closeBookForm}
        />
      )}
      {memberFormOpen && <MemberFormModal onSave={saveMember} onClose={() => setMemberFormOpen(false)} />}
    </main>
  )
}

export default App
