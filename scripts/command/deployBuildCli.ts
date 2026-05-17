import { runDeployBuild } from './deployBuild'
import { loadAppEnv } from './env'
import { installProcessLifecycle } from './lifecycle'
import { createTeeLogger } from './logger'
import { createSecretRedactor } from './redaction'
import type { ActiveChildren } from './runChild'

const projectDir = process.cwd()
loadAppEnv({ projectDir })

const logger = createTeeLogger({ logPath: `${projectDir}/build.log`, redactor: createSecretRedactor() })
const activeChildren: ActiveChildren = new Set()
const disposeLifecycle = installProcessLifecycle({ activeChildren, logger })

runDeployBuild({ activeChildren, logger, projectDir })
	.then((result) => {
		disposeLifecycle()
		process.exitCode = result.exitCode
	})
	.catch(async (error) => {
		logger.log('Fatal build error:')
		logger.log(error instanceof Error ? error.stack || error.message : String(error))
		logger.flush()
		logger.close()
		disposeLifecycle()
		process.exitCode = 1
	})
