import { publishDatasetCache } from '../../src/server/datasetCache/publish'
import { runPullMetadataCommand } from '../metadata/pullCommand'
import type { LogLike } from './logger'
import { generateRobots } from './robots'
import { CommandExitError, getErrorExitCode, timedStep } from './timedStep'

export type PreparationStep = {
	name: string
	run: () => Promise<void>
}

type PreparationOptions = {
	env?: NodeJS.ProcessEnv
	logger?: LogLike
	now?: () => number
	prefix?: string
	repoRoot?: string
	steps?: PreparationStep[]
}

type PreparationResult = {
	exitCode: number
}

function createStepLogger(logger: LogLike, prefix: string): LogLike {
	if (prefix === '[dev:prepare]') return logger
	return {
		log(...args) {
			const [firstArg, ...rest] = args
			if (typeof firstArg === 'string' && firstArg.startsWith('[dev:prepare]')) {
				logger.log(firstArg.replace('[dev:prepare]', prefix), ...rest)
				return
			}
			logger.log(...args)
		}
	}
}

function asDatasetLogger(logger: LogLike): Pick<Console, 'error' | 'log' | 'warn'> {
	return {
		error: logger.log,
		log: logger.log,
		warn: logger.log
	}
}

function createPreparationSteps({
	env = process.env,
	logger = console,
	prefix = '[dev:prepare]',
	repoRoot = process.cwd()
}: Omit<PreparationOptions, 'now' | 'steps'> = {}): PreparationStep[] {
	const stepLogger = createStepLogger(logger, prefix)

	return [
		{
			name: 'Metadata cache',
			async run() {
				const result = await runPullMetadataCommand({ env, logger: stepLogger, repoRoot })
				if (result.exitCode !== 0) {
					throw new CommandExitError(result.exitCode, 'Metadata cache failed')
				}
			}
		},
		{
			name: 'Dataset cache',
			async run() {
				await publishDatasetCache({ logger: asDatasetLogger(stepLogger) })
			}
		},
		{
			name: 'robots.txt',
			async run() {
				await generateRobots({ env, logger: stepLogger, repoRoot })
			}
		}
	]
}

export async function runPreparationCommand({
	env = process.env,
	logger = console,
	now,
	prefix = '[dev:prepare]',
	repoRoot = process.cwd(),
	steps = createPreparationSteps({ env, logger, prefix, repoRoot })
}: PreparationOptions = {}): Promise<PreparationResult> {
	logger.log(`${prefix} Preparing local data before Next.js starts`)

	for (const step of steps) {
		const result = await timedStep(step.name, step.run, { logger, now, prefix })
		if (result.status === 'failure') {
			return { exitCode: getErrorExitCode(result.error) }
		}
	}

	logger.log(`${prefix} Preparation complete; starting Next.js dev server`)
	return { exitCode: 0 }
}
