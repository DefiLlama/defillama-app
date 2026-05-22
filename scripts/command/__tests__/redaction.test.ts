import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTeeLogger, createRedactedConsoleLogger } from '../logger'
import { createSecretRedactor } from '../redaction'
import { testEnv } from './testEnv'

const tempDirs: string[] = []

afterEach(async () => {
	vi.restoreAllMocks()
	await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { force: true, recursive: true })))
})

describe('secret redaction', () => {
	it('redacts secret-like env values but leaves non-secret values visible', () => {
		const redactor = createSecretRedactor(
			testEnv({
				API_KEY: 'secret-api-key',
				BRANCH_NAME: 'main'
			})
		)

		expect(redactor('url=https://pro-api.llama.fi/secret-api-key/api branch=main')).toBe(
			'url=https://pro-api.llama.fi/[REDACTED]/api branch=main'
		)
	})

	it('ignores inherited env values while collecting secrets', () => {
		const env = Object.create({ API_KEY: 'inherited-secret' }) as NodeJS.ProcessEnv
		env.LOGGER_API_KEY = 'own-secret'
		const redactor = createSecretRedactor(env)

		expect(redactor('own-secret inherited-secret')).toBe('[REDACTED] inherited-secret')
	})

	it('redacts terminal and file output from the tee logger', async () => {
		const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'redaction-test-'))
		tempDirs.push(projectDir)
		const output: string[] = []
		const stream = {
			write: vi.fn((chunk: string) => {
				output.push(chunk)
				return true
			})
		} as unknown as NodeJS.WriteStream
		const logger = createTeeLogger({
			logPath: path.join(projectDir, 'build.log'),
			redactor: createSecretRedactor(testEnv({ LOGGER_API_KEY: 'super-secret-key' })),
			stderr: stream,
			stdout: stream
		})

		logger.log('parent super-secret-key')
		logger.stdout('child super-secret-key')
		logger.stderr(Buffer.from('error super-secret-key'))
		logger.close()

		const buildLog = await fs.readFile(path.join(projectDir, 'build.log'), 'utf8')
		expect(output.join('')).toBe('parent [REDACTED]\nchild [REDACTED]error [REDACTED]')
		expect(buildLog).toBe('parent [REDACTED]\nchild [REDACTED]error [REDACTED]')
	})

	it('adds context to build log open failures', async () => {
		const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logger-open-test-'))
		tempDirs.push(projectDir)
		const logPath = path.join(projectDir, 'build.log')
		await fs.mkdir(logPath)

		expect(() => createTeeLogger({ logPath })).toThrow(`Failed to open build log for ${logPath}:`)
	})

	it('redacts notification logger output after build log capture closes', () => {
		const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
		const logger = createRedactedConsoleLogger(testEnv({ BUILD_STATUS_WEBHOOK: 'https://discord.example/secret' }))

		logger.log('failed to post', 'https://discord.example/secret')

		expect(consoleLog).toHaveBeenCalledWith('failed to post', '[REDACTED]')
	})

	it('keeps error stacks while redacting notification logger output', () => {
		const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
		const logger = createRedactedConsoleLogger(testEnv({ LOGGER_API_KEY: 'super-secret-key' }))
		const error = new Error('upload failed')
		error.stack = 'Error: upload failed\n    at upload(super-secret-key)'

		logger.log('Build log upload error', error)

		expect(consoleLog).toHaveBeenCalledWith('Build log upload error', 'Error: upload failed\n    at upload([REDACTED])')
	})
})
