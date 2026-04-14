// ── Child-side auth bridge client ───────────────────────────────
// Loads a hidden <iframe> pointing at the parent's /auth-bridge page,
// then uses postMessage to read PocketBase auth from the parent's
// localStorage.
//
// Usage:
//   const user = await checkParentAuth();
//   if (user) console.log("Logged in on parent:", user.email);
//
// Copy this file into any child service that needs to check
// whether the visitor is logged in on the parent site.

export interface ParentUser {
	id: string | null
	email: string | null
	name: string | null
	avatar: string | null
	hasActiveSubscription: boolean
	/** PocketBase JWT – lets the child make authenticated API calls on behalf of the user */
	token: string
}

interface AuthResponse {
	type: 'auth-response'
	user: ParentUser | null
}

// ── Configuration ───────────────────────────────────────────────
// Flip these when switching between local dev and production.

/** Origin of the parent site (scheme + host + port, no trailing slash). */
const PARENT_ORIGIN =
	process.env.NEXT_PUBLIC_PARENT_ORIGIN ??
	(process.env.NODE_ENV === 'development' ? 'http://lvh.me:3000' : 'https://defillama.com')

/** Full URL of the bridge page served by the parent. */
const BRIDGE_URL = `${PARENT_ORIGIN}/auth-bridge`

/** How long to wait (ms) before giving up on the parent response. */
const TIMEOUT_MS = 3_000

// ── Public API ──────────────────────────────────────────────────

/**
 * Ask the parent site whether the visitor is logged in.
 * Resolves with the user object or `null` (not logged in / bridge unreachable).
 * Never rejects – a timeout or error simply returns `null`.
 */
export function checkParentAuth(): Promise<ParentUser | null> {
	// SSR guard
	if (typeof window === 'undefined') return Promise.resolve(null)

	return new Promise<ParentUser | null>((resolve) => {
		const iframe = document.createElement('iframe')
		iframe.src = BRIDGE_URL
		iframe.style.display = 'none'

		const timeout = setTimeout(() => {
			cleanup()
			resolve(null)
		}, TIMEOUT_MS)

		function onMessage(e: MessageEvent) {
			if (e.origin !== PARENT_ORIGIN) return

			// Wait for React inside the iframe to hydrate and signal readiness
			if (e.data?.type === 'bridge-ready') {
				iframe.contentWindow?.postMessage({ type: 'auth-check' }, PARENT_ORIGIN)
				return
			}

			if (e.data?.type === 'auth-response') {
				cleanup()
				resolve((e.data as AuthResponse).user)
			}
		}

		function cleanup() {
			clearTimeout(timeout)
			window.removeEventListener('message', onMessage)
			iframe.remove()
		}

		window.addEventListener('message', onMessage)
		document.body.appendChild(iframe)

		iframe.onerror = () => {
			cleanup()
			resolve(null)
		}
	})
}
