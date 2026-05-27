import type { YieldPoolTableRow } from '../Tables/types'

export function prepareYieldPoolsCsv(rows: YieldPoolTableRow[]) {
	const headers = [
		'Pool',
		'Project',
		'Chain',
		'TVL',
		'APY',
		'APY Base',
		'APY Reward',
		'Change 1d',
		'Change 7d',
		'Outlook',
		'Confidence',
		'Category',
		'IL 7d',
		'APY Base 7d',
		'APY Net 7d',
		'APY Mean 30d',
		'Volume 1d',
		'Volume 7d',
		'APY Base Inception',
		'APY Including LSD APY',
		'APY Base Including LSD APY',
		'APY Base Borrow',
		'APY Reward Borrow',
		'APY Borrow',
		'Total Supply USD',
		'Total Borrow USD',
		'Total Available USD',
		'Pool Meta',
		'APY Median 30d',
		'APY Std Dev 30d',
		'CV 30d',
		'Holder Count',
		'Holders Avg Position USD',
		'Top 10 %',
		'Holder Change 7d',
		'Holder Change 30d'
	]
	const csvRows: Array<Array<string | number | boolean | null | undefined>> = [headers]
	for (const row of rows) {
		const csvData = {
			Pool: row.pool,
			Project: row.project,
			Chain: row.chains?.join(', '),
			TVL: row.tvl,
			APY: row.apy,
			'APY Base': row.apyBase,
			'APY Reward': row.apyReward,
			'Change 1d': row.change1d,
			'Change 7d': row.change7d,
			Outlook: row.outlook,
			Confidence: row.confidence,
			Category: row.category,
			'IL 7d': row.il7d,
			'APY Base 7d': row.apyBase7d,
			'APY Net 7d': row.apyNet7d,
			'APY Mean 30d': row.apyMean30d,
			'Volume 1d': row.volumeUsd1d,
			'Volume 7d': row.volumeUsd7d,
			'APY Base Inception': row.apyBaseInception,
			'APY Including LSD APY': row.apyIncludingLsdApy,
			'APY Base Including LSD APY': row.apyBaseIncludingLsdApy,
			'APY Base Borrow': row.apyBaseBorrow,
			'APY Reward Borrow': row.apyRewardBorrow,
			'APY Borrow': row.apyBorrow,
			'Total Supply USD': row.totalSupplyUsd,
			'Total Borrow USD': row.totalBorrowUsd,
			'Total Available USD': row.totalAvailableUsd,
			'Pool Meta': row.poolMeta,
			'APY Median 30d': row.apyMedian30d,
			'APY Std Dev 30d': row.apyStd30d,
			'CV 30d': row.cv30d,
			'Holder Count': row.holderCount,
			'Holders Avg Position USD': row.avgPositionUsd,
			'Top 10 %': row.top10Pct,
			'Holder Change 7d': row.holderChange7d,
			'Holder Change 30d': row.holderChange30d
		}
		const csvRow = []
		for (const header of headers) {
			csvRow.push(csvData[header])
		}
		csvRows.push(csvRow)
	}

	return {
		filename: 'yields',
		rows: csvRows
	}
}
