import { filterTokenYieldRows } from '~/containers/Token/tokenYields.server'
import { buildYieldTableRowsWithBorrowData } from '~/containers/Yields/poolsPipeline'
import {
	fetchYieldConfigFromNetwork,
	getLendBorrowDataFromYieldPageData,
	getYieldPageDataFromNetwork
} from '~/containers/Yields/queries/index'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { getYieldPoolTokenVariantSet } from '~/containers/Yields/tokenFilter'
import { getEnvNumber } from '~/utils/async'
import { ensureDirectory, writeJsonFile } from './core'
import {
	getYieldsByTokenDir,
	getYieldsConfigPath,
	getYieldsDomainDir,
	getYieldsLendBorrowPath,
	getYieldsRowsPath,
	getYieldsTokenIndexPath,
	getYieldRowCacheId
} from './yields'

type DomainBuildResult = {
	builtAt: number
}

function getDatasetCacheFetchTimeoutMs(): number {
	return getEnvNumber('DATASET_CACHE_FETCH_TIMEOUT_MS', 180_000)
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

	for (const [token, tokenRows] of byToken) {
		const rowIds = Array.from(
			new Set(
				filterTokenYieldRows(tokenRows, '')
					.map(getYieldRowCacheId)
					.filter((rowId) => rowId.length > 0)
			)
		)
		await writeJsonFile(getYieldsTokenIndexPath(token, rootDir), rowIds)
	}
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

	await writeJsonFile(getYieldsRowsPath(rootDir), transformedPools)
	await writeJsonFile(getYieldsConfigPath(rootDir), yieldConfig)
	await writeJsonFile(getYieldsLendBorrowPath(rootDir), lendBorrowData)
	await writeTokenYieldIndexes(rootDir, transformedPools)

	return { builtAt }
}
