import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createBuildResult, findNextBuildId, formatDurationMs } from '../buildResult'

const tempDirs: string[] = []

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { force: true, recursive: true })))
})

describe('build result', () => {
	it('formats duration and status', () => {
		const result = createBuildResult({
			branchName: 'main',
			buildId: 'static-id',
			exitCode: 1,
			finishedAt: new Date('2026-01-01T00:01:05.000Z'),
			logPath: 'build.log',
			startedAt: new Date('2026-01-01T00:00:00.000Z')
		})

		expect(result.status).toBe('failure')
		expect(result.durationMs).toBe(65_000)
		expect(formatDurationMs(result.durationMs)).toBe('1m 5s')
	})

	it('finds the Next build id from the build manifest path', async () => {
		const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'build-result-test-'))
		tempDirs.push(projectDir)
		await fs.mkdir(path.join(projectDir, '.next', 'static-id'), { recursive: true })
		await fs.writeFile(path.join(projectDir, '.next', 'static-id', '_buildManifest.js'), '')

		expect(await findNextBuildId(projectDir)).toBe('static-id')
	})
})
