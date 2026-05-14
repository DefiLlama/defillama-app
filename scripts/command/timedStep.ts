import type { LogLike } from './logger'

export class CommandExitError extends Error {
	constructor(
		public readonly exitCode: number,
		message: string
	) {
		super(message)
		this.name = 'CommandExitError'
	}
}

type TimedStepResult<T> =
	| {
			durationMs: number
			name: string
			status: 'success'
			value: T
	  }
	| {
			durationMs: number
			error: unknown
			name: string
			status: 'failure'
	  }

type TimedStepOptions = {
	logger?: LogLike
	now?: () => number
	prefix?: string
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

function logFailureDetails(logger: LogLike | undefined, prefix: string, name: string, error: unknown): void {
	const message = getErrorMessage(error).trim()
	if (!message) return

	for (const line of message.split(/\r?\n/)) {
		logger?.log(`${prefix} ${name} error: ${line}`)
	}
}

export function getErrorExitCode(error: unknown): number {
	return error instanceof CommandExitError ? error.exitCode : 1
}

export async function timedStep<T>(
	name: string,
	run: () => Promise<T>,
	{ logger, now = Date.now, prefix = '[dev:prepare]' }: TimedStepOptions = {}
): Promise<TimedStepResult<T>> {
	const startedAt = now()
	logger?.log(`${prefix} ${name} started`)

	try {
		const value = await run()
		const durationMs = now() - startedAt
		logger?.log(`${prefix} ${name} finished in ${Math.round(durationMs / 1000)}s`)
		return { durationMs, name, status: 'success', value }
	} catch (error) {
		const durationMs = now() - startedAt
		logger?.log(`${prefix} ${name} failed with exit code ${getErrorExitCode(error)}`)
		logFailureDetails(logger, prefix, name, error)
		return { durationMs, error, name, status: 'failure' }
	}
}
