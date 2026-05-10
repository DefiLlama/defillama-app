import { isDatasetCacheEnabled } from '../config'
import { isDatasetDomainUnavailableError, type DatasetDomain } from '../core'

export async function readThroughDatasetCache<T>({
	domain,
	readCache,
	readNetwork
}: {
	domain: DatasetDomain
	readCache: () => Promise<T>
	readNetwork: () => Promise<T>
}): Promise<T> {
	if (!isDatasetCacheEnabled()) {
		return readNetwork()
	}

	try {
		return await readCache()
	} catch (error) {
		// A failed manifest domain means the build could not produce that slice;
		// corrupt files inside a ready domain should still fail loudly.
		if (isDatasetDomainUnavailableError(error) && error.domain === domain) {
			console.warn(`[datasetCache] ${domain} domain unavailable; falling back to network: ${error.reason}`)
			return readNetwork()
		}
		throw error
	}
}
