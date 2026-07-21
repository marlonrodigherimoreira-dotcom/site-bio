import SocialLinks from './SocialLinks.jsx'

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="logo">
          <span className="brand">Nozil</span>
        </div>

        <SocialLinks />

        <p>
          <span className="brand">Nozil</span> © 2026 — Gestão financeira
          sem complicação.
        </p>
      </div>
    </footer>
  )
}
