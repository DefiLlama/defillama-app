// ── Child-side auth bridge client ───────────────────────────────
// Loads a hidden <iframe> pointing at the parent's /auth-bridge page,
// then uses postMessage to read PocketBase auth from the parent's
// localStorage.
export interface ParentUser {
	id: string | null
}

interface AuthResponse {
	type: 'auth-response'
	user: ParentUser | null
}

/** Origin of the parent site (scheme + host + port, no trailing slash). */
const PARENT_ORIGIN = process.env.NEXT_PUBLIC_PARENT_ORIGIN ?? 'https://defillama.com'

/** Full URL of the bridge page served by the parent. */
const BRIDGE_URL = `${PARENT_ORIGIN}/auth-bridge`

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

		console.log('[auth-bridge] connecting to parent at', BRIDGE_URL)

		const timeout = setTimeout(() => {
			console.warn('[auth-bridge] timeout — parent did not respond within', TIMEOUT_MS, 'ms')
			cleanup()
			resolve(null)
		}, TIMEOUT_MS)

		function onMessage(e: MessageEvent) {
			if (e.origin !== PARENT_ORIGIN) return

			// Wait for React inside the iframe to hydrate and signal readiness
			if (e.data?.type === 'bridge-ready') {
				console.log('[auth-bridge] parent is ready, sending auth-check')
				iframe.contentWindow?.postMessage({ type: 'auth-check' }, PARENT_ORIGIN)
				return
			}

			if (e.data?.type === 'auth-response') {
				console.log('[auth-bridge] got response:', e.data.user ? `userId=${e.data.user.id}` : 'not logged in')
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
