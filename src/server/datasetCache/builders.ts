import { isDatasetCacheStrict } from './config'
import type { DatasetDomain, DatasetManifest } from './core'
import { buildEmptyDatasetManifest } from './core'
import { DATASET_DOMAINS, getDatasetDomainBuildAdapter, type DatasetDomainBuildResult } from './registry'

export async function buildDatasetDomain(domain: DatasetDomain, rootDir: string): Promise<DatasetDomainBuildResult> {
	return getDatasetDomainBuildAdapter(domain)(rootDir)
}

export async function buildAllDatasetDomains(rootDir: string): Promise<DatasetManifest> {
	const manifest = buildEmptyDatasetManifest()
	const buildResults = await Promise.allSettled(
		DATASET_DOMAINS.map(async (domain) => ({
			domain,
			result: await buildDatasetDomain(domain, rootDir)
		}))
	)
	const failures: string[] = []
	let latestBuiltAt = 0

	for (let index = 0; index < buildResults.length; index += 1) {
		const settledResult = buildResults[index]
		const domain = DATASET_DOMAINS[index]

		if (settledResult.status === 'rejected') {
			manifest.domains[domain] = {
				status: 'failed',
				builtAt: 0,
				error: settledResult.reason instanceof Error ? settledResult.reason.message : String(settledResult.reason)
			}
			failures.push(
				`${domain}: ${settledResult.reason instanceof Error ? settledResult.reason.message : String(settledResult.reason)}`
			)
			continue
		}

		const { result } = settledResult.value
		manifest.domains[domain] = { status: 'ready', builtAt: result.builtAt }
		if (result.builtAt > latestBuiltAt) {
			latestBuiltAt = result.builtAt
		}
	}

	if (failures.length > 0) {
		const message = `Skipped dataset domains:\n${failures.join('\n')}`
		if (isDatasetCacheStrict()) {
			throw new Error(message)
		}
		console.warn(`[buildDatasetCache] ${message}`)
	}

	manifest.builtAt = latestBuiltAt || Date.now()
	return manifest
}
