import { Outlet, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import { BrowsePage } from './pages/BrowsePage'
import { EventDetailPage } from './pages/EventDetailPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

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
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/registrar" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}

export default App
