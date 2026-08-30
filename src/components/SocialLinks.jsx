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
          target={link.id === 'telegram' ? undefined : '_blank'}
          rel={link.id === 'telegram' ? undefined : 'noopener noreferrer'}
          onClick={link.id === 'telegram' ? (e) => e.preventDefault() : undefined}
        >
          <SocialIcon id={link.id} />
        </a>
      ))}
    </div>
  )
}
