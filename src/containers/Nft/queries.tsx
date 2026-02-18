import { formatBarChart } from '~/components/ECharts/utils'
import { CHART_COLORS } from '~/constants/colors'
import { getDominancePercent, getNDistinctColors } from '~/utils'
import {
	fetchNftCollection,
	fetchNftCollectionFloorHistory,
	fetchNftCollectionOrderbook,
	fetchNftCollectionSales,
	fetchNftCollectionStats,
	fetchNftCollections,
	fetchNftMarketplaceStats,
	fetchNftMarketplaceVolumes,
	fetchNftRoyalties,
	fetchNftRoyalty,
	fetchNftRoyaltyHistory,
	fetchNftVolumes,
	fetchParentCompanies
} from './api'
import type { RawNftCollection } from './api.types'
import { NFT_MINT_EARNINGS } from './mintEarnings'

type VolumeChartEntry = {
	volumeUSD?: number
	volume?: number
}

// oxlint-disable-next-line no-unused-vars
const getNFTStatistics = (chart: VolumeChartEntry[]) => {
	const { totalVolume, totalVolumeUSD } = (chart.length > 0
		? chart.reduce(
				(volumes, data) => {
					volumes.totalVolumeUSD += data.volumeUSD ?? 0
					volumes.totalVolume += data.volume ?? 0
					return volumes
				},
				{ totalVolumeUSD: 0, totalVolume: 0 }
			)
		: null) ?? {
		totalVolume: 0,
		totalVolumeUSD: 0
	}

	const dailyVolume = chart.length > 0 ? (chart[chart.length - 1]?.volume ?? 0) : 0
	const dailyVolumeUSD = chart.length > 0 ? (chart[chart.length - 1]?.volumeUSD ?? 0) : 0
	const prevDayVolumeUSD = chart.length > 1 ? (chart[chart.length - 2]?.volumeUSD ?? 0) : 0
	const dailyChange = prevDayVolumeUSD !== 0 ? ((dailyVolumeUSD - prevDayVolumeUSD) / prevDayVolumeUSD) * 100 : 0

	return {
		totalVolumeUSD,
		totalVolume,
		dailyVolumeUSD,
		dailyVolume,
		dailyChange
	}
}

type NftDataResult = {
	chart: VolumeChartEntry[]
	collections: ExtendedNftCollection[]
	statistics: unknown[]
}

type ExtendedNftCollection = RawNftCollection & {
	volume1d: number
	volume7d: number
	volume30d: number
	sales1d: number
}

export const getNFTData = async (): Promise<NftDataResult> => {
	try {
		const [collections, volumes] = await Promise.all([fetchNftCollections(), fetchNftVolumes()])
		const volumeByCollection = new Map(volumes.map((volume) => [volume.collection, volume] as const))

		const data = collections.map((collection) => {
			const volume = volumeByCollection.get(collection.collectionId)

			return {
				...collection,
				volume1d: Number((volume?.['1DayVolume'] ?? 0).toFixed(2)),
				volume7d: Number((volume?.['7DayVolume'] ?? 0).toFixed(2)),
				volume30d: Number((volume?.['30DayVolume'] ?? 0).toFixed(2)),
				sales1d: Number((volume?.['1DaySales'] ?? 0).toFixed(2))
			}
		})

		return {
			chart: [],
			collections: data,
			statistics: []
		}
	} catch (e) {
		console.log(e)
		return {
			chart: [],
			collections: [],
			statistics: []
		}
	}
}

type NftVolumeRow = Record<string, number>

const formatNftVolume = (
	volume: Array<{ date: number; exchangeName: string; sum: number; count: number }>,
	column: 'sum' | 'count'
): [Record<string, NftVolumeRow>, Array<Record<string, number>>, Record<string, string>] => {
	const sumByDay: Record<string, number> = {}
	const chartStacks: Record<string, string> = {}
	const volumeData: Record<string, NftVolumeRow> = {}

	for (const curr of volume) {
		const date = Math.floor(Number(curr.date) / 1000)
		if (!volumeData[date]) {
			volumeData[date] = {}
		}

		chartStacks[curr.exchangeName] = 'stackA'
		sumByDay[date] = (sumByDay[date] ?? 0) + curr[column]
		volumeData[date][curr.exchangeName] = Number(curr[column]?.toFixed(3))
	}

	const dominance: Array<Record<string, number>> = []
	for (const [date, exchanges] of Object.entries(volumeData)) {
		const value: Record<string, number> = { date: Math.floor(Number(date)) }
		for (const [exchangeName, exchangeValue] of Object.entries(exchanges)) {
			value[exchangeName] = getDominancePercent(exchangeValue, sumByDay[date])
		}
		dominance.push(value)
	}

	return [volumeData, dominance, chartStacks]
}

export const getNFTMarketplacesData = async () => {
	const [data, volume] = await Promise.all([
		fetchNftMarketplaceStats().catch(() => {
			return []
		}),
		fetchNftMarketplaceVolumes().catch(() => {
			return []
		})
	])

	const volumeSorted = volume.map((v) => ({ ...v, date: new Date(v.day).getTime() })).sort((a, b) => a.date - b.date)

	const [volumeData, dominance, volumeChartStacks] = formatNftVolume(volumeSorted, 'sum')
	const [tradeData, dominanceTrade, tradeChartStacks] = formatNftVolume(volumeSorted, 'count')

	const marketplaces: string[] = []
	for (const marketplace in volumeChartStacks) {
		marketplaces.push(marketplace)
	}
	const colors: Record<string, string> = {}
	const allColors = getNDistinctColors(marketplaces.length)
	for (let i = 0; i < marketplaces.length; i++) {
		colors[marketplaces[i]] = allColors[i]
	}
	colors['Others'] = '#AAAAAA'

	return {
		data,
		volume: Object.entries(volumeData)
			.sort(([a], [b]) => Number(a) - Number(b))
			.map(([date, values]) => ({
				date,
				...values
			})),
		dominance,
		trades: Object.entries(tradeData)
			.sort(([a], [b]) => Number(a) - Number(b))
			.map(([date, values]) => ({
				date,
				...values
			})),
		dominanceTrade,
		marketplaces,
		stackColors: colors,
		volumeChartStacks,
		tradeChartStacks
	}
}

export const getNFTCollectionEarnings = async () => {
	try {
		const [parentCompanies, royalties, collections] = await Promise.all([
			fetchParentCompanies(),
			fetchNftRoyalties(),
			fetchNftCollections()
		])

		const collectionEarnings = collections
			.map((c) => {
				const royalty = royalties.find((r) => `0x${r.collection}` === c.collectionId)
				const mintEarnings = NFT_MINT_EARNINGS.find((r) => r.contractAddress === c.collectionId)

				if (!royalty && !mintEarnings) return null

				return {
					defillamaId: c.collectionId,
					name: c.name,
					displayName: c.name,
					logo: c.image,
					chains: ['Ethereum'],
					total24h: royalty?.usd1D ?? null,
					total7d: royalty?.usd7D ?? null,
					total30d: royalty?.usd30D ?? null,
					totalRoyaltyEarnings: royalty?.usdLifetime ?? null,
					totalMintEarnings: mintEarnings != null ? Number(mintEarnings.usdSales) || null : null,
					totalEarnings: (royalty?.usdLifetime ?? 0) + (mintEarnings != null ? Number(mintEarnings.usdSales) || 0 : 0)
				}
			})
			.filter((c): c is NonNullable<typeof c> => c != null)

		const duplicateCollections = new Set<string>()

		const parentEarnings = parentCompanies.map((parent) => {
			const subCollections = parent.nftCollections.map((x) => {
				const address = x[0].toLowerCase()
				duplicateCollections.add(address)
				return address
			})

			const subCollectionEarnings = collectionEarnings.filter((c) => subCollections.includes(c.defillamaId))

			let total24h = 0
			let total7d = 0
			let total30d = 0
			let totalRoyaltyEarnings = 0
			let totalMintEarnings = 0
			let totalEarnings = 0

			for (const c of subCollectionEarnings) {
				total24h += c.total24h ?? 0
				total7d += c.total7d ?? 0
				total30d += c.total30d ?? 0
				totalRoyaltyEarnings += c.totalRoyaltyEarnings ?? 0
				totalMintEarnings += c.totalMintEarnings ?? 0
				totalEarnings += c.totalEarnings ?? 0
			}

			return {
				defillamaId: subCollections.join('+'),
				name: parent.name,
				displayName: parent.name,
				chains: ['Ethereum'],
				total24h,
				total7d,
				total30d,
				totalRoyaltyEarnings,
				totalMintEarnings,
				totalEarnings,
				subRows: subCollectionEarnings
			}
		})

		return {
			earnings: [...parentEarnings, ...collectionEarnings.filter((c) => !duplicateCollections.has(c.defillamaId))].sort(
				(a, b) => b.totalEarnings - a.totalEarnings
			)
		}
	} catch (err) {
		console.log(err)
		return {
			earnings: []
		}
	}
}

export const getNFTRoyaltyHistory = async (slug: string) => {
	try {
		const [royaltyChart, collection, royalty] = await Promise.all([
			fetchNftRoyaltyHistory(slug),
			fetchNftCollection(slug),
			fetchNftRoyalty(slug)
		])
		if (!Array.isArray(collection) || collection.length === 0 || !Array.isArray(royalty) || royalty.length === 0) {
			return {
				royaltyHistory: []
			}
		}

		const safeChart: Array<[number, number]> = Array.isArray(royaltyChart) ? royaltyChart : []
		const formattedData = formatBarChart({
			data: safeChart,
			groupBy: 'daily',
			denominationPriceHistory: null,
			dateInMs: false
		})
		const earningsChart = {
			dataset: {
				source: formattedData.map(([timestamp, value]) => ({ timestamp, Earnings: value ?? 0 })),
				dimensions: ['timestamp', 'Earnings']
			},
			charts: [
				{
					type: 'bar' as const,
					name: 'Earnings',
					encode: { x: 'timestamp', y: 'Earnings' },
					color: CHART_COLORS[0],
					stack: 'Earnings'
				}
			]
		}

		const data = [
			{
				defillamaId: slug,
				name: collection[0].name,
				displayName: collection[0].name,
				logo: `https://nft-icons.llamao.fi/icons/nfts/${slug}?w=48&h=48`,
				fallbackLogo: collection[0].image,
				address: slug,
				url: collection[0].projectUrl,
				twitter: collection[0].twitterUsername,
				category: 'Nft',
				totalDataChart: safeChart,
				earningsChart,
				total24h: royalty[0].usd1D,
				total7d: royalty[0].usd7D,
				total30d: royalty[0].usd30D,
				totalAllTime: royalty[0].usdLifetime
			}
		]

		return {
			royaltyHistory: data
		}
	} catch (err) {
		console.log(err)
		return {
			royaltyHistory: []
		}
	}
}

const flagOutliers = (sales: Array<[number, number]>): Array<[number, number, boolean]> => {
	if (sales.length < 2) return sales.map((sale) => [sale[0], sale[1], false] as [number, number, boolean])

	const values = sales.map((s) => s[1])
	const mean = values.reduce((acc, val) => acc + val, 0) / values.length
	const std = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (values.length - 1))
	if (!Number.isFinite(std) || std === 0) {
		return sales.map((sale) => [sale[0], sale[1], false] as [number, number, boolean])
	}

	const scores = values.map((s) => Math.abs((s - mean) / std))
	return sales.map((s, i) => [s[0], s[1], scores[i] >= 4] as [number, number, boolean])
}

const median = (sales: number[]): number => {
	if (sales.length === 0) return 0

	const middle = Math.floor(sales.length / 2)

	if (sales.length % 2 === 0) {
		return (sales[middle - 1] + sales[middle]) / 2
	}
	return sales[middle]
}

export const getNFTCollection = async (slug: string) => {
	try {
		const [data, sales, stats, floorHistory, orderbook] = await Promise.all([
			fetchNftCollection(slug),
			fetchNftCollectionSales(slug),
			fetchNftCollectionStats(slug),
			fetchNftCollectionFloorHistory(slug),
			fetchNftCollectionOrderbook(slug)
		])

		const salesExOutliers = flagOutliers(sales).filter((i) => i[2] === false)

		// sort on timestamp
		const X = salesExOutliers.sort((a, b) => a[0] - b[0])

		// calc 1d-rolling median at the end of every x-hours
		const x = 6
		const u = 3600 * x * 1000

		const hourlyT: number[] = []
		if (X.length > 0) {
			const start = Math.ceil(X[0][0] / u) * u
			const stop = Math.ceil(X[X.length - 1][0] / u) * u
			for (let timestamp = start; timestamp <= stop; timestamp += u) {
				hourlyT.push(timestamp)
			}
		}

		// calc median - 24h or 7days rolling median depending on nb of datapoints
		const medianWindow = X.length > 300 ? 24 : 24 * 7
		const salesMedian1d: Array<[number, number]> = hourlyT.map((hour) => {
			const offset = hour - 3600 * 1000 * medianWindow
			const valuesInRange = X.reduce<number[]>((acc, [timestamp, value]) => {
				if (timestamp >= offset && timestamp <= hour) {
					acc.push(value)
				}
				return acc
			}, []).sort((a, b) => a - b)
			const medianValue = median(valuesInRange)
			return [hour, medianValue]
		})

		return {
			data,
			sales,
			salesExOutliers: salesExOutliers.map((s) => [s[0], s[1]] as [number, number]),
			salesMedian1d,
			stats: stats.map((item) => [Math.floor(new Date(item.day).getTime() / 1000), item.sum] as [number, number]),
			name: data?.[0]?.name ?? null,
			address: slug,
			floorHistory: {
				source: floorHistory.map((item) => ({
					timestamp: Math.floor(new Date(item.timestamp).getTime()),
					'Floor Price': item.floorPrice
				})),
				dimensions: ['timestamp', 'Floor Price']
			},
			orderbook
		}
	} catch (e) {
		console.log(e)
		return undefined
	}
}
