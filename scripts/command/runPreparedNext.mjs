#!/usr/bin/env node

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const commandDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(commandDir, '..', '..')
const [nodeEnv, nextCommand, ...nextArgs] = process.argv.slice(2)

if (!nodeEnv || !nextCommand) {
	console.error('Usage: node ./scripts/command/runPreparedNext.mjs <NODE_ENV> <next-command> [...args]')
	process.exit(1)
}

const env = { ...process.env, NODE_ENV: nodeEnv }

function packageBin(name) {
	return path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name)
}

function run(command, args) {
	return new Promise((resolve) => {
		const child = spawn(command, args, { cwd: repoRoot, env, stdio: 'inherit' })
		child.on('error', (error) => {
			console.error(`${command}: ${error.message}`)
			resolve(1)
		})
		child.on('close', (exitCode, signal) => {
			if (signal) {
				resolve(1)
				return
			}
			resolve(exitCode ?? 1)
		})
	})
}

const prepareExitCode = await run(process.execPath, [
	path.join(repoRoot, 'scripts', 'command', 'runTsCommand.mjs'),
	'scripts/command/prepareCli.ts'
])
if (prepareExitCode !== 0) {
	process.exitCode = prepareExitCode
} else {
	process.exitCode = await run(packageBin('next'), [nextCommand, ...nextArgs])
}
