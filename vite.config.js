import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import restart from 'vite-plugin-restart'
import glsl from 'vite-plugin-glsl'

function fontFileInside(rootDir, requestUrl) {
    const pathname = String(requestUrl || '').split('?')[0]
    if (!/\.(woff2?|ttf|otf)$/i.test(pathname)) return null
    let decoded
    try {
        decoded = decodeURIComponent(pathname)
    } catch {
        return false
    }
    if (decoded.includes('\0')) return false
    const parts = decoded.replace(/\\/g, '/').split('/').filter((part) => part.length > 0)
    if (parts.length === 0 || parts.some((part) => part === '..' || part === '.')) return false
    const full = resolve(rootDir, ...parts)
    const rel = relative(rootDir, full)
    if (!rel || rel.startsWith('..') || isAbsolute(rel) || rel.split(sep).includes('..')) return false
    return full
}

function guardFonts(rootDir) {
    return (req, res, next) => {
        const located = fontFileInside(rootDir, req.url)
        if (located === null) return next()
        if (located === false || !existsSync(located)) {
            res.statusCode = 404
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end('Not found')
            return
        }
        next()
    }
}

function productionHeaders() {
    const file = new URL('./vercel.json', import.meta.url)
    const config = JSON.parse(readFileSync(file, 'utf8'))
    const headers = (config.headers || []).flatMap((rule) => rule.headers || [])
    return (req, res, next) => {
        for (const header of headers) res.setHeader(header.key, header.value)
        next()
    }
}

export default {
    root: 'src/',
    publicDir: '../static/',
    base: './',
    server:
    {
        host: 'localhost',
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env)
    },
    build:
    {
        outDir: '../dist',
        emptyOutDir: true,
        sourcemap: false
    },
    plugins:
    [
        restart({ restart: [ '../static/**', ] }),
        glsl(),
        {
            name: 'missing-font-status',
            configureServer(server) {
                server.middlewares.use(guardFonts(resolve('src')))
            },
            configurePreviewServer(server) {
                server.middlewares.use(productionHeaders())
                server.middlewares.use(guardFonts(resolve('dist')))
            }
        }
    ]
}
