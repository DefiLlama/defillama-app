import path from 'node:path'
import { SERVER_URL } from '~/constants'
import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import type { DatasetDomainBuildResult } from '~/server/datasetCache/buildTypes'
import { writeDatasetCacheJson as writeJsonFile } from '~/server/datasetCache/jsonCache'
import { fetchJson } from '~/utils/async'
import { ensureDirectory } from '~/utils/cacheDirectory'
import { buildTokenRightsIndexes } from './dataset.index'

export async function buildTokenRightsDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = path.join(rootDir, 'token-rights')
	const files = DATASET_DOMAIN_ARTIFACTS['token-rights'].files
	await ensureDirectory(domainDir)

	const entries = await fetchJson<IRawTokenRightsEntry[]>(`${SERVER_URL}/token-rights`)
	const indexes = buildTokenRightsIndexes(entries)

	await Promise.all([
		writeJsonFile(path.join(domainDir, files.full), entries),
		writeJsonFile(path.join(domainDir, files.byDefillamaId), indexes.byDefillamaId),
		writeJsonFile(path.join(domainDir, files.byProtocolName), indexes.byProtocolName)
	])

	return { builtAt }
}
