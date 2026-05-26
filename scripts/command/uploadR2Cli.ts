import { loadAppEnv } from './env'
import { createRedactedConsoleLogger } from './logger'
import { uploadR2BuildArtifacts } from './r2Upload'

const projectDir = process.cwd()

loadAppEnv({ projectDir })
const logger = createRedactedConsoleLogger()

uploadR2BuildArtifacts({ logger, projectDir })
	.then(() => {
		process.exitCode = 0
	})
	.catch((error) => {
		logger.log('R2 artifact upload failed:', error)
		process.exitCode = 1
	})
