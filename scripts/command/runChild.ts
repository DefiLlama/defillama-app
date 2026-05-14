import { spawn } from 'node:child_process'
import type { CommandLogger } from './logger'

type ActiveChild = {
	kill: (signal?: NodeJS.Signals) => boolean
	killed: boolean
}

export type ActiveChildren = Set<ActiveChild>

export type RunChildResult = {
	exitCode: number | null
	signal: NodeJS.Signals | null
	stdoutTail: string
}

type RunChildOptions = {
	activeChildren?: ActiveChildren
	cwd?: string
	env?: NodeJS.ProcessEnv
	logger?: Pick<CommandLogger, 'stderr' | 'stdout'>
	tailLimit?: number
}

function appendTail(current: string, chunk: Buffer, tailLimit: number): string {
	const next = current + chunk.toString('utf8')
	return next.length > tailLimit ? next.slice(next.length - tailLimit) : next
}

export function runChild(
	command: string,
	args: string[],
	{ activeChildren, cwd, env = process.env, logger, tailLimit = 8192 }: RunChildOptions = {}
): Promise<RunChildResult> {
	return new Promise((resolve) => {
		const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
		let settled = false
		let stdoutTail = ''

		activeChildren?.add(child)

		const finish = (result: RunChildResult) => {
			if (settled) return
			settled = true
			activeChildren?.delete(child)
			resolve(result)
		}

		child.stdout.on('data', (chunk: Buffer) => {
			stdoutTail = appendTail(stdoutTail, chunk, tailLimit)
			logger?.stdout(chunk)
		})
		child.stderr.on('data', (chunk: Buffer) => {
			logger?.stderr(chunk)
		})
		child.on('error', (error) => {
			logger?.stderr(`${command}: ${error.message}\n`)
			finish({ exitCode: 1, signal: null, stdoutTail })
		})
		child.on('close', (exitCode, signal) => {
			finish({ exitCode, signal, stdoutTail })
		})
	})
}
