#!/usr/bin/env node

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nextEnv from '@next/env'
import { createJiti } from 'jiti'

const commandDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(commandDir, '..', '..')
const [scriptPath, ...scriptArgs] = process.argv.slice(2)
const { loadEnvConfig, updateInitialEnv } = nextEnv

if (!scriptPath) {
	console.error('Usage: node ./scripts/command/runTsCommand.mjs <script> [...args]')
	process.exit(1)
}

function restoreNodeEnv(value) {
	if (value === undefined) {
		delete process.env.NODE_ENV
	} else {
		process.env.NODE_ENV = value
	}
}

function getEnvMode() {
	return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' ? process.env.NODE_ENV : 'development'
}

function loadCommandEnv() {
	const originalNodeEnv = process.env.NODE_ENV
	updateInitialEnv({ NODE_ENV: originalNodeEnv })
	loadEnvConfig(repoRoot, getEnvMode() === 'development')
	restoreNodeEnv(originalNodeEnv)
}

process.chdir(repoRoot)
loadCommandEnv()
process.argv = [process.argv[0], path.resolve(repoRoot, scriptPath), ...scriptArgs]
process.env.JITI_JSX ??= '1'
process.env.JITI_ALIAS ??= JSON.stringify({
	'~/public': path.join(repoRoot, 'public'),
	'~/public/*': path.join(repoRoot, 'public', '*'),
	'~': path.join(repoRoot, 'src'),
	'~/*': path.join(repoRoot, 'src', '*')
})

const jiti = createJiti(repoRoot)
const resolvedScriptPath = jiti.resolve(path.resolve(repoRoot, scriptPath))

await jiti.import(resolvedScriptPath).catch((error) => {
	console.error(error)
	process.exit(1)
})
