import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { CHART_COLORS } from '~/constants/colors'
import { oldBlue } from '~/constants/colors'
import { getDominancePercent, getNDistinctColors, slug } from '~/utils'
import { fetchDATInstitutions, fetchDATInstitutionDetail, toUnixMsTimestamp } from './api'
import type { IDATInstitutionsResponse } from './api.types'
import type {
	IDATOverviewPageProps,
	IDATInstitutionOverview,
	IDATDailyFlowByAsset,
	IDATOverviewDataByAssetProps,
	IDATInstitutionOverviewByAsset,
	IDATCompanyPageProps,
	IDATCompanyAssetBreakdown,
	IDATCompanyChartByAsset
} from './types'

function breakdownColor(type: string): string | null {
	switch (type) {
		case 'Bitcoin':
			return '#f97316'
		case 'Ethereum':
			return '#2563eb'
		case 'Solana':
			return '#6d28d9'
		case 'Hyperliquid':
			return '#16a34a'
		case 'XRP':
			return '#6b7280'
		case 'Tron Network':
			return '#E91E63'
		default:
			return null
	}
}

const RESERVED_DYNAMIC_COLOR_OFFSET = 6
const EXTRA_DYNAMIC_COLOR_BUFFER = RESERVED_DYNAMIC_COLOR_OFFSET + 1
const EXCLUDED_DISTINCT_COLOR = '#673AB7'

function buildColorByAsset(res: IDATInstitutionsResponse): Record<string, string> {
	const colorByAsset: Record<string, string> = {}
	const assetKeys = Object.keys(res.assetMetadata)
	// Keep a small offset so fallback colors do not overlap too closely with fixed asset colors.
	const colors = getNDistinctColors(assetKeys.length + EXTRA_DYNAMIC_COLOR_BUFFER).filter(
		(color) => color !== EXCLUDED_DISTINCT_COLOR
	)
	let i = 0
	for (const asset of assetKeys) {
		const color = breakdownColor(res.assetMetadata[asset].name)
		if (color != null) {
			colorByAsset[asset] = color
		} else {
			colorByAsset[asset] = colors[i + RESERVED_DYNAMIC_COLOR_OFFSET]
		}
		i++
	}
	return colorByAsset
}

function buildAllAssetLinks(res: IDATInstitutionsResponse): Array<{ label: string; to: string }> {
	const assetEntries: Array<[string, number]> = []
	for (const key in res.assetMetadata) {
		assetEntries.push([key, res.assetMetadata[key].totalUsdValue ?? 0])
	}
	assetEntries.sort((a, b) => b[1] - a[1])
	return [
		{ label: 'All', to: '/digital-asset-treasuries' },
		...assetEntries.map(([asset]) => ({
			label: res.assetMetadata[asset].name,
			to: `/digital-asset-treasuries/${asset}`
		}))
	]
}

export async function getDATOverviewData(): Promise<IDATOverviewPageProps> {
	const res = await fetchDATInstitutions()

	const allAssets = buildAllAssetLinks(res)
	const colorByAsset = buildColorByAsset(res)

	const inflowsByAssetByDate: Record<string, Record<string, [number, number]>> = {}
	const dailyFlowsByAsset: Record<string, IDATDailyFlowByAsset> = {}
	for (const asset in res.flows) {
		const name = res.assetMetadata[asset]?.name ?? asset
		dailyFlowsByAsset[asset] = {
			name,
			stack: 'asset',
			type: 'bar',
			color: colorByAsset[asset],
			data: []
		}
		for (const [date, _net, _inflow, _outflow, purchasePrice, usdValueOfPurchase] of res.flows[asset]) {
			inflowsByAssetByDate[date] = inflowsByAssetByDate[date] ?? {}
			inflowsByAssetByDate[date][asset] = [purchasePrice ?? usdValueOfPurchase ?? 0, _net]
		}
	}

	for (const date in inflowsByAssetByDate) {
		for (const asset in res.flows) {
			dailyFlowsByAsset[asset].data.push([
				+date,
				inflowsByAssetByDate[date][asset]?.[0] ?? null,
				inflowsByAssetByDate[date][asset]?.[1] ?? null
			])
		}
	}

	// Sort data by date for each asset to ensure correct cumulative calculations
	for (const asset in dailyFlowsByAsset) {
		dailyFlowsByAsset[asset].data.sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0))
	}

	const institutions: IDATInstitutionOverview[] = res.institutions.map((institution) => {
		const metadata = res.institutionMetadata[institution.institutionId]
		return {
			...metadata,
			holdings: Object.entries(metadata.holdings)
				.map(([asset, holding]) => ({
					name: res.assetMetadata[asset].name,
					ticker: res.assetMetadata[asset].ticker,
					amount: holding.amount,
					cost: holding.cost ?? null,
					usdValue: holding.usdValue ?? null,
					avgPrice: holding.avgPrice ?? null,
					dominance: getDominancePercent(holding.usdValue ?? 0, metadata.totalUsdValue),
					color: colorByAsset[asset]
				}))
				.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))
		}
	})

	return { allAssets, institutions, dailyFlowsByAsset }
}

export async function getDATOverviewDataByAsset(asset: string): Promise<IDATOverviewDataByAssetProps | null> {
	const res = await fetchDATInstitutions()

	const allAssets = buildAllAssetLinks(res)
	const metadata = res.assetMetadata[asset]
	const institutions = res.assets[asset]

	if (!metadata || !institutions) {
		return null
	}

	const finalInstitutions: IDATInstitutionOverviewByAsset[] = institutions
		.map((institution) => {
			const meta = res.institutionMetadata[institution.institutionId]
			return {
				institutionId: meta.institutionId,
				ticker: meta.ticker,
				name: meta.name,
				type: meta.type,
				price: meta.price,
				priceChange24h: meta.priceChange24h,
				volume24h: meta.volume24h,
				mcapRealized: meta.mcapRealized,
				mcapRealistic: meta.mcapRealistic,
				mcapMax: meta.mcapMax,
				realized_mNAV: meta.realized_mNAV,
				realistic_mNAV: meta.realistic_mNAV,
				max_mNAV: meta.max_mNAV,
				holdings: meta.holdings[asset]
			}
		})
		.sort((a, b) => (b.holdings.usdValue ?? 0) - (a.holdings.usdValue ?? 0))

	const mNAV_realized: Record<string, Record<string, number | null | undefined>> = {}
	const mNAV_realistic: Record<string, Record<string, number | null | undefined>> = {}
	const mNAV_max: Record<string, Record<string, number | null | undefined>> = {}

	const mnavAsset = res.mNAV[asset]
	if (mnavAsset != null) {
		for (const institution in mnavAsset) {
			for (const [date, realized, realistic, max] of mnavAsset[institution]) {
				mNAV_realized[date] = mNAV_realized[date] ?? {}
				mNAV_realistic[date] = mNAV_realistic[date] ?? {}
				mNAV_max[date] = mNAV_max[date] ?? {}
				mNAV_realized[date][institution] = realized
				mNAV_realistic[date][institution] = realistic
				mNAV_max[date][institution] = max
			}
		}
	}

	const dimensions = ['timestamp', ...finalInstitutions.map((inst) => inst.ticker)]

	const buildDataset = (
		mnavByDate: Record<string, Record<string, number | null | undefined>>
	): { source: Array<Record<string, number | null>>; dimensions: string[] } => {
		const source: Array<Record<string, number | null>> = []

		for (const date in mnavByDate) {
			const row: Record<string, number | null> = { timestamp: toUnixMsTimestamp(+date) }
			for (const inst of finalInstitutions) {
				row[inst.ticker] = mnavByDate[date]?.[inst.ticker] ?? null
			}
			source.push(row)
		}

		return { source: ensureChronologicalRows(source), dimensions }
	}

	const chartColors = getNDistinctColors(finalInstitutions.length)
	return {
		institutions: finalInstitutions,
		asset,
		metadata,
		allAssets,
		dailyFlowsChart: {
			dataset: {
				source: (res.flows[asset] ?? []).map(([timestamp, net]) => ({ timestamp, [metadata.name]: net })),
				dimensions: ['timestamp', metadata.name]
			},
			charts: [
				{
					type: 'bar' as const,
					name: metadata.name,
					encode: { x: 'timestamp', y: metadata.name },
					stack: metadata.name,
					color: oldBlue
				}
			]
		},
		institutionsNames: finalInstitutions.map((inst) => inst.ticker),
		mNAVRealizedChart: {
			charts: finalInstitutions.map((inst, i) => ({
				name: inst.ticker,
				stack: inst.ticker,
				type: 'line' as const,
				color: chartColors[i],
				encode: { x: 'timestamp', y: inst.ticker }
			})),
			dataset: buildDataset(mNAV_realized)
		},
		mNAVRealisticChart: {
			charts: finalInstitutions.map((inst, i) => ({
				name: inst.ticker,
				stack: inst.ticker,
				type: 'line' as const,
				color: chartColors[i],
				encode: { x: 'timestamp', y: inst.ticker }
			})),
			dataset: buildDataset(mNAV_realistic)
		},
		mNAVMaxChart: {
			charts: finalInstitutions.map((inst, i) => ({
				name: inst.ticker,
				stack: inst.ticker,
				type: 'line' as const,
				color: chartColors[i],
				encode: { x: 'timestamp', y: inst.ticker }
			})),
			dataset: buildDataset(mNAV_max)
		}
	}
}

// ── Company detail page query ───────────────────────────────────────────

function ensureChronologicalPairs<T extends [number, ...unknown[]]>(rows: T[]): T[] {
	if (rows.length < 2) return rows

	let prev = rows[0][0]
	for (let i = 1; i < rows.length; i++) {
		const curr = rows[i][0]
		if (curr < prev) {
			return rows.toSorted((a, b) => a[0] - b[0])
		}
		prev = curr
	}

	return rows
}

export async function getDATCompanyData(company: string): Promise<IDATCompanyPageProps | null> {
	const data = await fetchDATInstitutionDetail(company)
	if (!data) return null

	const chartByAsset: IDATCompanyChartByAsset[] = []
	for (const assetKey in data.assets) {
		const assetMeta = data.assetsMeta[assetKey]
		const transactionRows = ensureChronologicalPairs(
			data.transactions
				.filter((item) => item.asset === assetKey)
				.map((item): [number, number, number | null, number | null] => [
					Math.floor(new Date(item.end_date ?? item.start_date).getTime() / 1000),
					item.type === 'sale' ? -Number(item.amount) : Number(item.amount),
					item.avg_price != null ? Number(item.avg_price) : null,
					item.usd_value != null ? Number(item.usd_value) : null
				])
		)

		let totalAmount = 0
		const seriesName = assetMeta.ticker
		const source = transactionRows.map(([timestamp, amount, avgPrice, usdValue]) => {
			totalAmount += amount
			return {
				timestamp: timestamp * 1000,
				[seriesName]: totalAmount,
				delta: amount,
				avgPrice,
				usdValue
			}
		})
		const holdingsChart = {
			dataset: {
				source,
				dimensions: ['timestamp', seriesName, 'delta', 'avgPrice', 'usdValue']
			},
			charts: [
				{
					type: (source.length < 2 ? 'bar' : 'line') as 'bar' | 'line',
					name: seriesName,
					encode: { x: 'timestamp', y: seriesName },
					stack: seriesName,
					color: CHART_COLORS[0],
					showSymbol: true,
					symbol: 'circle',
					symbolSize: 6
				}
			]
		}

		chartByAsset.push({
			asset: assetKey,
			name: assetMeta.name,
			ticker: assetMeta.ticker,
			holdingsChart
		})
	}

	const mNAVChart =
		data.stats.length > 0
			? {
					dataset: {
						source: data.stats.map((item) => ({
							timestamp: item[0],
							'Realized mNAV': item[7],
							'Realistic mNAV': item[8],
							'Max mNAV': item[9]
						})),
						dimensions: ['timestamp', 'Realized mNAV', 'Realistic mNAV', 'Max mNAV']
					},
					charts: [
						{
							type: 'line' as const,
							name: 'Realized mNAV',
							encode: { x: 'timestamp', y: 'Realized mNAV' },
							stack: 'Realized mNAV',
							color: CHART_COLORS[0]
						},
						{
							type: 'line' as const,
							name: 'Realistic mNAV',
							encode: { x: 'timestamp', y: 'Realistic mNAV' },
							stack: 'Realistic mNAV',
							color: CHART_COLORS[1]
						},
						{
							type: 'line' as const,
							name: 'Max mNAV',
							encode: { x: 'timestamp', y: 'Max mNAV' },
							stack: 'Max mNAV',
							color: CHART_COLORS[2]
						}
					]
				}
			: null

	const fdChart =
		data.stats.length > 0
			? {
					dataset: {
						source: data.stats.map((item) => ({
							timestamp: item[0],
							'FD Realized': item[1],
							'FD Realistic': item[2],
							'FD Max': item[3]
						})),
						dimensions: ['timestamp', 'FD Realized', 'FD Realistic', 'FD Max']
					},
					charts: [
						{
							type: 'line' as const,
							name: 'FD Realized',
							encode: { x: 'timestamp', y: 'FD Realized' },
							stack: 'FD Realized',
							color: CHART_COLORS[3]
						},
						{
							type: 'line' as const,
							name: 'FD Realistic',
							encode: { x: 'timestamp', y: 'FD Realistic' },
							stack: 'FD Realistic',
							color: CHART_COLORS[4]
						},
						{
							type: 'line' as const,
							name: 'FD Max',
							encode: { x: 'timestamp', y: 'FD Max' },
							stack: 'FD Max',
							color: CHART_COLORS[5]
						}
					]
				}
			: null

	const totalAssetValueChart =
		data.assetValue.length > 0
			? {
					dataset: {
						source: data.assetValue.map(([timestamp, value]) => ({
							timestamp,
							'Total Asset Value': value
						})),
						dimensions: ['timestamp', 'Total Asset Value']
					},
					charts: [
						{
							type: 'line' as const,
							name: 'Total Asset Value',
							encode: { x: 'timestamp', y: 'Total Asset Value' },
							stack: 'Total Asset Value',
							color: CHART_COLORS[6]
						}
					]
				}
			: null

	const ohlcvChartData: Array<[number, number, number, number, number, number]> | null =
		data.ohlcv.length > 0
			? data.ohlcv.map(([date, open, high, low, close, volume]) => [date, open, close, low, high, volume])
			: null

	// Compute sorted assets
	const assetEntries: Array<[string, { usdValue: number }]> = []
	for (const key in data.assets) {
		assetEntries.push([key, data.assets[key]])
	}
	assetEntries.sort((a, b) => (b[1].usdValue ?? 0) - (a[1].usdValue ?? 0))
	const sortedAssetTickers: string[] = []
	for (const [asset] of assetEntries) {
		sortedAssetTickers.push(data.assetsMeta[asset].ticker)
	}

	// Compute assets breakdown
	const assetsBreakdownData: IDATCompanyAssetBreakdown[] = []
	for (const asset in data.assets) {
		const { amount, cost, usdValue, avgPrice } = data.assets[asset]
		assetsBreakdownData.push({
			name: data.assetsMeta[asset].name,
			ticker: data.assetsMeta[asset].ticker,
			amount,
			cost: cost ?? null,
			usdValue: usdValue ?? null,
			avgPrice: avgPrice ?? null
		})
	}
	assetsBreakdownData.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))

	let firstAnnouncementDate: string | null = null
	let lastAnnouncementDate: string | null = null
	let firstAnnouncementTimestamp = Number.POSITIVE_INFINITY
	let lastAnnouncementTimestamp = Number.NEGATIVE_INFINITY

	for (const transaction of data.transactions) {
		const reportDate = transaction.report_date
		const reportTimestamp = new Date(reportDate).getTime()
		if (!Number.isFinite(reportTimestamp)) continue

		if (reportTimestamp < firstAnnouncementTimestamp) {
			firstAnnouncementTimestamp = reportTimestamp
			firstAnnouncementDate = reportDate
		}
		if (reportTimestamp > lastAnnouncementTimestamp) {
			lastAnnouncementTimestamp = reportTimestamp
			lastAnnouncementDate = reportDate
		}
	}

	return {
		name: data.name,
		ticker: data.ticker,
		transactions: data.transactions,
		price: data.price,
		priceChange24h: data.priceChange24h,
		totalCost: data.totalCost,
		totalUsdValue: data.totalUsdValue,
		firstAnnouncementDate,
		lastAnnouncementDate,
		realized_mNAV: data.stats.length > 0 ? data.stats[data.stats.length - 1][7] : null,
		realistic_mNAV: data.stats.length > 0 ? data.stats[data.stats.length - 1][8] : null,
		max_mNAV: data.stats.length > 0 ? data.stats[data.stats.length - 1][9] : null,
		assets: sortedAssetTickers,
		assetsBreakdown: assetsBreakdownData,
		chartByAsset,
		mNAVChart,
		fdChart,
		totalAssetValueChart,
		ohlcvChartData
	}
}

/**
 * Get all institution tickers for getStaticPaths.
 */
export async function getDATCompanyPaths(): Promise<string[]> {
	const data = await fetchDATInstitutions()
	const tickers = new Set<string>()
	for (const institutionId in data.institutionMetadata) {
		tickers.add(data.institutionMetadata[institutionId].ticker)
	}
	return Array.from(tickers).map((ticker) => slug(ticker))
}

/**
 * Get all asset slugs for getStaticPaths.
 */
export async function getDATAssetPaths(): Promise<string[]> {
	const data = await fetchDATInstitutions()
	const paths: string[] = []
	for (const asset in data.assetMetadata) {
		paths.push(slug(asset))
	}
	return paths
}
