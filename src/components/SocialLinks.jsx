import SocialIcon from './SocialIcon.jsx'
import socialLinks from '../data/socialLinks.js'

export default function SocialLinks() {
  return (
    <div className="social-row">
      {socialLinks.map((link) => (
        <a
          key={link.id}
          className="social-btn"
          href={link.href}
          aria-label={link.label}
          target="_blank"
          rel="noopener noreferrer"
        >
          <SocialIcon id={link.id} />
        </a>
      ))}
    </div>
  )
}
