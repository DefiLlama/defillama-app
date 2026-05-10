import { applyMetadataRefresh } from './artifactContract'
import { createMetadataCacheFromGeneratedArtifacts } from './artifacts'
import { fetchCoreMetadata } from './fetch'

const metadataCache = createMetadataCacheFromGeneratedArtifacts()

// On-demand refresh with TTL (1 hour) and concurrency-safe deduplication.
const REFRESH_TTL_MS = 60 * 60 * 1000
let lastRefreshMs = 0
let refreshInFlight: Promise<void> | null = null

function shouldSkipRefreshForLocalDev(): boolean {
	return process.env.NODE_ENV === 'development' && !process.env.API_KEY
}

async function doRefresh(): Promise<void> {
	try {
		const payload = await fetchCoreMetadata({
			existingProtocolLlamaswapDataset: metadataCache.protocolLlamaswapDataset
		})
		applyMetadataRefresh(metadataCache, payload)
		lastRefreshMs = Date.now()
	} catch (err) {
		lastRefreshMs = Date.now()
		console.error('[metadata] refresh failed, keeping stale cache:', err)
	}
}

/**
 * Start a metadata refresh if stale (older than TTL).
 * Safe to call from multiple concurrent requests: only one refresh runs at a time.
 */
function startMetadataRefreshIfStale(): Promise<void> | null {
	// Local contributors without an API key should still be able to boot dev
	// from generated or stub artifacts; affected pages can resolve to 404s.
	if (shouldSkipRefreshForLocalDev()) {
		return null
	}

	const now = Date.now()
	if (now - lastRefreshMs < REFRESH_TTL_MS) {
		return null
	}

	if (refreshInFlight !== null) {
		return refreshInFlight
	}

	refreshInFlight = doRefresh().finally(() => {
		refreshInFlight = null
	})

	return refreshInFlight
}

/**
 * Refresh metadata cache if stale (older than TTL), waiting for the refresh to complete.
 */
export async function refreshMetadataIfStale(): Promise<void> {
	await startMetadataRefreshIfStale()
}

/**
 * Start refreshing stale metadata in the background while callers continue using the current cache.
 */
export function refreshMetadataInBackgroundIfStale(): void {
	void startMetadataRefreshIfStale()
}

export default metadataCache
