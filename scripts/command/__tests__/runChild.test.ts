import { describe, expect, it } from 'vitest'
import { createMemoryLogger } from '../logger'
import { runChild } from '../runChild'

describe('runChild', () => {
	it('captures child output and exit code', async () => {
		const logger = createMemoryLogger()

		const result = await runChild(process.execPath, ['-e', "process.stdout.write('hello')"], { logger })

		expect(result.exitCode).toBe(0)
		expect(result.signal).toBeNull()
		expect(result.stdoutTail).toBe('hello')
		expect(logger.output.join('')).toBe('hello')
	})

	it('tees stderr into the logger for failed child processes', async () => {
		const logger = createMemoryLogger()

		const result = await runChild(
			process.execPath,
			['-e', "process.stderr.write('next compiler failed'); process.exit(1)"],
			{
				logger
			}
		)

		expect(result.exitCode).toBe(1)
		expect(logger.output.join('')).toBe('next compiler failed')
	})

	it('returns non-zero exits', async () => {
		const result = await runChild(process.execPath, ['-e', 'process.exit(4)'])

		expect(result.exitCode).toBe(4)
		expect(result.signal).toBeNull()
	})
})
