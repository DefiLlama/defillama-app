import fs from 'node:fs'
import path from 'node:path'
import { createSecretRedactor } from './redaction'

export type LogLike = {
	log: (...args: unknown[]) => void
}

export type CommandLogger = LogLike & {
	close: () => void
	flush: () => void
	stderr: (chunk: Buffer | string) => void
	stdout: (chunk: Buffer | string) => void
}

type TeeLoggerOptions = {
	logPath: string
	redactor?: (text: string) => string
	stderr?: NodeJS.WriteStream
	stdout?: NodeJS.WriteStream
}

function createFileOperationError(operation: string, target: string, error: unknown): Error {
	return new Error(`Failed to ${operation} for ${target}: ${error instanceof Error ? error.message : String(error)}`, {
		cause: error
	})
}

export function createTeeLogger({
	logPath,
	redactor = createSecretRedactor(),
	stderr = process.stderr,
	stdout = process.stdout
}: TeeLoggerOptions): CommandLogger {
	fs.mkdirSync(path.dirname(logPath), { recursive: true })
	let fd: number
	try {
		fd = fs.openSync(logPath, 'w')
	} catch (error) {
		throw createFileOperationError('open build log', logPath, error)
	}
	let closed = false

	const writeFile = (chunk: string) => {
		if (!closed) {
			try {
				fs.writeSync(fd, chunk)
			} catch (error) {
				throw createFileOperationError('write build log', logPath, error)
			}
		}
	}
	const redactChunk = (chunk: Buffer | string) => redactor(typeof chunk === 'string' ? chunk : chunk.toString('utf8'))

	return {
		close() {
			if (!closed) {
				try {
					fs.closeSync(fd)
				} catch (error) {
					throw createFileOperationError('close build log', `fd ${fd} (${logPath})`, error)
				} finally {
					closed = true
				}
			}
		},
		flush() {
			if (!closed) {
				try {
					fs.fsyncSync(fd)
				} catch (error) {
					throw createFileOperationError('flush build log', `fd ${fd} (${logPath})`, error)
				}
			}
		},
		log(...args) {
			const line = redactor(formatLogLine(args))
			stdout.write(line)
			writeFile(line)
		},
		stderr(chunk) {
			const redactedChunk = redactChunk(chunk)
			stderr.write(redactedChunk)
			writeFile(redactedChunk)
		},
		stdout(chunk) {
			const redactedChunk = redactChunk(chunk)
			stdout.write(redactedChunk)
			writeFile(redactedChunk)
		}
	}
}

function formatLogArg(arg: unknown): string {
	return arg instanceof Error ? (arg.stack ?? arg.message) : String(arg)
}

function formatLogLine(args: unknown[]): string {
	return `${args.map(formatLogArg).join(' ')}\n`
}

export function createRedactedConsoleLogger(env: NodeJS.ProcessEnv = process.env): LogLike {
	const redactor = createSecretRedactor(env)
	return {
		log(...args) {
			console.log(...args.map((arg) => redactor(formatLogArg(arg))))
		}
	}
}

export function createMemoryLogger(): CommandLogger & { output: string[] } {
	const output: string[] = []
	const write = (chunk: Buffer | string) => {
		output.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'))
	}

	return {
		close() {},
		flush() {},
		log(...args) {
			write(formatLogLine(args))
		},
		output,
		stderr: write,
		stdout: write
	}
}
