import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Nav.css'

export function Nav() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  return (
    <nav className="nav">
      <Link to="/" className="nav__brand">
        Tiquetly
      </Link>
      <div className="nav__links">
        {user ? (
          <>
            <Link to="/meus-ingressos">Meus ingressos</Link>
            <span className="nav__user">{user.name}</span>
            <button type="button" className="nav__link-button" onClick={handleSignOut}>
              Sair
            </button>
          </>
        ) : (
          <>
            <Link to="/entrar">Entrar</Link>
            <Link to="/registrar">Criar conta</Link>
          </>
        )}
      </div>
    </nav>
  )
}
