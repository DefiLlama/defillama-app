import { describe, expect, it, vi } from 'vitest'
import { syncBuildArtifacts } from '../artifactSync'
import type { BuildResult } from '../buildResult'
import { createMemoryLogger } from '../logger'
import { testEnv } from './testEnv'

const successfulBuild: BuildResult = {
	branchName: 'main',
	buildId: 'id',
	durationMs: 1,
	exitCode: 0,
	logPath: 'build.log',
	startedAt: '2026-01-01T00:00:00.000Z',
	status: 'success'
}

const artifactSyncEnv = testEnv({
	RCLONE_CONFIG_ARTIFACTS_ACCESS_KEY_ID: 'access-key',
	RCLONE_CONFIG_ARTIFACTS_ENDPOINT: 'https://r2.example',
	RCLONE_CONFIG_ARTIFACTS_SECRET_ACCESS_KEY: 'secret-key'
})

describe('artifact sync adapter', () => {
	it('skips when requested by env', async () => {
		const runCommand = vi.fn()

		const result = await syncBuildArtifacts({
			env: testEnv({ SKIP_ARTIFACT_SYNC: '1' }),
			logger: createMemoryLogger(),
			result: successfulBuild,
			runCommand
		})

		expect(result).toEqual({ reason: 'skip flag', status: 'skipped' })
		expect(runCommand).not.toHaveBeenCalled()
	})

	it('skips when the artifact remote is not configured', async () => {
		const runCommand = vi.fn()

		const result = await syncBuildArtifacts({
			env: testEnv(),
			logger: createMemoryLogger(),
			result: successfulBuild,
			runCommand
		})

		expect(result).toEqual({ reason: 'missing rclone env', status: 'skipped' })
		expect(runCommand).not.toHaveBeenCalled()
	})

	it('runs upload and download commands for successful builds', async () => {
		const runCommand = vi.fn().mockResolvedValue({ exitCode: 0, signal: null, stdoutTail: '' })

		const result = await syncBuildArtifacts({
			env: artifactSyncEnv,
			logger: createMemoryLogger(),
			result: successfulBuild,
			runCommand
		})

		expect(result).toEqual({ status: 'success' })
		expect(runCommand).toHaveBeenCalledTimes(2)
	})

	it('returns a failed result when rclone fails', async () => {
		const failed = { exitCode: 1, signal: null, stdoutTail: 'nope' }
		const runCommand = vi.fn().mockResolvedValue(failed)

		const result = await syncBuildArtifacts({
			env: artifactSyncEnv,
			logger: createMemoryLogger(),
			result: successfulBuild,
			runCommand
		})

		expect(result).toEqual({ result: failed, status: 'failed', step: 'upload' })
	})
})
