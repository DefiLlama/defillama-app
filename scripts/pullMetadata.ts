import { runPullMetadataCommand } from './metadata/pullCommand'

runPullMetadataCommand()
	.then(({ exitCode }) => {
		process.exitCode = exitCode
	})
	.catch((error) => {
		console.error('Fatal error:', error)
		process.exitCode = 1
	})
