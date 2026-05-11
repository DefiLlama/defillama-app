import { publishDatasetCache } from '../src/server/datasetCache/publish'

publishDatasetCache().catch((error) => {
	console.error('[dev:prepare] Dataset cache: failed to build', error)
	process.exit(1)
})
