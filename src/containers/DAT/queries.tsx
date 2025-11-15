import { TRADFI_API } from '~/constants'
import { getDominancePercent, getNDistinctColors } from '~/utils'
import { fetchJson } from '~/utils/async'

interface IInstitutions {
	institutionMetadata: {
		[id: string]: {
			institutionId: number
			ticker: string
			name: string
			type: string
			price: number
			priceChange24h: number | null
			volume24h: number
			mcapRealized: number
			mcapRealistic: number
			mcapMax: number
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
	assets: Array<{ institutionId: number; usdValue: number; amount: number }>
	totalCompanies: number
	flows: Array<[number, number, number, number]> // [timestamp, net, inflow, outflow]
	mNAV: {
		[asset: string]: {
			[company: string]: Array<[number, number, number, number]> // [timestamp, mNAV_realized, mNAV_realistic, mNAV_max]
		}
	}
}

interface IInstitutionOverview extends Omit<IInstitutions['institutionMetadata'][number], 'holdings'> {
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
	const res2: IInstitutions = await fetchJson(`${TRADFI_API}/institutions`)

	const allAssets = [{ label: 'All', to: '/digital-asset-treasuries' }]
	const colorByAsset = {}
	let i = 0
	const colors = getNDistinctColors(Object.keys(res2.assetMetadata).length + 7).filter((color) => color !== '#673AB7')
	for (const asset in res2.assetMetadata) {
		allAssets.push({ label: res2.assetMetadata[asset].name, to: `/digital-asset-treasuries/${asset}` })
		const color = breakdownColor(res2.assetMetadata[asset].name)
		if (color) {
			colorByAsset[asset] = color
		} else {
			colorByAsset[asset] = colors[i + 6]
		}
		i++
	}

	const inflowsByAssetByDate: Record<string, Record<string, [number, number]>> = {}
	const dailyFlowsByAsset = {}
	// for (const asset in res2.flows) {
	// 	const name = res2.assetMetadata[asset]?.name ?? asset
	// 	dailyFlowsByAsset[asset] = {
	// 		name: name,
	// 		stack: 'asset',
	// 		type: 'bar',
	// 		color: colorByAsset[asset],
	// 		data: []
	// 	}
	// 	for (let i = 0; i < res2.flows[asset].length; i++) {
	// 		const [date, value, purchasePrice, usdValueOfPurchase] = res2.flows[asset][i]
	// 		inflowsByAssetByDate[date] = inflowsByAssetByDate[date] ?? {}
	// 		inflowsByAssetByDate[date][asset] = [purchasePrice || usdValueOfPurchase || 0, value]
	// 	}
	// }

	// for (const date in inflowsByAssetByDate) {
	// 	for (const asset in res.dailyFlows) {
	// 		dailyFlowsByAsset[asset].data.push([
	// 			+date,
	// 			inflowsByAssetByDate[date][asset]?.[0] ?? null,
	// 			inflowsByAssetByDate[date][asset]?.[1] ?? null
	// 		])
	// 	}
	// }

	// Sort data by date for each asset to ensure correct cumulative calculations
	for (const asset in dailyFlowsByAsset) {
		dailyFlowsByAsset[asset].data.sort((a, b) => a[0] - b[0])
	}

	return {
		allAssets,
		institutions: res2.institutions.map((institution) => {
			const metadata = res2.institutionMetadata[institution.institutionId]
			return {
				...metadata,
				holdings: Object.entries(metadata.holdings)
					.map(([asset, holding]) => ({
						name: res2.assetMetadata[asset].name,
						ticker: res2.assetMetadata[asset].ticker,
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
