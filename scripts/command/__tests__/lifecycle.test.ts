import { describe, expect, it, vi } from 'vitest'
import { killActiveChildren } from '../lifecycle'

describe('command lifecycle', () => {
	it('kills active children and clears the set', () => {
		const child = { kill: vi.fn(() => true), killed: false }
		const activeChildren = new Set([child])

		killActiveChildren(activeChildren)

		expect(child.kill).toHaveBeenCalledWith('SIGTERM')
		expect(activeChildren.size).toBe(0)
	})

	it('keeps cleaning up when one child kill throws', () => {
		const brokenChild = {
			kill: vi.fn(() => {
				throw new Error('already exited')
			}),
			killed: false
		}
		const child = { kill: vi.fn(() => true), killed: false }
		const activeChildren = new Set([brokenChild, child])

		killActiveChildren(activeChildren)

		expect(brokenChild.kill).toHaveBeenCalledWith('SIGTERM')
		expect(child.kill).toHaveBeenCalledWith('SIGTERM')
		expect(activeChildren.size).toBe(0)
	})
})
