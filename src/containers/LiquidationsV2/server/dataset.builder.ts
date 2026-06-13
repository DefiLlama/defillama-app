import path from 'node:path'
import { fetchBlockExplorers } from '~/api'
import type { BlockExplorersResponse } from '~/api/types'
import { fetchAllLiquidations, fetchProtocolsList } from '~/containers/LiquidationsV2/api'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import type { DatasetDomainBuildResult } from '~/server/datasetCache/buildTypes'
import { writeDatasetCacheJson as writeJsonFile } from '~/server/datasetCache/jsonCache'
import { ensureDirectory } from '~/utils/cacheDirectory'

export async function buildLiquidationsDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = path.join(rootDir, 'liquidations')
	const files = DATASET_DOMAIN_ARTIFACTS.liquidations.files
	await ensureDirectory(domainDir)

	const [protocolsResponse, allResponse, blockExplorers] = await Promise.all([
		fetchProtocolsList(),
		fetchAllLiquidations(),
		fetchBlockExplorers().catch((): BlockExplorersResponse => [])
	])

	await Promise.all([
		writeJsonFile(path.join(domainDir, files.rawProtocols), protocolsResponse),
		writeJsonFile(path.join(domainDir, files.rawAll), allResponse),
		writeJsonFile(path.join(domainDir, files.rawBlockExplorers), blockExplorers)
	])

	return { builtAt }
}
