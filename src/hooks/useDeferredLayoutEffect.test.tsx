import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useDeferredLayoutEffect } from './useDeferredLayoutEffect'

// Behaviour-level tests for this hook (RAF scheduling, cleanup-on-unmount) require
// a DOM-aware renderer such as jsdom or @testing-library/react. Neither is installed.
// These tests cover the surface: the export exists, has the expected arity, and the
// hook is safe to call during SSR (uses useEffect when window is unavailable, so the
// scheduling never runs server-side and therefore never throws).

describe('useDeferredLayoutEffect', () => {
	it('exports a function with two parameters (effect, deps)', () => {
		expect(typeof useDeferredLayoutEffect).toBe('function')
		expect(useDeferredLayoutEffect.length).toBe(2)
	})

	it('does not crash when used inside a component rendered on the server', () => {
		function Probe() {
			useDeferredLayoutEffect(() => {
				/* no-op on server */
			}, [])
			return <span data-testid="probe">ok</span>
		}

		const html = renderToStaticMarkup(<Probe />)
		expect(html).toContain('ok')
	})
})
