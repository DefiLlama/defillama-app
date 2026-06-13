import path from 'node:path'
import { getTokenRiskBorrowCapacityFromNetwork } from '~/containers/Token/api'
import { indexBorrowCapacityByAssetKey } from '~/containers/Token/tokenRisk.utils'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import type { DatasetDomainBuildResult } from '~/server/datasetCache/buildTypes'
import { writeDatasetCacheJson as writeJsonFile } from '~/server/datasetCache/jsonCache'
import { ensureDirectory } from '~/utils/cacheDirectory'

export async function buildRiskDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = path.join(rootDir, 'risk')
	const files = DATASET_DOMAIN_ARTIFACTS.risk.files
	await ensureDirectory(domainDir)

	const data = await getTokenRiskBorrowCapacityFromNetwork()
	const indexedTokens = indexBorrowCapacityByAssetKey(data.tokens)
	const indexedRecord: Record<string, typeof data.tokens> = {}

	for (const [assetKey, tokens] of indexedTokens) {
		indexedRecord[assetKey] = tokens
	}

	await writeJsonFile(path.join(domainDir, files.indexed), {
		data,
		indexedTokens: indexedRecord
	})

	return { builtAt }
}
