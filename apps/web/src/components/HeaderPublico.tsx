import logo from '../assets/termometro-logo.png'

export default function Header() {

  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm">
      <div className="container d-flex justify-content-between align-items-center py-2">
        {/* Logo y nombre */}
          <img src={logo} width="40" height="40" className="me-2" alt="Logo" />
          <strong className="text-primary">Termómetro de Equipo</strong>
      </div>
    </nav>
  )
}
