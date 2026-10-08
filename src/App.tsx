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
  ChevronDown,
  CircleHelp,
  Clock3,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  UsersRound,
} from 'lucide-react'
import { api, ApiError, type ApiBook, type ApiLoan, type ApiMember, type Role, type User } from './api'
import './App.css'

type Section = 'Overview' | 'Catalog' | 'Members' | 'Loans'

const avatarColors = ['sage', 'peach', 'lavender']

function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
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
  const [activeSection, setActiveSection] = useState<Section>('Overview')
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('All genres')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isLibrarian = user?.role === 'librarian'

  const books = useMemo(
    () => apiBooks.map((book) => ({
      title: book.title,
      author: book.author,
      genre: book.genre,
      status: book.available ? 'Available' : 'Checked out',
      id: book.ISBN,
      cover: book.cover ?? '',
    })),
    [apiBooks],
  )
  const filteredBooks = useMemo(
    () => books.filter((book) => {
      const matchesQuery = `${book.title} ${book.author} ${book.id}`.toLowerCase().includes(query.toLowerCase())
      return matchesQuery && (genre === 'All genres' || book.genre === genre)
    }),
    [books, genre, query],
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
          overdue: new Date(loan.due_date).getTime() < Date.now(),
          color: avatarColors[index % 3],
        }
      }),
    [apiLoans, apiBooks, apiMembers, user, isLibrarian],
  )
  const dueSoon = loanRows.slice(0, 3)

  const loadData = useCallback(async (current: User) => {
    try {
      const [booksData, loansData, membersData] = await Promise.all([
        api.books(),
        api.loans(),
        current.role === 'librarian' ? api.members() : Promise.resolve<ApiMember[]>([]),
      ])
      setApiBooks(booksData)
      setApiLoans(loansData)
      setApiMembers(membersData)
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
        setActiveSection(current.role === 'librarian' ? 'Overview' : 'Catalog')
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
      setActiveSection(signedIn.role === 'librarian' ? 'Overview' : 'Catalog')
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
    setNotice('')
    setAuthError('')
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setNotice('')
    try {
      await action()
      setNotice(success)
      if (user) await loadData(user)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null)
        setAuthError('Your session expired. Please sign in again.')
      } else {
        setNotice(error instanceof Error ? error.message : 'Something went wrong')
      }
    }
  }

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
          ] as const).filter(([section]) => isLibrarian || section === 'Catalog' || section === 'Loans').map(([section, Icon]) => (
            <button key={section} className={`nav-link ${activeSection === section ? 'nav-link-active' : ''}`} onClick={() => { setActiveSection(section); setMobileNavOpen(false) }}>
              <Icon size={17} strokeWidth={1.8} /><span>{section === 'Loans' && !isLibrarian ? 'My loans' : section}</span>
              {section === 'Loans' && loanRows.length > 0 && <span className="nav-count">{loanRows.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-link"><Settings2 size={17} /><span>Settings</span></button>
          <button className="nav-link"><CircleHelp size={17} /><span>Help & support</span></button>
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
          <div className="breadcrumbs"><span>Northwood Library</span><span className="breadcrumb-slash">/</span><strong>{activeSection}</strong></div>
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
                <button className="button button-primary add-button" onClick={() => setActiveSection('Catalog')}><Plus size={16} /> Add a book</button>
              </div>
              <section className="stats-grid" aria-label="Library statistics">
                <article className="stat-card stat-card-featured"><div className="stat-top"><span>Total books</span><span className="stat-icon"><BookOpen size={17} /></span></div><strong className="stat-number">12,486</strong><div className="stat-foot"><span className="stat-trend"><ArrowUpRight size={14} /> 8.2%</span><span>vs. last month</span><span className="sparkline sparkline-green"><i /><i /><i /><i /><i /><i /><i /><i /></span></div></article>
                <article className="stat-card"><div className="stat-top"><span>On loan</span><span className="stat-icon stat-icon-blue"><ArrowDownToLine size={17} /></span></div><strong className="stat-number">1,284</strong><div className="stat-foot"><span className="stat-trend stat-trend-neutral">+ 3.1%</span><span>vs. last month</span><span className="sparkline sparkline-blue"><i /><i /><i /><i /><i /><i /><i /><i /></span></div></article>
                <article className="stat-card"><div className="stat-top"><span>Active members</span><span className="stat-icon stat-icon-yellow"><UsersRound size={17} /></span></div><strong className="stat-number">3,842</strong><div className="stat-foot"><span className="stat-trend"><ArrowUpRight size={14} /> 12.4%</span><span>vs. last month</span><span className="sparkline sparkline-yellow"><i /><i /><i /><i /><i /><i /><i /><i /></span></div></article>
                <article className="stat-card"><div className="stat-top"><span>Overdue</span><span className="stat-icon stat-icon-rose"><Clock3 size={17} /></span></div><strong className="stat-number">24</strong><div className="stat-foot"><span className="stat-trend stat-trend-down">↓ 2.6%</span><span>vs. last month</span><span className="sparkline sparkline-rose"><i /><i /><i /><i /><i /><i /><i /><i /></span></div></article>
              </section>

              <section className="dashboard-columns">
                <div className="panel catalog-panel">
                  <div className="panel-heading"><div><h2>Recently added</h2><p>Fresh on the shelves this week</p></div><button className="text-button" onClick={() => setActiveSection('Catalog')}>View catalog <ArrowRight size={14} /></button></div>
                  <div className="book-table-wrap"><table className="book-table"><thead><tr><th>BOOK TITLE</th><th>GENRE</th><th>STATUS</th><th>ID</th></tr></thead><tbody>{books.slice(0, 4).map((book) => <tr key={book.id}><td><div className="book-cell">{book.cover ? <img src={book.cover} alt="" /> : <i className="cover-fallback" />}<span><strong>{book.title}</strong><small>{book.author}</small></span></div></td><td>{book.genre}</td><td><span className={`status status-${book.status.toLowerCase().replace(' ', '-')}`}><i />{book.status}</span></td><td className="book-id">{book.id}</td></tr>)}</tbody></table></div>
                </div>
                <div className="panel activity-panel">
                  <div className="panel-heading"><div><h2>Due back soon</h2><p>Keep an eye on these returns</p></div><button className="icon-button panel-more" aria-label="View loan activity" title="View loans" onClick={() => setActiveSection('Loans')}><ArrowUpRight size={17} /></button></div>
                  <div className="loan-list">{dueSoon.length === 0 && <p className="empty-state">No active loans.</p>}{dueSoon.map((loan) => <div className="loan-item" key={loan.loanId}><div className={`member-avatar avatar-${loan.color}`}>{loan.initials}</div><div className="loan-person"><strong>{loan.member}</strong><span>{loan.book}</span></div><div className={`loan-due ${loan.due === 'Today' || loan.overdue ? 'due-today' : ''}`}>{loan.due}</div></div>)}</div>
                  <button className="activity-link" onClick={() => setActiveSection('Loans')}>See all loans <ArrowRight size={14} /></button>
                </div>
              </section>

              <section className="bottom-grid">
                <div className="panel circulation-panel"><div className="panel-heading"><div><h2>Circulation</h2><p>Books checked out over the past 7 days</p></div><button className="select-button">This week <ChevronDown size={14} /></button></div><div className="chart-area"><div className="chart-y-labels"><span>120</span><span>90</span><span>60</span><span>30</span><span>0</span></div><div className="chart"><div className="chart-grid"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 600 160" preserveAspectRatio="none" role="img" aria-label="Circulation trend rising through the week"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#70947a" stopOpacity=".2" /><stop offset="100%" stopColor="#70947a" stopOpacity="0" /></linearGradient></defs><path className="chart-area-fill" d="M0 119 C38 112 42 97 85 103 S144 115 171 82 S223 90 257 70 S304 83 344 60 S390 76 427 48 S480 68 515 35 S564 51 600 20 L600 160 L0 160Z" /><path className="chart-line" d="M0 119 C38 112 42 97 85 103 S144 115 171 82 S223 90 257 70 S304 83 344 60 S390 76 427 48 S480 68 515 35 S564 51 600 20" /></svg><div className="chart-x-labels"><span>Fri</span><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span></div></div></div></div>
                <div className="panel quick-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Common tasks, one click away</p></div></div><button className="quick-action" onClick={() => setActiveSection('Catalog')}><span className="quick-icon quick-icon-green"><Plus size={17} /></span><span><strong>Add new book</strong><small>Add a title to your catalog</small></span><ArrowRight size={15} /></button><button className="quick-action" onClick={() => setActiveSection('Members')}><span className="quick-icon quick-icon-yellow"><UsersRound size={17} /></span><span><strong>Register a member</strong><small>Welcome someone new</small></span><ArrowRight size={15} /></button><button className="quick-action" onClick={() => setActiveSection('Loans')}><span className="quick-icon quick-icon-blue"><ChartNoAxesCombined size={17} /></span><span><strong>View loan report</strong><small>See what’s moving</small></span><ArrowRight size={15} /></button></div>
              </section>
              <footer className="dashboard-footer"><span>Made for the love of reading.</span><span>COMMONPLACE LIBRARY SYSTEM <i>·</i> 2026</span></footer>
            </>
          ) : (
            <>
              <div className="page-heading section-page-heading"><div><span className="eyebrow">NORTHWOOD LIBRARY</span><h1>{activeSection}</h1><p>{activeSection === 'Catalog' ? 'Browse and manage every title in your collection.' : activeSection === 'Members' ? 'Get to know the people who make this library.' : isLibrarian ? 'Keep track of checkouts, returns, and what’s due.' : 'Books you have checked out, and when they’re due back.'}</p></div>{isLibrarian && <button className="button button-primary add-button" onClick={() => activeSection === 'Catalog' ? setQuery('') : setActiveSection('Overview')}><Plus size={16} /> {activeSection === 'Catalog' ? 'Add a book' : activeSection === 'Members' ? 'Add a member' : 'New loan'}</button>}</div>
              <div className="panel section-panel">
                <div className="list-toolbar"><label className="search-field"><Search size={17} /><input type="search" placeholder={`Search ${activeSection.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} /></label>{activeSection === 'Catalog' && <select className="genre-select" value={genre} onChange={(event) => setGenre(event.target.value)}><option>All genres</option><option>Arts & Culture</option><option>Fiction</option><option>Nature</option><option>Design</option></select>}<button className="button button-secondary export-button" onClick={() => window.print()}><ArrowDownToLine size={15} /> Export</button></div>
                {activeSection === 'Catalog' ? <div className="book-table-wrap"><table className="book-table full-table"><thead><tr><th>BOOK TITLE</th><th>GENRE</th><th>STATUS</th><th>ITEM ID</th><th></th></tr></thead><tbody>{filteredBooks.map((book) => <tr key={book.id}><td><div className="book-cell">{book.cover ? <img src={book.cover} alt="" /> : <i className="cover-fallback" />}<span><strong>{book.title}</strong><small>{book.author}</small></span></div></td><td>{book.genre}</td><td><span className={`status status-${book.status.toLowerCase().replace(' ', '-')}`}><i />{book.status}</span></td><td className="book-id">{book.id}</td><td><button className="text-button return-button" disabled={book.status !== 'Available'} onClick={() => void runAction(() => api.checkOut(book.id), 'Book checked out.')}>Check out <ArrowRight size={14} /></button></td></tr>)}</tbody></table>{filteredBooks.length === 0 && <p className="empty-state">{books.length === 0 ? 'The catalog is empty.' : 'No books match that search.'}</p>}</div> : activeSection === 'Members' ? <div className="generic-list">{apiMembers.filter((m) => `${m.name} ${m.email}`.toLowerCase().includes(query.toLowerCase())).map((m, index) => <div className="generic-row" key={m.user_id}><div className={`member-avatar avatar-${avatarColors[index % 3]}`}>{initialsOf(m.name)}</div><div><strong>{m.name}</strong><span>{m.email}</span></div><span className="member-since">{m.phone_num}</span><span className="member-active"><i /> Active</span></div>)}{apiMembers.length === 0 && <p className="empty-state">No members yet.</p>}</div> : <div className="generic-list">{loanRows.length === 0 && <p className="empty-state">No active loans.</p>}{loanRows.filter((loan) => `${loan.member} ${loan.book}`.toLowerCase().includes(query.toLowerCase())).map((loan) => <div className="generic-row" key={loan.loanId}><div className={`member-avatar avatar-${loan.color}`}>{loan.initials}</div><div><strong>{loan.book}</strong><span>Checked out by {loan.member}</span></div><span className={`loan-due ${loan.due === 'Today' || loan.overdue ? 'due-today' : ''}`}>Due {loan.due}</span><button className="text-button return-button" onClick={() => void runAction(() => api.returnLoan(loan.loanId), 'Book checked in.')}>{isLibrarian ? 'Mark returned' : 'Check in'} <ArrowRight size={14} /></button></div>)}</div>}
              </div>
              <footer className="dashboard-footer"><span>Made for the love of reading.</span><span>COMMONPLACE LIBRARY SYSTEM <i>·</i> 2026</span></footer>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
