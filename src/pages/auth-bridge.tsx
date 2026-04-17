// Blank page used as an iframe target by child subdomains.
// The actual postMessage listener lives in useAuthBridge (mounted in _app.tsx).
// This page exists so the child can load a lightweight URL from the parent origin.

export default function AuthBridgePage() {
	return null
}
