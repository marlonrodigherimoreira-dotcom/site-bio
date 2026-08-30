/**
 * Ícones simples em SVG (traço único), no estilo do restante do site.
 * Representações genéricas — não são os logotipos oficiais das marcas.
 */
function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20.5 4L2.8 11.1c-.9.35-.87 1.63.04 1.94l4.3 1.44 1.65 5.3c.24.76 1.2.98 1.76.4l2.4-2.5 4.5 3.3c.7.5 1.7.13 1.88-.72L22.6 5.1c.2-.9-.7-1.6-1.5-1.25z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.9 15.4L18 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  telegram: TelegramIcon,
  tiktok: TikTokIcon,
  instagram: InstagramIcon,
}

export default function SocialIcon({ id }) {
  const Icon = icons[id]
  return Icon ? <Icon /> : null
}
