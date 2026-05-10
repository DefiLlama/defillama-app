import { runPullMetadataCommand } from './metadata/pullCommand'

runPullMetadataCommand()
	.then(({ exitCode }) => {
		process.exit(exitCode)
	})
	.catch((error) => {
		console.log('Fatal error:', error)
		process.exit(1)
	})
