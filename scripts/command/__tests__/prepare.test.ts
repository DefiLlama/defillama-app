import { describe, expect, it, vi } from 'vitest'
import { runPreparationCommand, type PreparationStep } from '../prepare'
import { CommandExitError } from '../timedStep'

describe('preparation command', () => {
	it('runs preparation steps in order', async () => {
		const calls: string[] = []
		const steps: PreparationStep[] = [
			{
				name: 'Metadata cache',
				run: vi.fn(async () => {
					calls.push('metadata')
				})
			},
			{
				name: 'Dataset cache',
				run: vi.fn(async () => {
					calls.push('dataset')
				})
			},
			{
				name: 'robots.txt',
				run: vi.fn(async () => {
					calls.push('robots')
				})
			}
		]

		const result = await runPreparationCommand({ logger: { log: vi.fn() }, steps })

		expect(result.exitCode).toBe(0)
		expect(calls).toEqual(['metadata', 'dataset', 'robots'])
	})

	it('stops later preparation steps after a failure', async () => {
		const dataset = vi.fn()
		const steps: PreparationStep[] = [
			{
				name: 'Metadata cache',
				async run() {
					throw new CommandExitError(9, 'metadata failed')
				}
			},
			{ name: 'Dataset cache', run: dataset }
		]

		const result = await runPreparationCommand({ logger: { log: vi.fn() }, steps })

		expect(result.exitCode).toBe(9)
		expect(dataset).not.toHaveBeenCalled()
	})

	it('uses the requested log prefix for build preparation', async () => {
		const logger = { log: vi.fn() }

		await runPreparationCommand({
			logger,
			prefix: '[build:prepare]',
			steps: [{ name: 'Metadata cache', run: vi.fn(async () => {}) }]
		})

		expect(logger.log).toHaveBeenCalledWith('[build:prepare] Preparing local data before Next.js starts')
		expect(logger.log).toHaveBeenCalledWith('[build:prepare] Metadata cache started')
	})
})
