import { filterTokenYieldRows } from '~/containers/Token/tokenYields.server'
import { getYieldPoolTokenVariantSet } from '~/containers/Yields/domain/tokenFilter'
import { buildYieldTableRowsWithBorrowData } from '~/containers/Yields/poolsPipeline'
import {
	fetchYieldConfigFromNetwork,
	getLendBorrowDataFromYieldPageData,
	getYieldPageDataFromNetwork
} from '~/containers/Yields/queries.server'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { ensureDirectory } from '~/utils/cacheDirectory'
import { getDatasetCacheFetchTimeoutMs } from '~/server/datasetCache/config'
import { writeDatasetCacheJson as writeJsonFile } from '~/server/datasetCache/jsonCache'
import {
	getYieldsByTokenDir,
	getYieldsConfigPath,
	getYieldsDomainDir,
	getYieldsLendBorrowPath,
	getYieldsPageDataPath,
	getYieldsRowsPath,
	getYieldsTokenIndexPath,
	getYieldRowCacheId
} from './dataset.cache'

type DomainBuildResult = {
	builtAt: number
}

async function writeTokenYieldIndexes(rootDir: string, rows: IYieldTableRow[]): Promise<void> {
	const byToken = new Map<string, IYieldTableRow[]>()

	for (const row of rows) {
		for (const token of getYieldPoolTokenVariantSet(row.pool)) {
			const tokenRows = byToken.get(token)
			if (tokenRows) {
				tokenRows.push(row)
			} else {
				byToken.set(token, [row])
			}
		}
	}

	await ensureDirectory(getYieldsByTokenDir(rootDir))

	const writePromises = []
	for (const [token, tokenRows] of byToken) {
		const rowIds = Array.from(
			new Set(
				filterTokenYieldRows(tokenRows, '')
					.map(getYieldRowCacheId)
					.filter((rowId) => rowId.length > 0)
			)
		)
		writePromises.push(writeJsonFile(getYieldsTokenIndexPath(token, rootDir), rowIds))
	}
	await Promise.all(writePromises)
}

export async function buildYieldsDomain(rootDir: string): Promise<DomainBuildResult> {
	const builtAt = Date.now()
	await ensureDirectory(getYieldsDomainDir(rootDir))

	const timeout = getDatasetCacheFetchTimeoutMs()
	const yieldPageData = await getYieldPageDataFromNetwork({ timeout })
	const [lendBorrowData, yieldConfig] = await Promise.all([
		getLendBorrowDataFromYieldPageData(yieldPageData, { timeout }),
		fetchYieldConfigFromNetwork({ timeout })
	])
	const transformedPools = buildYieldTableRowsWithBorrowData(
		yieldPageData.props.pools ?? [],
		lendBorrowData.props.pools ?? []
	)

	await Promise.all([
		writeJsonFile(getYieldsRowsPath(rootDir), transformedPools),
		writeJsonFile(getYieldsPageDataPath(rootDir), yieldPageData),
		writeJsonFile(getYieldsConfigPath(rootDir), yieldConfig),
		writeJsonFile(getYieldsLendBorrowPath(rootDir), lendBorrowData),
		writeTokenYieldIndexes(rootDir, transformedPools)
	])

	return { builtAt }
}
