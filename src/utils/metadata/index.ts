import { runOutsideRouteTelemetry } from '~/utils/telemetry'
import { hydrateMetadataCache, replaceMetadataCacheContents, validateCoreMetadataPayload } from './artifactContract'
import { loadMetadataArtifactsForBoot } from './artifacts'
import {
	getMetadataCacheMaxAgeMs,
	getMetadataCacheRetryMs,
	getMetadataRuntimeRefreshIntervalMs,
	getMetadataRuntimeRefreshJitterMs,
	shouldStartMetadataRuntimeRefreshLoop
} from './config'
import { fetchCoreMetadata } from './fetch'
import { shouldSkipMetadataRefresh } from './policy'

const bootArtifacts = loadMetadataArtifactsForBoot()
const metadataCache = hydrateMetadataCache(bootArtifacts.payload)

let lastSuccessfulRefreshMs = bootArtifacts.manifest?.status === 'ready' ? bootArtifacts.manifest.pulledAt : 0
let lastAttemptMs = 0
let refreshInFlight: Promise<void> | null = null
let runtimeLoopStarted = false
let scheduledRuntimeRefresh: ReturnType<typeof setTimeout> | null = null

export type MetadataRefreshStatus = {
	failedRefreshes: number
	jitteredRefreshAttempts: number
	lastStaleAgeMs: number | null
	retrySuppressions: number
	successfulRefreshes: number
}

const refreshStatus: MetadataRefreshStatus = {
	failedRefreshes: 0,
	jitteredRefreshAttempts: 0,
	lastStaleAgeMs: null,
	retrySuppressions: 0,
	successfulRefreshes: 0
}

function unrefTimer(timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>): void {
	timer.unref?.()
}

function getRuntimeRefreshJitterDelayMs(): number {
	const jitterMs = getMetadataRuntimeRefreshJitterMs()
	return jitterMs > 0 ? Math.floor(Math.random() * (jitterMs + 1)) : 0
}

function isRefreshDue(now: number): boolean {
	if (lastSuccessfulRefreshMs === 0) return true
	const staleAgeMs = now - lastSuccessfulRefreshMs
	refreshStatus.lastStaleAgeMs = staleAgeMs
	return staleAgeMs > getMetadataCacheMaxAgeMs()
}

function isRetrySuppressed(now: number): boolean {
	return lastAttemptMs > 0 && now - lastAttemptMs < getMetadataCacheRetryMs()
}

async function doRefresh(source?: string): Promise<void> {
	try {
		const payload = validateCoreMetadataPayload(await fetchCoreMetadata())
		replaceMetadataCacheContents(metadataCache, payload)
		const now = Date.now()
		lastSuccessfulRefreshMs = now
		lastAttemptMs = now
		refreshStatus.successfulRefreshes += 1
	} catch (err) {
		lastAttemptMs = Date.now()
		refreshStatus.failedRefreshes += 1
		console.error(
			source
				? `[metadata] refresh failed from ${source}, keeping stale cache:`
				: '[metadata] refresh failed, keeping stale cache:',
			err
		)
	}
}

/**
 * Start a metadata refresh if stale. Safe to call from concurrent requests:
 * only one refresh runs at a time, and failed refreshes keep the current cache.
 */
function startMetadataRefreshIfStale(source?: string): Promise<void> | null {
	// Local contributors without an API key should still be able to boot dev
	// from generated or stub artifacts; affected pages can resolve to 404s.
	if (shouldSkipMetadataRefresh()) {
		return null
	}

	const now = Date.now()
	const refreshDue = isRefreshDue(now)
	const retrySuppressed = isRetrySuppressed(now)
	if (!refreshDue || retrySuppressed) {
		if (retrySuppressed) {
			refreshStatus.retrySuppressions += 1
		}
		return null
	}

	if (refreshInFlight !== null) {
		return refreshInFlight
	}

	refreshInFlight = doRefresh(source).finally(() => {
		refreshInFlight = null
	})

	return refreshInFlight
}

function scheduleJitteredRuntimeRefresh(): void {
	if (scheduledRuntimeRefresh !== null) return

	refreshStatus.jitteredRefreshAttempts += 1
	const timer = setTimeout(() => {
		scheduledRuntimeRefresh = null
		void runOutsideRouteTelemetry(() => startMetadataRefreshIfStale('runtime_loop'))
	}, getRuntimeRefreshJitterDelayMs())
	scheduledRuntimeRefresh = timer
	unrefTimer(timer)
}

function runRuntimeRefreshLoopTick(): void {
	const now = Date.now()
	if (!isRefreshDue(now) || isRetrySuppressed(now) || shouldSkipMetadataRefresh()) {
		return
	}
	scheduleJitteredRuntimeRefresh()
}

function startRuntimeRefreshLoop(): void {
	if (runtimeLoopStarted || !shouldStartMetadataRuntimeRefreshLoop()) {
		return
	}
	runtimeLoopStarted = true

	const initialTimer = setTimeout(() => {
		runRuntimeRefreshLoopTick()
		const interval = setInterval(runRuntimeRefreshLoopTick, getMetadataRuntimeRefreshIntervalMs())
		unrefTimer(interval)
	}, getRuntimeRefreshJitterDelayMs())
	unrefTimer(initialTimer)
}

/**
 * Refresh metadata cache if stale, waiting for the refresh to complete.
 */
export async function refreshMetadataIfStale(): Promise<void> {
	await startMetadataRefreshIfStale()
}

/**
 * Start refreshing stale metadata in the background while callers continue using the current cache.
 */
export function refreshMetadataInBackgroundIfStale(source?: string): void {
	void runOutsideRouteTelemetry(() => startMetadataRefreshIfStale(source))
}

export function getMetadataRefreshStatus(): MetadataRefreshStatus {
	return { ...refreshStatus }
}

startRuntimeRefreshLoop()

export default metadataCache
