import { categories, ogImage, projects } from './data/projects.js'
import { credentials } from './data/credentials.js'
import { site } from './data/site.js'

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
let reduceMotion = motionQuery.matches

document.documentElement.classList.add('js-ready')
motionQuery.addEventListener('change', (event) => {
    reduceMotion = event.matches
})

const preloader = document.getElementById('preloader')
function hidePreloader() {
    if (!preloader) return
    preloader.classList.add('is-done')
    window.setTimeout(() => {
        preloader.hidden = true
    }, reduceMotion ? 0 : 450)
}
if (document.readyState === 'complete') hidePreloader()
else window.addEventListener('load', hidePreloader, { once: true })

function upsertMeta(selector, create) {
    let node = document.querySelector(selector)
    if (!node) {
        node = create()
        document.head.append(node)
    }
    return node
}

function applySiteUrl() {
    for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
        const node = document.querySelector(selector)
        if (!node) continue
        node.setAttribute('content', site.url ? new URL(ogImage, `${site.url}/`).href : ogImage)
    }
    if (!site.url) return
    const canonical = upsertMeta('link[rel="canonical"]', () => {
        const link = document.createElement('link')
        link.rel = 'canonical'
        return link
    })
    canonical.href = `${site.url}/`
    const ogUrl = upsertMeta('meta[property="og:url"]', () => {
        const meta = document.createElement('meta')
        meta.setAttribute('property', 'og:url')
        return meta
    })
    ogUrl.setAttribute('content', `${site.url}/`)
    const person = document.getElementById('person-ld')
    if (person) {
        const data = JSON.parse(person.textContent)
        data.url = site.url
        person.textContent = JSON.stringify(data)
    }
}
applySiteUrl()

const filtersEl = document.getElementById('filters')
const workGroupsEl = document.getElementById('work-groups')
const countEl = document.getElementById('work-count')
let activeCategory = 'all'

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
}

function isHttpUrl(value) {
    try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

function isSafeAssetUrl(value) {
    const text = String(value || '').trim()
    if (!text || text.includes('\\') || text.includes('\0') || text.startsWith('//')) return false
    if (isHttpUrl(text)) return true
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(text)) return false
    try {
        return !decodeURIComponent(text).split(/[/\\]/).includes('..')
    } catch {
        return false
    }
}

function projectMedia(project) {
    if (project.video && isSafeAssetUrl(project.video)) {
        return `<video src="${escapeHtml(project.video)}" autoplay muted loop playsinline preload="metadata" aria-label="${escapeHtml(project.name)} preview"></video>`
    }
    if (project.image && isSafeAssetUrl(project.image)) {
        return `<img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.name)} preview" width="1600" height="1000">`
    }
    const tech = project.technologies.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    return `<div class="project-mark" aria-hidden="true"><p>${escapeHtml(project.type)}</p><strong>${escapeHtml(project.name)}</strong><ul>${tech}</ul></div>`
}

function projectActions(project) {
    const links = []
    if (isHttpUrl(project.demo)) {
        links.push(`<a class="button" href="${escapeHtml(project.demo)}" target="_blank" rel="noopener noreferrer">View project</a>`)
    }
    if (isHttpUrl(project.github)) {
        links.push(`<a class="button" href="${escapeHtml(project.github)}" target="_blank" rel="noopener noreferrer">View code</a>`)
    }
    if (links.length) return links.join('')
    if (project.status === 'Private') {
        return `<p class="private">Private — no public demo</p>`
    }
    return `<p class="private">${escapeHtml(project.status)}</p>`
}

function projectCard(project, imageFirst) {
    const tech = project.technologies.length
        ? `<ul class="tech">${project.technologies.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : ''
    const flip = imageFirst ? '' : ' project-flip'
    return `<article class="project project-featured${flip}">
        <div class="project-media">${projectMedia(project)}</div>
        <div class="project-copy">
            <p class="eyebrow">${escapeHtml(project.type)}</p>
            <h3>${escapeHtml(project.name)}</h3>
            <p>${escapeHtml(project.description)}</p>
            ${tech}
            <div class="project-actions">${projectActions(project)}</div>
        </div>
    </article>`
}

function renderFilters() {
    const used = new Set(projects.map((project) => project.category))
    const visibleCategories = categories.filter((category) => category.id === 'all' || used.has(category.id))
    filtersEl.innerHTML = visibleCategories.map((category) => {
        const pressed = category.id === activeCategory
        return `<button type="button" class="filter" data-category="${category.id}" aria-pressed="${pressed}">${category.label}</button>`
    }).join('')
}

function renderProjects() {
    const visible = projects.filter((project) => activeCategory === 'all' || project.category === activeCategory)
    const groups = categories
        .filter((category) => category.id !== 'all')
        .map((category) => ({
            ...category,
            items: visible.filter((project) => project.category === category.id),
        }))
        .filter((group) => group.items.length > 0)

    let sequence = 0
    workGroupsEl.innerHTML = groups.map((group) => {
        const cards = group.items.map((project) => {
            const imageFirst = sequence % 2 === 0
            sequence += 1
            return projectCard(project, imageFirst)
        }).join('')
        return `<section class="work-group" aria-labelledby="group-${group.id}">
            <h3 class="work-group-title" id="group-${group.id}">${escapeHtml(group.label)}</h3>
            <div class="featured">${cards}</div>
        </section>`
    }).join('')

    const noun = visible.length === 1 ? 'project' : 'projects'
    countEl.textContent = `${visible.length} ${noun}`
}

filtersEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-category]')
    if (!button) return
    activeCategory = button.dataset.category
    renderFilters()
    renderProjects()
    filtersEl.querySelector(`[data-category="${CSS.escape(activeCategory)}"]`)?.focus()
})

function mountWhatsapp() {
    const digits = String(site.whatsapp || '').replace(/[^\d]/g, '')
    const anchor = document.getElementById('contact-whatsapp')
    if (!anchor || !digits) return
    anchor.href = `https://wa.me/${digits}?text=${encodeURIComponent(String(site.whatsappMessage || ''))}`
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.hidden = false
}

renderFilters()
renderProjects()
mountWhatsapp()

if (credentials.length) {
    const about = document.getElementById('about')
    const section = document.createElement('section')
    section.id = 'credentials'
    section.className = 'credentials'
    const links = credentials.filter((item) => isHttpUrl(item.href))
    section.innerHTML = `<h2>Credentials</h2><ul>${links.map((item) => `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.name)}</a></li>`).join('')}</ul>`
    about.after(section)
}

const webglFallback = document.getElementById('webgl-fallback')
function showWebglFallback(quiet) {
    if (!webglFallback || quiet) return
    webglFallback.hidden = false
}
function hideWebglFallback() {
    if (webglFallback) webglFallback.hidden = true
}

const canvas = document.querySelector('canvas.webgl')
if (canvas && !reduceMotion) {
    import('./webgl.js').then(({ initWebgl }) => {
        initWebgl({
            canvas,
            reduceMotion: () => reduceMotion,
            showFallback: showWebglFallback,
            hideFallback: hideWebglFallback,
        })
    }).catch(() => showWebglFallback(false))
}
