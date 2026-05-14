import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { findRuntimePolicyViolations, FORBIDDEN_RUNTIME_INVOCATIONS, NODE_RUNTIME_MAJOR } from '../runtimePolicy'

const TRACKED_LAUNCHER_FILES = [
	'package.json',
	'Dockerfile',
	'scripts/build.sh',
	'scripts/buildMetadata.sh',
	'scripts/prestart.sh'
]

describe('runtime policy', () => {
	it('records Node 24 as the runtime', () => {
		expect(NODE_RUNTIME_MAJOR).toBe(24)
	})

	it('detects forbidden runtime invocations', () => {
		const [bunNextRuntime, bunServerRuntime, nextStartRuntime] = FORBIDDEN_RUNTIME_INVOCATIONS

		expect(
			findRuntimePolicyViolations([
				{ content: 'bun --bun next dev', filePath: 'package.json' },
				{ content: 'bun server.js', filePath: 'Dockerfile' },
				{ content: 'next start', filePath: 'standalone.sh' },
				{ content: 'node ./node_modules/next/dist/bin/next dev', filePath: 'safe.json' }
			])
		).toEqual([
			{
				filePath: 'package.json',
				message: bunNextRuntime.message,
				patternId: bunNextRuntime.id
			},
			{
				filePath: 'Dockerfile',
				message: bunServerRuntime.message,
				patternId: bunServerRuntime.id
			},
			{
				filePath: 'standalone.sh',
				message: nextStartRuntime.message,
				patternId: nextStartRuntime.id
			}
		])
	})

	it('contains no forbidden runtime invocations in tracked launcher files', async () => {
		const files = await Promise.all(
			TRACKED_LAUNCHER_FILES.map(async (filePath) => ({
				content: await fs.readFile(path.join(process.cwd(), filePath), 'utf8'),
				filePath
			}))
		)

		expect(findRuntimePolicyViolations(files)).toEqual([])
	})
})
