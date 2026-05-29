import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testEnv } from './testEnv'

const originalEnv = process.env
const tempDirs: string[] = []
const silentLogger = { error() {}, info() {} }
const require = createRequire(import.meta.url)

async function importEnvModule() {
	vi.resetModules()
	delete require.cache[require.resolve('@next/env')]
	return import('../env')
}

async function createProjectDir(): Promise<string> {
	const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'app-env-test-'))
	tempDirs.push(projectDir)
	return projectDir
}

beforeEach(() => {
	process.env = testEnv({ PATH: originalEnv.PATH })
	delete (process.env as Record<string, string | undefined>).NODE_ENV
})

afterEach(async () => {
	process.env = originalEnv
	vi.resetModules()
	await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { force: true, recursive: true })))
})

describe('loadAppEnv', () => {
	it('loads env files with Next precedence and preserves process.env values', async () => {
		const projectDir = await createProjectDir()
		await fs.writeFile(path.join(projectDir, '.env'), 'SHARED=env\nPROCESS_WINS=file\n')
		await fs.writeFile(path.join(projectDir, '.env.development'), 'SHARED=development\n')
		await fs.writeFile(path.join(projectDir, '.env.local'), 'SHARED=local\n')
		await fs.writeFile(path.join(projectDir, '.env.development.local'), 'SHARED=development-local\n')
		vi.stubEnv('NODE_ENV', 'development')
		process.env.PROCESS_WINS = 'process'
		const { loadAppEnv } = await importEnvModule()

		const result = loadAppEnv({ forceReload: true, logger: silentLogger, projectDir })

		expect(result.mode).toBe('development')
		expect(process.env.SHARED).toBe('development-local')
		expect(process.env.PROCESS_WINS).toBe('process')
		expect(process.env.NODE_ENV).toBe('development')
	})

	it('uses test mode without loading .env.local', async () => {
		const projectDir = await createProjectDir()
		await fs.writeFile(path.join(projectDir, '.env'), 'SHARED=env\n')
		await fs.writeFile(path.join(projectDir, '.env.local'), 'SHARED=local\n')
		await fs.writeFile(path.join(projectDir, '.env.test'), 'SHARED=test\n')
		vi.stubEnv('NODE_ENV', 'test')
		const { loadAppEnv } = await importEnvModule()

		loadAppEnv({ forceReload: true, logger: silentLogger, projectDir })

		expect(process.env.SHARED).toBe('test')
		expect(process.env.NODE_ENV).toBe('test')
	})

	it('does not invent NODE_ENV when the caller did not set it', async () => {
		const projectDir = await createProjectDir()
		await fs.writeFile(path.join(projectDir, '.env.development.local'), 'LOCAL_VALUE=loaded\n')
		const { getAppEnvMode, loadAppEnv } = await importEnvModule()

		loadAppEnv({ forceReload: true, logger: silentLogger, projectDir })

		expect(process.env.LOCAL_VALUE).toBe('loaded')
		expect(process.env.NODE_ENV).toBeUndefined()
		expect(getAppEnvMode()).toBe('development')
	})
})
