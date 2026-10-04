import { useMemo, useState, type FormEvent } from 'react'
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
  Command,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  UsersRound,
} from 'lucide-react'
import './App.css'

type Section = 'Overview' | 'Catalog' | 'Members' | 'Loans'

const books = [
  { title: 'The Creative Act', author: 'Rick Rubin', genre: 'Arts & Culture', status: 'Available', id: 'BK-2048', cover: 'https://covers.openlibrary.org/b/isbn/9780593652886-M.jpg' },
  { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', genre: 'Fiction', status: 'Checked out', id: 'BK-2047', cover: 'https://covers.openlibrary.org/b/isbn/9780593321201-M.jpg' },
  { title: 'Braiding Sweetgrass', author: 'Robin Wall Kimmerer', genre: 'Nature', status: 'Available', id: 'BK-2046', cover: 'https://covers.openlibrary.org/b/isbn/9781571313560-M.jpg' },
  { title: 'A Little Life', author: 'Hanya Yanagihara', genre: 'Fiction', status: 'Reserved', id: 'BK-2045', cover: 'https://covers.openlibrary.org/b/isbn/9780804172707-M.jpg' },
  { title: 'The Design of Everyday Things', author: 'Don Norman', genre: 'Design', status: 'Available', id: 'BK-2044', cover: 'https://covers.openlibrary.org/b/isbn/9780465050659-M.jpg' },
]

const loans = [
  { member: 'Olivia Rhye', initials: 'OR', book: 'Tomorrow, and Tomorrow, and Tomorrow', due: 'Today', color: 'sage' },
  { member: 'Phoenix Baker', initials: 'PB', book: 'The Midnight Library', due: 'Oct 06, 2026', color: 'peach' },
  { member: 'Lana Steiner', initials: 'LS', book: 'Educated', due: 'Oct 08, 2026', color: 'lavender' },
]

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('Overview')
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('All genres')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const filteredBooks = useMemo(
    () => books.filter((book) => {
      const matchesQuery = `${book.title} ${book.author} ${book.id}`.toLowerCase().includes(query.toLowerCase())
      return matchesQuery && (genre === 'All genres' || book.genre === genre)
    }),
    [genre, query],
  )

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSignedIn(true)
  }

  if (!isSignedIn) {
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
              <span className="eyebrow">WELCOME BACK</span>
              <h2>Your library,<br />in good hands.</h2>
              <p>Sign in to manage your collection and community.</p>
            </div>
            <form className="login-form" onSubmit={signIn}>
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" placeholder="you@yourlibrary.org" autoComplete="username" required />
              <div className="password-label"><label htmlFor="password">Password</label><a href="#forgot">Forgot password?</a></div>
              <input id="password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required />
              <button className="button button-primary sign-in-button" type="submit">Sign in <ArrowRight size={16} /></button>
            </form>
            <div className="login-divider"><span /> or <span /></div>
            <button className="button button-secondary demo-button" type="button" onClick={() => setIsSignedIn(true)}>
              <Command size={15} /> Explore the demo dashboard
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
          ] as const).map(([section, Icon]) => (
            <button key={section} className={`nav-link ${activeSection === section ? 'nav-link-active' : ''}`} onClick={() => { setActiveSection(section); setMobileNavOpen(false) }}>
              <Icon size={17} strokeWidth={1.8} /><span>{section}</span>
              {section === 'Loans' && <span className="nav-count">12</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-link"><Settings2 size={17} /><span>Settings</span></button>
          <button className="nav-link"><CircleHelp size={17} /><span>Help & support</span></button>
          <div className="sidebar-user">
            <div className="user-avatar">JM</div>
            <div className="user-info"><strong>Jamie Morgan</strong><span>Library admin</span></div>
            <button className="icon-button sign-out" aria-label="Sign out" title="Sign out" onClick={() => setIsSignedIn(false)}><LogOut size={16} /></button>
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
            <div className="topbar-avatar">JM</div>
          </div>
        </header>

        <div className="content-wrap">
          {activeSection === 'Overview' ? (
            <>
              <div className="page-heading">
                <div><span className="eyebrow">THURSDAY, OCTOBER 2, 2026</span><h1>Good morning, Jamie <span className="wave">✳</span></h1><p>Here’s what’s happening at your library today.</p></div>
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
                  <div className="book-table-wrap"><table className="book-table"><thead><tr><th>BOOK TITLE</th><th>GENRE</th><th>STATUS</th><th>ID</th></tr></thead><tbody>{books.slice(0, 4).map((book) => <tr key={book.id}><td><div className="book-cell"><img src={book.cover} alt="" /><span><strong>{book.title}</strong><small>{book.author}</small></span></div></td><td>{book.genre}</td><td><span className={`status status-${book.status.toLowerCase().replace(' ', '-')}`}><i />{book.status}</span></td><td className="book-id">{book.id}</td></tr>)}</tbody></table></div>
                </div>
                <div className="panel activity-panel">
                  <div className="panel-heading"><div><h2>Due back soon</h2><p>Keep an eye on these returns</p></div><button className="icon-button panel-more" aria-label="View loan activity" title="View loans" onClick={() => setActiveSection('Loans')}><ArrowUpRight size={17} /></button></div>
                  <div className="loan-list">{loans.map((loan) => <div className="loan-item" key={loan.member}><div className={`member-avatar avatar-${loan.color}`}>{loan.initials}</div><div className="loan-person"><strong>{loan.member}</strong><span>{loan.book}</span></div><div className={`loan-due ${loan.due === 'Today' ? 'due-today' : ''}`}>{loan.due}</div></div>)}</div>
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
              <div className="page-heading section-page-heading"><div><span className="eyebrow">NORTHWOOD LIBRARY</span><h1>{activeSection}</h1><p>{activeSection === 'Catalog' ? 'Browse and manage every title in your collection.' : activeSection === 'Members' ? 'Get to know the people who make this library.' : 'Keep track of checkouts, returns, and what’s due.'}</p></div><button className="button button-primary add-button" onClick={() => activeSection === 'Catalog' ? setQuery('') : setActiveSection('Overview')}><Plus size={16} /> {activeSection === 'Catalog' ? 'Add a book' : activeSection === 'Members' ? 'Add a member' : 'New loan'}</button></div>
              <div className="panel section-panel">
                <div className="list-toolbar"><label className="search-field"><Search size={17} /><input type="search" placeholder={`Search ${activeSection.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} /></label>{activeSection === 'Catalog' && <select className="genre-select" value={genre} onChange={(event) => setGenre(event.target.value)}><option>All genres</option><option>Arts & Culture</option><option>Fiction</option><option>Nature</option><option>Design</option></select>}<button className="button button-secondary export-button" onClick={() => window.print()}><ArrowDownToLine size={15} /> Export</button></div>
                {activeSection === 'Catalog' ? <div className="book-table-wrap"><table className="book-table full-table"><thead><tr><th>BOOK TITLE</th><th>GENRE</th><th>STATUS</th><th>ITEM ID</th></tr></thead><tbody>{filteredBooks.map((book) => <tr key={book.id}><td><div className="book-cell"><img src={book.cover} alt="" /><span><strong>{book.title}</strong><small>{book.author}</small></span></div></td><td>{book.genre}</td><td><span className={`status status-${book.status.toLowerCase().replace(' ', '-')}`}><i />{book.status}</span></td><td className="book-id">{book.id}</td></tr>)}</tbody></table>{filteredBooks.length === 0 && <p className="empty-state">No books match that search.</p>}</div> : activeSection === 'Members' ? <div className="generic-list">{['Olivia Rhye', 'Phoenix Baker', 'Lana Steiner', 'Demi Wilkinson', 'Candice Wu'].filter((name) => name.toLowerCase().includes(query.toLowerCase())).map((name, index) => <div className="generic-row" key={name}><div className={`member-avatar avatar-${['sage', 'peach', 'lavender'][index % 3]}`}>{name.split(' ').map((part) => part[0]).join('')}</div><div><strong>{name}</strong><span>{index % 2 ? 'Standard member' : 'Community member'}</span></div><span className="member-since">Member since 202{index + 1}</span><span className="member-active"><i /> Active</span></div>)}</div> : <div className="generic-list">{loans.filter((loan) => `${loan.member} ${loan.book}`.toLowerCase().includes(query.toLowerCase())).map((loan) => <div className="generic-row" key={loan.member}><div className={`member-avatar avatar-${loan.color}`}>{loan.initials}</div><div><strong>{loan.book}</strong><span>Checked out by {loan.member}</span></div><span className={`loan-due ${loan.due === 'Today' ? 'due-today' : ''}`}>Due {loan.due}</span><button className="text-button return-button">Mark returned <ArrowRight size={14} /></button></div>)}</div>}
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
