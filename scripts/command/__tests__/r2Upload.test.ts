import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryLogger } from '../logger'
import { uploadR2BuildArtifacts } from '../r2Upload'
import { testEnv } from './testEnv'

const tempDirs: string[] = []

async function createTempProject(): Promise<string> {
	const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'r2-upload-test-'))
	tempDirs.push(projectDir)
	return projectDir
}

async function writeArtifact(projectDir: string, relativePath: string, content: string): Promise<void> {
	const filePath = path.join(projectDir, '.next', 'static', relativePath)
	await fs.mkdir(path.dirname(filePath), { recursive: true })
	await fs.writeFile(filePath, content)
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { force: true, recursive: true })))
})

describe('R2 build artifact upload', () => {
	it('skips when requested by env', async () => {
		const fetchImpl = vi.fn()
		const result = await uploadR2BuildArtifacts({
			env: testEnv({ SKIP_R2_UPLOAD: '1' }),
			fetchImpl,
			logger: createMemoryLogger()
		})

		expect(result).toEqual({ reason: 'skip flag', status: 'skipped' })
		expect(fetchImpl).not.toHaveBeenCalled()
	})

	it('requires R2 credentials and endpoint config', async () => {
		await expect(
			uploadR2BuildArtifacts({
				env: testEnv(),
				fetchImpl: vi.fn(),
				logger: createMemoryLogger()
			})
		).rejects.toThrow('Missing R2 upload environment variables')
	})

	it('uploads .next/static files to the configured R2 bucket', async () => {
		const projectDir = await createTempProject()
		await writeArtifact(projectDir, 'chunks/app.js', 'console.log("ok")')
		await writeArtifact(projectDir, 'media/logo.svg', '<svg />')
		const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 200 }))

		const result = await uploadR2BuildArtifacts({
			env: testEnv({
				R2_ACCESS_KEY_ID: 'access-key',
				R2_ACCOUNT_ID: 'account-id',
				R2_ARTIFACT_PREFIX: 'vercel/main',
				R2_SECRET_ACCESS_KEY: 'secret-key'
			}),
			fetchImpl,
			logger: createMemoryLogger(),
			now: () => new Date('2026-01-01T00:00:00.000Z'),
			projectDir
		})

		expect(result).toMatchObject({ bytes: 24, bucket: 'defillama-app-artifacts', files: 2, prefix: 'vercel/main' })
		expect(fetchImpl).toHaveBeenCalledTimes(2)
		const urls = fetchImpl.mock.calls.map(([url]) => url).sort()
		expect(urls).toEqual([
			'https://account-id.r2.cloudflarestorage.com/defillama-app-artifacts/vercel/main/chunks/app.js',
			'https://account-id.r2.cloudflarestorage.com/defillama-app-artifacts/vercel/main/media/logo.svg'
		])
		const [, request] = fetchImpl.mock.calls[0]
		expect(request.method).toBe('PUT')
		expect(request.headers.Authorization).toContain('AWS4-HMAC-SHA256 Credential=access-key/')
		expect(request.headers['Cache-Control']).toBe('public,max-age=31536000,immutable')
		expect(request.headers['x-amz-date']).toBe('20260101T000000Z')
	})

	it('accepts the existing rclone environment variable names', async () => {
		const projectDir = await createTempProject()
		await writeArtifact(projectDir, 'chunks/app.js', 'app')
		const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 200 }))

		await uploadR2BuildArtifacts({
			env: testEnv({
				RCLONE_CONFIG_ARTIFACTS_ACCESS_KEY_ID: 'access-key',
				RCLONE_CONFIG_ARTIFACTS_ENDPOINT: 'https://account-id.r2.cloudflarestorage.com',
				RCLONE_CONFIG_ARTIFACTS_SECRET_ACCESS_KEY: 'secret-key'
			}),
			fetchImpl,
			logger: createMemoryLogger(),
			now: () => new Date('2026-01-01T00:00:00.000Z'),
			projectDir
		})

		expect(fetchImpl.mock.calls[0][0]).toBe(
			'https://account-id.r2.cloudflarestorage.com/defillama-app-artifacts/chunks/app.js'
		)
	})
})
