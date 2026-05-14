import { afterEach, describe, expect, it, vi } from 'vitest'
import { installProcessLifecycle, killActiveChildren } from '../lifecycle'

afterEach(() => {
	vi.restoreAllMocks()
})

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

	it('runs lifecycle cleanup once when a signal exits', () => {
		const handlers = new Map<string, (...args: unknown[]) => void>()
		const child = { kill: vi.fn(() => true), killed: false }
		const logger = { close: vi.fn(), flush: vi.fn(), log: vi.fn() }
		vi.spyOn(process, 'once').mockImplementation(((event, listener) => {
			handlers.set(String(event), listener as (...args: unknown[]) => void)
			return process
		}) as typeof process.once)
		vi.spyOn(process, 'off').mockImplementation((() => process) as typeof process.off)
		vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null) => {
			throw new Error(`exit ${code}`)
		}) as never)

		installProcessLifecycle({ activeChildren: new Set([child]), logger })

		expect(() => handlers.get('SIGTERM')?.('SIGTERM')).toThrow('exit 143')
		handlers.get('exit')?.(143)

		expect(child.kill).toHaveBeenCalledTimes(1)
		expect(logger.flush).toHaveBeenCalledTimes(1)
		expect(logger.close).toHaveBeenCalledTimes(1)
	})
})
