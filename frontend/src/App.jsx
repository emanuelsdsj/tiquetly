import { lazy, Suspense } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import { useLocale } from './context/LocaleContext'
import { AdminPage } from './pages/AdminPage'
import { BrowsePage } from './pages/BrowsePage'
import { CreateEventPage } from './pages/CreateEventPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { LoginPage } from './pages/LoginPage'
import { MyTicketsPage } from './pages/MyTicketsPage'
import { OrganizerPage } from './pages/OrganizerPage'
import { PublicTicketPage } from './pages/PublicTicketPage'
import { RegisterPage } from './pages/RegisterPage'

// Lazy: pulls in html5-qrcode, a sizable dependency only the gatekeeper
// route needs. Customers and organizers should not pay for it on every
// page load.
const GatePage = lazy(() => import('./pages/GatePage').then((m) => ({ default: m.GatePage })))

function Layout() {
  return (
    <>
      <Nav />
      <Outlet />
    </>
  )
}

function App() {
  const { t } = useLocale()
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/my-tickets" element={<MyTicketsPage />} />
        <Route path="/tickets/:code" element={<PublicTicketPage />} />
        <Route path="/organizer" element={<OrganizerPage />} />
        <Route path="/organizer/create" element={<CreateEventPage />} />
        <Route
          path="/gate"
          element={
            <Suspense fallback={<p className="gate-page__state">{t('common.loading')}</p>}>
              <GatePage />
            </Suspense>
          }
        />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}

export default App
