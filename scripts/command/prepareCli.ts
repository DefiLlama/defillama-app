import { loadAppEnv } from './env'
import { createRedactedConsoleLogger } from './logger'
import { runPreparationCommand } from './prepare'

const repoRoot = process.cwd()

loadAppEnv({ projectDir: repoRoot })
const logger = createRedactedConsoleLogger()

runPreparationCommand({ logger, repoRoot })
	.then(({ exitCode }) => {
		process.exitCode = exitCode
	})
	.catch((error) => {
		logger.log('[dev:prepare] Fatal error:', error)
		process.exitCode = 1
	})
