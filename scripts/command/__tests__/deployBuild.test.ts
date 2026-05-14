import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BuildResult } from '../buildResult'
import { runDeployBuild } from '../deployBuild'
import { createMemoryLogger, createTeeLogger } from '../logger'
import { testEnv } from './testEnv'

const tempDirs: string[] = []

function createNow() {
	return vi
		.fn()
		.mockReturnValueOnce(new Date('2026-01-01T00:00:00.000Z'))
		.mockReturnValue(new Date('2026-01-01T00:00:05.000Z'))
}

afterEach(async () => {
	vi.unstubAllGlobals()
	await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { force: true, recursive: true })))
})

describe('deploy build pipeline', () => {
	it('stops before Next when preparation fails', async () => {
		const runNextBuild = vi.fn()
		const syncArtifacts = vi.fn()
		const notify = vi.fn()

		const result = await runDeployBuild({
			branchName: 'main',
			findBuildId: vi.fn().mockResolvedValue(''),
			logger: createMemoryLogger(),
			now: createNow(),
			notify,
			runNextBuild,
			runPrepare: vi.fn().mockResolvedValue(1),
			syncArtifacts
		})

		expect(result.exitCode).toBe(1)
		expect(runNextBuild).not.toHaveBeenCalled()
		expect(syncArtifacts).not.toHaveBeenCalled()
		expect(notify).toHaveBeenCalledWith(result)
	})

	it('uploads the build log URL and mentions users after failed builds', async () => {
		const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'deploy-build-test-'))
		tempDirs.push(projectDir)
		const logPath = path.join(projectDir, 'build.log')
		const silentStream = { write: vi.fn(() => true) } as unknown as NodeJS.WriteStream
		const logger = createTeeLogger({ logPath, stderr: silentStream, stdout: silentStream })
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response('', { status: 200 }))
			.mockResolvedValueOnce(new Response('log-id', { status: 200 }))
			.mockResolvedValueOnce(new Response('', { status: 200 }))
			.mockResolvedValueOnce(new Response('', { status: 200 }))
		vi.stubGlobal('fetch', fetchImpl)

		const result = await runDeployBuild({
			env: testEnv({
				BUILD_NOTIFY_USERS: '1,2',
				BUILD_STATUS_WEBHOOK: 'https://discord.example/webhook',
				LOGGER_API_URL: 'https://logs.example'
			}),
			findBuildId: vi.fn().mockResolvedValue(''),
			logger,
			logPath,
			now: createNow(),
			runNextBuild: vi.fn(),
			runPrepare: vi.fn().mockResolvedValue(1)
		})

		expect(result.exitCode).toBe(1)
		expect(fetchImpl).toHaveBeenCalledTimes(4)
		expect(fetchImpl.mock.calls[0][0]).toBe('https://discord.example/webhook')
		expect(fetchImpl.mock.calls[1][0]).toBe('https://logs.example')
		expect(fetchImpl.mock.calls[2][1]?.body).toContain('https://logs.example/get/log-id')
		expect(fetchImpl.mock.calls[3][1]?.body).toContain('<@1> <@2>')

		const uploadBody = JSON.parse(fetchImpl.mock.calls[1][1]?.body as string)
		const uploadedLog = Buffer.from(uploadBody.data, 'base64').toString('utf8')
		expect(uploadedLog).toContain('Skipping next build due to earlier failure')
		expect(uploadedLog).toContain('Build failed in 5s')
	})

	it('uploads Next.js failure output and exit metadata in the build log', async () => {
		const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'deploy-build-next-fail-test-'))
		tempDirs.push(projectDir)
		const logPath = path.join(projectDir, 'build.log')
		const silentStream = { write: vi.fn(() => true) } as unknown as NodeJS.WriteStream
		const logger = createTeeLogger({ logPath, stderr: silentStream, stdout: silentStream })
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response('', { status: 200 }))
			.mockResolvedValueOnce(new Response('log-id', { status: 200 }))
			.mockResolvedValueOnce(new Response('', { status: 200 }))
		vi.stubGlobal('fetch', fetchImpl)

		const result = await runDeployBuild({
			env: testEnv({
				BUILD_STATUS_WEBHOOK: 'https://discord.example/webhook',
				LOGGER_API_URL: 'https://logs.example'
			}),
			findBuildId: vi.fn().mockResolvedValue(''),
			logger,
			logPath,
			now: createNow(),
			runNextBuild: vi.fn(async (childLogger) => {
				childLogger.stderr('Next compiler error: Cannot find module @tanstack/react-query-hash\n')
				return { exitCode: 1, signal: null, stdoutTail: '' }
			}),
			runPrepare: vi.fn().mockResolvedValue(0)
		})

		expect(result.exitCode).toBe(1)
		const uploadBody = JSON.parse(fetchImpl.mock.calls[1][1]?.body as string)
		const uploadedLog = Buffer.from(uploadBody.data, 'base64').toString('utf8')
		expect(uploadedLog).toContain('Next.js build started')
		expect(uploadedLog).toContain('Next compiler error: Cannot find module @tanstack/react-query-hash')
		expect(uploadedLog).toContain('Next.js build failed with exit code 1')
	})

	it('keeps the build result when notification throws', async () => {
		const result = await runDeployBuild({
			findBuildId: vi.fn().mockResolvedValue(''),
			logger: createMemoryLogger(),
			now: createNow(),
			notify: vi.fn().mockRejectedValue(new Error('discord down')),
			runNextBuild: vi.fn().mockResolvedValue({ exitCode: 3, signal: null, stdoutTail: '' }),
			runPrepare: vi.fn().mockResolvedValue(0)
		})

		expect(result.exitCode).toBe(3)
		expect(result.status).toBe('failure')
	})

	it('keeps notifying when build id lookup fails', async () => {
		const logger = createMemoryLogger()
		const notify = vi.fn()

		const result = await runDeployBuild({
			findBuildId: vi.fn().mockRejectedValue(new Error('manifest unreadable')),
			logger,
			now: createNow(),
			notify,
			runNextBuild: vi.fn().mockResolvedValue({ exitCode: 0, signal: null, stdoutTail: '' }),
			runPrepare: vi.fn().mockResolvedValue(0),
			syncArtifacts: vi.fn()
		})

		expect(result.buildId).toBe('')
		expect(result.status).toBe('success')
		expect(notify).toHaveBeenCalledWith(result)
		expect(logger.output.join('')).toContain('Failed to resolve Next.js build ID: manifest unreadable')
	})

	it('skips artifact sync when Next fails', async () => {
		const syncArtifacts = vi.fn()

		const result = await runDeployBuild({
			findBuildId: vi.fn().mockResolvedValue(''),
			logger: createMemoryLogger(),
			now: createNow(),
			notify: vi.fn(),
			runNextBuild: vi.fn().mockResolvedValue({ exitCode: 2, signal: null, stdoutTail: '' }),
			runPrepare: vi.fn().mockResolvedValue(0),
			syncArtifacts
		})

		expect(result.exitCode).toBe(2)
		expect(syncArtifacts).not.toHaveBeenCalled()
	})

	it('syncs artifacts and notifies after a successful build', async () => {
		const syncArtifacts = vi.fn()
		const notify = vi.fn()

		const result = await runDeployBuild({
			findBuildId: vi.fn().mockResolvedValue('build-id'),
			logger: createMemoryLogger(),
			now: createNow(),
			notify,
			runNextBuild: vi.fn().mockResolvedValue({ exitCode: 0, signal: null, stdoutTail: '' }),
			runPrepare: vi.fn().mockResolvedValue(0),
			syncArtifacts
		})

		expect(result).toMatchObject<Partial<BuildResult>>({
			buildId: 'build-id',
			exitCode: 0,
			status: 'success'
		})
		expect(syncArtifacts).toHaveBeenCalledWith(result)
		expect(notify).toHaveBeenCalledWith(result)
	})
})
