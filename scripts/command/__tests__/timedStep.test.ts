import { describe, expect, it, vi } from 'vitest'
import { CommandExitError, timedStep } from '../timedStep'

describe('timedStep', () => {
	it('returns a successful timed result', async () => {
		const logger = { log: vi.fn() }
		const now = vi.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(3_500)

		const result = await timedStep('Example', async () => 'done', { logger, now })

		expect(result).toEqual({ durationMs: 2_500, name: 'Example', status: 'success', value: 'done' })
		expect(logger.log).toHaveBeenCalledWith('[dev:prepare] Example started')
		expect(logger.log).toHaveBeenCalledWith('[dev:prepare] Example finished in 3s')
	})

	it('captures command exit failures without running callers past the result', async () => {
		const logger = { log: vi.fn() }

		const result = await timedStep(
			'Example',
			async () => {
				throw new CommandExitError(7, 'failed')
			},
			{ logger, now: vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(1) }
		)

		expect(result.status).toBe('failure')
		expect(logger.log).toHaveBeenCalledWith('[dev:prepare] Example failed with exit code 7')
	})
})
