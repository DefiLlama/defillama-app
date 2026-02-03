import { ILineAndBarChartProps, IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { TRADFI_API } from '~/constants'
import { oldBlue } from '~/constants/colors'
import { getDominancePercent, getNDistinctColors } from '~/utils'
import { fetchJson } from '~/utils/async'

export interface IDATInstitutions {
	institutionMetadata: {
		[institutionId: number]: {
			institutionId: number
			ticker: string
			name: string
			type: string
			price: number
			priceChange24h: number | null
			volume24h: number
			mcapRealized: number | null
			mcapRealistic: number | null
			mcapMax: number | null
			realized_mNAV: number | null
			realistic_mNAV: number | null
			max_mNAV: number | null
			totalUsdValue: number
			totalCost: number
			holdings: {
				[asset: string]: {
					amount: number
					avgPrice: number
					usdValue: number
					cost: number
					transactionCount: number
					firstAnnouncementDate: string
					lastAnnouncementDate: string
					supplyPercentage: number
				}
			}
		}
	}
	assetMetadata: {
		[asset: string]: {
			name: string
			ticker: string
			geckoId: string
			companies: number
			totalAmount: number
			totalUsdValue: number
			circSupplyPerc: number
		}
	}
	institutions: Array<{ institutionId: number; totalUsdValue: number; totalCost: number }>
	assets: {
		[asset: string]: Array<{ institutionId: number; usdValue: number; amount: number }>
	}
	totalCompanies: number
	flows: {
		[asset: string]: Array<[number, number, number, number, number, number]> // [timestamp, net, inflow, outflow, purchasePrice, usdValueOfPurchase]
	}
	mNAV: {
		[asset: string]: {
			[company: string]: Array<[number, number, number, number]> // [timestamp, mNAV_realized, mNAV_realistic, mNAV_max]
		}
	}
}

interface IInstitutionOverview extends Omit<IDATInstitutions['institutionMetadata'][number], 'holdings'> {
	realized_mNAV: number | null
	realistic_mNAV: number | null
	max_mNAV: number | null
	holdings: Array<{
		name: string
		ticker: string
		amount: number
		cost: number | null
		usdValue: number | null
		avgPrice: number | null
		dominance: number
		color: string
	}>
}

export interface IDATOverviewPageProps {
	allAssets: Array<{ label: string; to: string }>
	institutions: Array<IInstitutionOverview>
	dailyFlowsByAsset: Record<
		string,
		{
			name: string
			stack: string
			type: string
			color: string
			data: Array<[number, number, number]>
		}
	>
}

const breakdownColor = (type) => {
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

export async function getDATOverviewData(): Promise<IDATOverviewPageProps> {
	const res: IDATInstitutions = await fetchJson(`${TRADFI_API}/institutions`)

	// Build array with cached values to avoid lookups during sort
	const assetEntries: [string, number][] = []
	for (const key in res.assetMetadata) {
		assetEntries.push([key, res.assetMetadata[key].totalUsdValue ?? 0])
	}
	assetEntries.sort((a, b) => b[1] - a[1])
	const allAssets: string[] = []
	for (const [key] of assetEntries) {
		allAssets.push(key)
	}
	const colorByAsset: Record<string, string> = {}
	let i = 0
	const colors = getNDistinctColors(allAssets.length + 7).filter((color) => color !== '#673AB7')
	for (const asset in res.assetMetadata) {
		const color = breakdownColor(res.assetMetadata[asset].name)
		if (color) {
			colorByAsset[asset] = color
		} else {
			colorByAsset[asset] = colors[i + 6]
		}
		i++
	}

	const inflowsByAssetByDate: Record<string, Record<string, [number, number]>> = {}
	const dailyFlowsByAsset = {}
	for (const asset in res.flows) {
		const name = res.assetMetadata[asset]?.name ?? asset
		dailyFlowsByAsset[asset] = {
			name: name,
			stack: 'asset',
			type: 'bar',
			color: colorByAsset[asset],
			data: []
		}
		for (const [date, net, _inflow, _outflow, purchasePrice, usdValueOfPurchase] of res.flows[asset]) {
			inflowsByAssetByDate[date] = inflowsByAssetByDate[date] ?? {}
			inflowsByAssetByDate[date][asset] = [purchasePrice || usdValueOfPurchase || 0, net]
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
		dailyFlowsByAsset[asset].data.sort((a, b) => a[0] - b[0])
	}

	return {
		allAssets: [
			{ label: 'All', to: '/digital-asset-treasuries' },
			...allAssets.map((asset) => ({ label: res.assetMetadata[asset].name, to: `/digital-asset-treasuries/${asset}` }))
		],
		institutions: res.institutions.map((institution) => {
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
			} as IInstitutionOverview
		}),
		dailyFlowsByAsset
	}
}

interface IInstitutionOverviewByAsset extends Omit<
	IDATInstitutions['institutionMetadata'][number],
	'holdings' | 'totalUsdValue' | 'totalCost'
> {
	realized_mNAV: number | null
	realistic_mNAV: number | null
	max_mNAV: number | null
	holdings: IDATInstitutions['institutionMetadata'][number]['holdings'][string]
}

export interface IDATOverviewDataByAssetProps {
	institutions: IInstitutionOverviewByAsset[]
	asset: string
	metadata: IDATInstitutions['assetMetadata'][string]
	allAssets: Array<{ label: string; to: string }>
	dailyFlowsChart: ILineAndBarChartProps['charts']
	mNAVRealizedChart: {
		charts: IMultiSeriesChart2Props['charts']
		dataset: {
			source: Array<Record<string, number | null>>
			dimensions: string[]
		}
	}
	mNAVRealisticChart: {
		charts: IMultiSeriesChart2Props['charts']
		dataset: {
			source: Array<Record<string, number | null>>
			dimensions: string[]
		}
	}
	mNAVMaxChart: {
		charts: IMultiSeriesChart2Props['charts']
		dataset: {
			source: Array<Record<string, number | null>>
			dimensions: string[]
		}
	}
	institutionsNames: string[]
}

function toUnixMsTimestamp(ts: number): number {
	return Number.isFinite(ts) && ts > 0 && ts < 1e12 ? ts * 1e3 : ts
}

export async function getDATOverviewDataByAsset(asset: string): Promise<IDATOverviewDataByAssetProps | null> {
	const res: IDATInstitutions = await fetchJson(`${TRADFI_API}/institutions`)
	// Build array with cached values to avoid lookups during sort
	const assetEntries: [string, number][] = []
	for (const key in res.assetMetadata) {
		assetEntries.push([key, res.assetMetadata[key].totalUsdValue ?? 0])
	}
	assetEntries.sort((a, b) => b[1] - a[1])
	const allAssets: string[] = []
	for (const [key] of assetEntries) {
		allAssets.push(key)
	}
	const metadata = res.assetMetadata[asset]
	const institutions = res.assets[asset]

	if (!metadata || !institutions) {
		return null
	}

	const finalInstitutions = institutions
		.map((institution) => {
			const metadata = res.institutionMetadata[institution.institutionId]
			return {
				institutionId: metadata.institutionId,
				ticker: metadata.ticker,
				name: metadata.name,
				type: metadata.type,
				price: metadata.price,
				priceChange24h: metadata.priceChange24h,
				volume24h: metadata.volume24h,
				realized_mNAV: metadata.realized_mNAV,
				realistic_mNAV: metadata.realistic_mNAV,
				max_mNAV: metadata.max_mNAV,
				holdings: metadata.holdings[asset]
			} as IInstitutionOverviewByAsset
		})
		.sort((a, b) => (b.holdings.usdValue ?? 0) - (a.holdings.usdValue ?? 0))

	const mNAV_realized = {}
	const mNAV_realistic = {}
	const mNAV_max = {}

	for (const institution in res.mNAV[asset]) {
		for (const [date, realized, realistic, max] of res.mNAV[asset][institution]) {
			mNAV_realized[date] = mNAV_realized[date] ?? {}
			mNAV_realistic[date] = mNAV_realistic[date] ?? {}
			mNAV_max[date] = mNAV_max[date] ?? {}
			mNAV_realized[date][institution] = realized
			mNAV_realistic[date][institution] = realistic
			mNAV_max[date][institution] = max
		}
	}
	const dimensions = ['timestamp', ...finalInstitutions.map((inst) => inst.ticker)]

	const buildDataset = (mnavByDate: Record<string, Record<string, number | null | undefined>>) => {
		const source: Array<Record<string, number | null>> = []

		for (const date in mnavByDate) {
			const row: Record<string, number | null> = { timestamp: toUnixMsTimestamp(+date) } as any
			for (const inst of finalInstitutions) {
				row[inst.ticker] = (mnavByDate[date] as any)?.[inst.ticker] ?? null
			}
			source.push(row)
		}

		source.sort((a: any, b: any) => (a.timestamp as number) - (b.timestamp as number))
		return { source, dimensions }
	}

	const chartColors = getNDistinctColors(finalInstitutions.length)
	return {
		institutions: finalInstitutions,
		asset,
		metadata,
		allAssets: [
			{ label: 'All', to: '/digital-asset-treasuries' },
			...allAssets.map((asset) => ({
				label: res.assetMetadata[asset].name,
				to: `/digital-asset-treasuries/${asset}`
			}))
		],
		dailyFlowsChart: {
			[metadata.name]: {
				name: metadata.name,
				stack: metadata.name,
				type: 'bar',
				color: oldBlue,
				data: res.flows[asset] as any
			}
		},
		institutionsNames: finalInstitutions.map((inst) => inst.ticker),
		mNAVRealizedChart: {
			charts: finalInstitutions.map((inst, i) => {
				return {
					name: inst.ticker,
					stack: inst.ticker,
					type: 'line',
					color: chartColors[i],
					encode: {
						x: 'timestamp',
						y: inst.ticker
					}
				}
			}),
			dataset: buildDataset(mNAV_realized)
		},
		mNAVRealisticChart: {
			charts: finalInstitutions.map((inst, i) => {
				return {
					name: inst.ticker,
					stack: inst.ticker,
					type: 'line',
					color: chartColors[i],
					encode: {
						x: 'timestamp',
						y: inst.ticker
					}
				}
			}),
			dataset: buildDataset(mNAV_realistic)
		},
		mNAVMaxChart: {
			charts: finalInstitutions.map((inst, i) => {
				return {
					name: inst.ticker,
					stack: inst.ticker,
					type: 'line',
					color: chartColors[i],
					encode: {
						x: 'timestamp',
						y: inst.ticker
					}
				}
			}),
			dataset: buildDataset(mNAV_max)
		}
	}
}
