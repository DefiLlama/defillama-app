import { describe, expect, it, vi } from 'vitest'
import { sendBuildNotification } from '../buildNotification'
import type { BuildResult } from '../buildResult'
import { testEnv } from './testEnv'

const failedBuild: BuildResult = {
	branchName: 'main',
	buildId: 'id',
	durationMs: 1_000,
	exitCode: 1,
	logPath: 'build.log',
	startedAt: '2026-01-01T00:00:00.000Z',
	status: 'failure'
}

describe('build notification adapter', () => {
	it('skips when requested by env', async () => {
		const fetchImpl = vi.fn()

		const result = await sendBuildNotification({
			env: testEnv({ SKIP_BUILD_NOTIFY: '1' }),
			fetchImpl,
			logger: { log: vi.fn() },
			result: failedBuild
		})

		expect(result).toEqual({ reason: 'skip flag', status: 'skipped' })
		expect(fetchImpl).not.toHaveBeenCalled()
	})

	it('posts summary, build log URL, and failure mentions', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response('', { status: 200 }))
			.mockResolvedValueOnce(new Response('log-id', { status: 200 }))
			.mockResolvedValueOnce(new Response('', { status: 200 }))
			.mockResolvedValueOnce(new Response('', { status: 200 }))

		const result = await sendBuildNotification({
			env: testEnv({
				BUILD_NOTIFY_USERS: '1,2',
				BUILD_STATUS_WEBHOOK: 'https://discord.example/webhook',
				LOGGER_API_URL: 'https://logs.example'
			}),
			fetchImpl,
			logger: { log: vi.fn() },
			readFile: vi.fn().mockResolvedValue('build log'),
			result: failedBuild
		})

		expect(result).toEqual({ buildLogUrl: 'https://logs.example/get/log-id', status: 'sent' })
		expect(fetchImpl).toHaveBeenCalledTimes(4)
	})

	it('keeps notification successful when build-log upload fails', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response('', { status: 200 }))
			.mockResolvedValueOnce(new Response('bad', { status: 500 }))
			.mockResolvedValueOnce(new Response('', { status: 200 }))

		const result = await sendBuildNotification({
			env: testEnv({
				BUILD_NOTIFY_USERS: '1',
				BUILD_STATUS_WEBHOOK: 'https://discord.example/webhook',
				LOGGER_API_URL: 'https://logs.example'
			}),
			fetchImpl,
			logger: { log: vi.fn() },
			readFile: vi.fn().mockResolvedValue('build log'),
			result: failedBuild
		})

		expect(result).toEqual({ buildLogUrl: '', status: 'sent' })
		expect(fetchImpl).toHaveBeenCalledTimes(3)
	})

	it('keeps notification successful when webhook posting throws', async () => {
		const fetchImpl = vi.fn().mockRejectedValueOnce(new Error('network down'))

		const result = await sendBuildNotification({
			env: testEnv({ BUILD_STATUS_WEBHOOK: 'https://discord.example/webhook' }),
			fetchImpl,
			logger: { log: vi.fn() },
			result: failedBuild
		})

		expect(result).toEqual({ buildLogUrl: '', status: 'sent' })
		expect(fetchImpl).toHaveBeenCalledTimes(1)
	})
})
