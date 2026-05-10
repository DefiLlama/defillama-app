import { publishDatasetCache } from '../src/server/datasetCache/publish'

publishDatasetCache().catch((error) => {
	console.error('[buildDatasetCache] Failed to build dataset cache', error)
	process.exit(1)
})
