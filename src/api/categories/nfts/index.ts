import {
	NFT_COLLECTION_API,
	NFT_COLLECTION_FLOOR_HISTORY_API,
	NFT_COLLECTION_SALES_API,
	NFT_COLLECTION_STATS_API,
	NFT_COLLECTIONS_API,
	NFT_COLLECTIONS_ORDERBOOK_API,
	NFT_MARKETPLACES_STATS_API,
	NFT_MARKETPLACES_VOLUME_API,
	NFT_ROYALTIES_API,
	NFT_ROYALTY_API,
	NFT_ROYALTY_HISTORY_API,
	NFT_VOLUME_API
} from '~/constants'
import { getDominancePercent, getNDistinctColors } from '~/utils'
import { fetchJson } from '~/utils/async'
import { NFT_MINT_EARNINGS } from './mintEarnings'

export const getNFTStatistics = (chart) => {
	const { totalVolume, totalVolumeUSD } = (chart.length &&
		chart.reduce((volumes, data) => {
			if (volumes.totalVolumeUSD >= 0 && volumes.totalVolume >= 0) {
				volumes.totalVolumeUSD += data.volumeUSD ?? 0
				volumes.totalVolume += data.volume ?? 0
			} else {
				volumes.totalVolumeUSD = data.volumeUSD ?? 0
				volumes.totalVolume = data.volume ?? 0
			}
			return volumes
		}, {})) || {
		totalVolume: 0,
		totalVolumeUSD: 0
	}

	const dailyVolume = chart.length ? chart[chart.length - 1]?.volume || 0 : 0
	const dailyVolumeUSD = chart.length ? chart[chart.length - 1]?.volumeUSD || 0 : 0
	const dailyChange = chart.length
		? ((dailyVolumeUSD - chart[chart.length - 2]?.volumeUSD) / chart[chart.length - 2]?.volumeUSD) * 100
		: 0

	return {
		totalVolumeUSD,
		totalVolume,
		dailyVolumeUSD,
		dailyVolume,
		dailyChange
	}
}

export const getNFTData = async () => {
	try {
		// const chart = await fetchJson(NFT_CHART_API)
		const [collections, volumes] = await Promise.all([
			fetchJson(NFT_COLLECTIONS_API, { timeout: 60_000 }),
			fetchJson(NFT_VOLUME_API, { timeout: 60_000 })
		])
		// const statistics = getNFTStatistics(chart)

		const data = collections.map((colleciton) => {
			const volume = volumes.find((cx) => cx.collection === colleciton.collectionId)

			return {
				...colleciton,
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
			statistics: {}
		}
	}
}

const formatNftVolume = (volume, column) => {
	const sumByDay = {}
	const chartStacks = {}
	const volumeData = volume.reduce(
		(acc, curr) => {
			const date = Math.floor(Number(curr.date) / 1000)
			if (!acc[date]) {
				acc[date] = {}
			}

			chartStacks[curr.exchangeName] = 'stackA'

			sumByDay[date] = (sumByDay[date] || 0) + curr[column]

			acc[date][curr.exchangeName] = Number(curr[column]?.toFixed(3))

			return acc
		},
		{} as {
			[date: string]: { [exchangeName: string]: number }
		}
	)

	const dominance = []
	for (const date in volumeData) {
		const value = { date: Math.floor(Number(date)) }
		for (const exchangeName in volumeData[date]) {
			value[exchangeName] = getDominancePercent(volumeData[date][exchangeName], sumByDay[date])
		}
		dominance.push(value)
	}

	return [volumeData, dominance, chartStacks]
}

export const getNFTMarketplacesData = async () => {
	const [data, volume] = await Promise.all([
		fetchJson(NFT_MARKETPLACES_STATS_API).catch(() => {
			console.log(`[HTTP] [ERROR] ${NFT_MARKETPLACES_STATS_API}`)
			return []
		}),
		fetchJson(NFT_MARKETPLACES_VOLUME_API).catch(() => {
			console.log(`[HTTP] [ERROR] ${NFT_MARKETPLACES_VOLUME_API}`)
			return []
		})
	])

	const volumeSorted = volume.map((v) => ({ ...v, date: new Date(v.day).getTime() })).sort((a, b) => a.date - b.date)

	const [volumeData, dominance, volumeChartStacks] = formatNftVolume(volumeSorted, 'sum')
	const [tradeData, dominanceTrade, tradeChartStacks] = formatNftVolume(volumeSorted, 'count')

	const marketplaces = Object.keys(volumeChartStacks)
	const colors = {}
	const allColors = getNDistinctColors(marketplaces.length)
	for (let i = 0; i < marketplaces.length; i++) {
		colors[marketplaces[i]] = allColors[i]
	}
	colors['Others'] = '#AAAAAA'

	return {
		data,
		volume: Object.entries(volumeData).map(([date, values]: [string, { [exchangeName: string]: number }]) => ({
			date,
			...values
		})),
		dominance,
		trades: Object.entries(tradeData).map(([date, values]: [string, { [exchangeName: string]: number }]) => ({
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
			fetchJson(
				'https://raw.githubusercontent.com/DefiLlama/defillama-server/master/defi/src/nfts/output/parentCompanies.json'
			),
			fetchJson(NFT_ROYALTIES_API),
			fetchJson(NFT_COLLECTIONS_API, { timeout: 60_000 })
		])

		const collectionEarnings = collections
			.map((c) => {
				const royalty = royalties.find((r) => `0x${r.collection}` === c.collectionId)
				const mintEarnings = NFT_MINT_EARNINGS.find((r) => r.contractAddress === c.collectionId)

				if (!royalty && !mintEarnings) return {}

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
					totalMintEarnings: mintEarnings?.usdSales ?? null,
					totalEarnings: (royalty?.usdLifetime ?? 0) + (mintEarnings?.usdSales ?? 0)
				}
			})
			.filter((c) => c.defillamaId)

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

			subCollectionEarnings.forEach((c) => {
				total24h += c.total24h ?? 0
				total7d += c.total7d ?? 0
				total30d += c.total30d ?? 0
				totalRoyaltyEarnings += c.totalRoyaltyEarnings ?? 0
				totalMintEarnings += c.totalMintEarnings ?? 0
				totalEarnings += c.totalEarnings ?? 0
			})

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
		let [royaltyChart, collection, royalty] = await Promise.all([
			fetchJson(`${NFT_ROYALTY_HISTORY_API}/${slug}`),
			fetchJson(`${NFT_COLLECTION_API}/${slug}`),
			fetchJson(`${NFT_ROYALTY_API}/${slug}`)
		])

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
				totalDataChart: royaltyChart,
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

const flagOutliers = (sales) => {
	const values = sales.map((s) => s[1])
	const mean = values.reduce((acc, val) => acc + val, 0) / values.length
	const std = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (values.length - 1))
	// zscores
	const scores = values.map((s) => Math.abs((s - mean) / std))
	// sigma threshold
	return sales.map((s, i) => [...s, scores[i] >= 4])
}

const median = (sales) => {
	const middle = Math.floor(sales.length / 2)

	if (sales.length % 2 === 0) {
		return (sales[middle - 1] + sales[middle]) / 2
	}
	return sales[middle]
}

export const getNFTCollection = async (slug: string) => {
	try {
		let [data, sales, stats, floorHistory, orderbook] = await Promise.all([
			fetchJson(`${NFT_COLLECTION_API}/${slug}`),
			fetchJson(`${NFT_COLLECTION_SALES_API}?collectionId=${slug}`).then((data) =>
				data && Array.isArray(data) ? data.map((i) => [i[0] * 1000, i[1]]) : []
			),
			fetchJson(`${NFT_COLLECTION_STATS_API}/${slug}`),
			fetchJson(`${NFT_COLLECTION_FLOOR_HISTORY_API}/${slug}`),
			fetchJson(`${NFT_COLLECTIONS_ORDERBOOK_API}/${slug}`)
		])

		const salesExOutliers = flagOutliers(sales).filter((i) => i[2] === false)

		// sort on timestamp
		const X = salesExOutliers.sort((a, b) => a[0] - b[0])

		// calc 1d-rolling median at the end of every x-hours
		const x = 6
		const u = 3600 * x * 1000

		const hourlyT = []
		if (X.length) {
			// round up
			const start = Math.ceil(X[0][0] / u) * u
			const stop = Math.ceil(X[X.length - 1][0] / u) * u
			// create hourly timestamps
			for (let timestamp = start; timestamp <= stop; timestamp += u) {
				hourlyT.push(timestamp)
			}
		}

		// calc median
		// 24h or 7days rolling median depending on nb of datapoints
		const medianWindow = X.length > 300 ? 24 : 24 * 7
		const salesMedian1d = hourlyT.map((hour) => {
			// daily offset
			const offset = hour - 3600 * 1000 * medianWindow
			const valuesInRange = X.reduce((acc, [timestamp, value]) => {
				if (timestamp >= offset && timestamp <= hour) {
					acc.push(value)
				}
				return acc
			}, []).sort((a, b) => a - b) // sort values, required for median
			const medianValue = median(valuesInRange)
			return [hour, medianValue]
		})

		return {
			data,
			sales,
			salesExOutliers,
			salesMedian1d,
			stats: stats.map((item) => [Math.floor(new Date(item.day).getTime() / 1000), item.sum]),
			name: data?.[0]?.name ?? null,
			address: slug,
			floorHistory: floorHistory.map((item) => [
				Math.floor(new Date(item.timestamp).getTime() / 1000),
				item.floorPrice
			]),
			orderbook
		}
	} catch (e) {
		console.log(e)
	}
}
