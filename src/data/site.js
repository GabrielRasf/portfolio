const configured = String(import.meta.env.VITE_SITE_URL || '').trim().replace(/\/$/, '')

export const site = {
    name: 'Gabriel Rodrigues',
    title: 'Gabriel Rodrigues — Websites, Web Systems, and Applications',
    description: 'Portfolio of Gabriel Rodrigues. Selected websites, web systems, applications, and interactive work.',
    url: configured,
    // Only place for the WhatsApp number: digits with country code.
    // Leave this empty until the real number is available. No other file should store it.
    whatsapp: "+5531998790473",
    whatsappMessage: 'Olá! Vi seu portfólio e gostaria de saber mais sobre seus serviços de desenvolvimento de sites e sistemas web.',
}
