/**
 * Ícones simples em SVG (traço único), no estilo do restante do site.
 * Representações genéricas — não são os logotipos oficiais das marcas.
 */
function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="5" width="18" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 6.5L12 13L20 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 3v10.8a2.7 2.7 0 1 1-2.2-2.66"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.3c.5 2.4 2.2 4.1 4.6 4.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  )
}

const icons = {
  email: EmailIcon,
  tiktok: TikTokIcon,
  instagram: InstagramIcon,
}

export default function SocialIcon({ id }) {
  const Icon = icons[id]
  return Icon ? <Icon /> : null
}
