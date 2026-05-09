import { describe, expect, it, vi } from 'vitest'

vi.mock('next/dynamic', () => ({
	default: vi.fn((loader, opts) => Object.assign(() => null, { __loader: loader, __opts: opts }))
}))

describe('LazyWalletProvider', () => {
	it('exports a next/dynamic-wrapped component (not a direct WalletProvider import)', async () => {
		const mod = await import('./LazyWalletProvider')
		expect(typeof mod.LazyWalletProvider).toBe('function')
		const loader = (mod.LazyWalletProvider as unknown as { __loader?: () => Promise<unknown> }).__loader
		// next/dynamic was called with a factory. Importing the LazyWalletProvider module
		// must not eagerly invoke the factory, otherwise it would synchronously pull the
		// wagmi/rainbowkit/wagmi-chains stack into every consumer's initial bundle.
		expect(typeof loader).toBe('function')
	})

	it('passes ssr: true (default) so the page can server-render its descendants', async () => {
		const mod = await import('./LazyWalletProvider')
		const opts = (mod.LazyWalletProvider as unknown as { __opts?: { ssr?: boolean } }).__opts
		// Either ssr is explicitly true or the option object was passed without overriding the default.
		expect(opts?.ssr === true || opts?.ssr === undefined).toBe(true)
	})
})
