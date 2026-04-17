import { useEffect } from 'react'

// ── Auth Bridge (parent-side) ───────────────────────────────────
// Listens for postMessage from child subdomains and responds with
// the current user's PocketBase auth data from localStorage.
//
// Only runs on the main site (NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID not set).

const IS_IR_SITE = !!process.env.NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID

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
		if (IS_IR_SITE) return

		window.addEventListener('message', handleAuthCheck)

		if (window.parent !== window) {
			window.parent.postMessage({ type: 'bridge-ready' }, '*')
		}

		return () => window.removeEventListener('message', handleAuthCheck)
	}, [])
}
