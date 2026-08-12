import { lazy, Suspense } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import { BrowsePage } from './pages/BrowsePage'
import { EventDetailPage } from './pages/EventDetailPage'
import { LoginPage } from './pages/LoginPage'
import { MyTicketsPage } from './pages/MyTicketsPage'
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
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/eventos/:id" element={<EventDetailPage />} />
        <Route path="/meus-ingressos" element={<MyTicketsPage />} />
        <Route path="/ingressos/:code" element={<PublicTicketPage />} />
        <Route
          path="/portaria"
          element={
            <Suspense fallback={<p className="gate-page__state">Carregando...</p>}>
              <GatePage />
            </Suspense>
          }
        />
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/registrar" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}

export default App
