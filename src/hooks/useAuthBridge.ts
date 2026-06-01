import { useEffect } from 'react'
import { isInvestorsEnabled } from '~/containers/Investors/config'

// ── Auth Bridge (parent-side) ───────────────────────────────────
// Listens for postMessage from child subdomains and responds with
// the current user's PocketBase auth data from localStorage.
//
// Only runs on the main site.

const IS_INVESTORS_SITE = isInvestorsEnabled()

const ALLOWED_ORIGINS: string[] = ['https://investors.defillama.com']

function isAllowedOrigin(origin: string): boolean {
	if (ALLOWED_ORIGINS.includes(origin)) return true

	try {
		const url = new URL(origin)
		return url.protocol === 'https:' && url.hostname !== 'defillama.com' && url.hostname.endsWith('.defillama.com')
	} catch {
		return false
	}
}

function handleAuthCheck(e: MessageEvent) {
	if (!e.data || e.data.type !== 'auth-check') return
	if (!isAllowedOrigin(e.origin)) return

	let parsed: any = null
	try {
		const raw = localStorage.getItem('pocketbase_auth')
		if (raw) parsed = JSON.parse(raw)
	} catch {
		parsed = null
	}

	const response: { type: string; user: any } = { type: 'auth-response', user: null }

	if (parsed?.token) {
		response.user = {
			id: parsed.record?.id ?? null
		}
	}

	e.source?.postMessage(response, { targetOrigin: e.origin })
}

export function useAuthBridge() {
	useEffect(() => {
		if (IS_INVESTORS_SITE) return

		window.addEventListener('message', handleAuthCheck)

		if (window.parent !== window) {
			window.parent.postMessage({ type: 'bridge-ready' }, '*')
		}

		return () => window.removeEventListener('message', handleAuthCheck)
	}, [])
}
