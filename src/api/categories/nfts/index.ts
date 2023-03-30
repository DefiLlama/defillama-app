import useSWR from 'swr'
import { useDebounce } from '~/hooks'
import { fetcher } from '~/utils/useSWR'
import {
	NFT_CHAINS_API,
	NFT_CHART_API,
	NFT_COLLECTIONS_API,
	NFT_VOLUME_API,
	NFT_COLLECTION_API,
	NFT_MARKETPLACES_API,
	NFT_SEARCH_API,
	NFT_COLLECTION_SALES_API,
	NFT_COLLECTION_STATS_API,
	NFT_COLLECTION_FLOOR_HISTORY_API
} from '~/constants'

interface IResponseNFTSearchAPI {
	hits: Array<{
		_id: string
		_index: string
		_score: number
		_source: {
			logo: string
			name: string
			slug: string
			symbol: string
		}
		_type: string
	}>
	max_score: number
	total: {
		relation: string
		value: number
	}
	data: null
}

interface ICollectionApiResponse {
	data: {
		logo: string
		name: string
		slug: string
	}[]
	hits: null
}

type ApiResponse = IResponseNFTSearchAPI | ICollectionApiResponse

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
		// const chart = await fetch(NFT_CHART_API).then((r) => r.json())
		const [collections, volumes] = await Promise.all([
			fetch(NFT_COLLECTIONS_API).then((r) => r.json()),
			fetch(NFT_VOLUME_API).then((r) => r.json())
		])
		// const statistics = getNFTStatistics(chart)

		const data = collections.map((colleciton) => {
			const volume = volumes.find((cx) => cx.collection === colleciton.collectionId)

			return {
				...colleciton,
				volume1d: Number((volume?.['1DayVolume'] ?? 0).toFixed(2)),
				volume7d: Number((volume?.['7DayVolume'] ?? 0).toFixed(2)),
				volume30d: Number((volume?.['30DayVolume'] ?? 0).toFixed(2))
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

export const getNFTCollections = async () => {
	try {
		const { data: collections } = await fetch(NFT_COLLECTIONS_API).then((r) => r.json())
		return collections
	} catch (e) {
		console.log(e)
	}
}

export const getNFTCollectionsByChain = async (chain: string) => {
	try {
		const { data: collections } = await fetch(`${NFT_COLLECTIONS_API}/chain/${chain}`).then((r) => r.json())
		return collections
	} catch (e) {
		console.log(e)
	}
}

export const getNFTCollectionsByMarketplace = async (marketplace: string) => {
	try {
		const { data: collections } = await fetch(`${NFT_COLLECTIONS_API}/marketplace/${marketplace}`).then((r) => r.json())
		return collections
	} catch (e) {
		console.log(e)
	}
}

export const getNFTCollection = async (slug: string) => {
	try {
		const [data, sales, stats, floorHistory] = await Promise.all([
			fetch(`${NFT_COLLECTION_API}/${slug}`).then((r) => r.json()),
			fetch(`${NFT_COLLECTION_SALES_API}/${slug}`).then((r) => r.json()),
			fetch(`${NFT_COLLECTION_STATS_API}/${slug}`).then((r) => r.json()),
			fetch(`${NFT_COLLECTION_FLOOR_HISTORY_API}/${slug}`).then((r) => r.json())
		])

		return {
			data,
			sales,
			stats: stats.map((item) => [Math.floor(new Date(item.day).getTime() / 1000), item.sum, item.count]),
			name: data?.[0]?.name ?? null,
			address: slug,
			floorHistory: floorHistory.map((item) => [Math.floor(new Date(item.timestamp).getTime() / 1000), item.floorPrice])
		}
	} catch (e) {
		console.log(e)
	}
}

export const getNFTChainChartData = async (chain) => {
	try {
		return fetch(`${NFT_CHART_API}/chain/${chain}`).then((r) => r.json())
	} catch (e) {
		console.log(e)
	}
}

export const getNFTMarketplaceChartData = async (marketplace) => {
	try {
		return fetch(`${NFT_CHART_API}/marketplace/${marketplace}`).then((r) => r.json())
	} catch (e) {
		console.log(e)
	}
}

export const getNFTCollectionChartData = async (slug) => {
	try {
		return fetch(`${NFT_CHART_API}/collection/${slug}`).then((r) => r.json())
	} catch (e) {
		console.log(e)
	}
}

export const getNFTChainsData = async () => {
	try {
		return fetch(NFT_CHAINS_API).then((r) => r.json())
	} catch (e) {
		console.log(e)
	}
}

export const getNFTMarketplacesData = async () => {
	try {
		return fetch(NFT_MARKETPLACES_API).then((r) => r.json())
	} catch (e) {
		console.log(e)
	}
}

export const getNFTSearchResults = async (query: string) => {
	try {
		if (query) {
			const { hits }: { hits: any } = await fetch(`${NFT_SEARCH_API}?query=${query}`).then((r) => r.json())
			return hits.map((hit) => hit._source)
		}
		return []
	} catch (e) {
		console.log(e)
	}
}

export const useFetchNFTsList = (searchValue: string) => {
	const debouncedSearchTerm = useDebounce(searchValue, 500)

	const { data, error } = useSWR<ApiResponse>(
		debouncedSearchTerm ? `${NFT_SEARCH_API}?query=${debouncedSearchTerm}` : NFT_COLLECTIONS_API,
		fetcher
	)

	return {
		data: data?.hits?.map((el) => el._source) ?? data?.data ?? null,
		error: error?.error,
		loading: (!data && !error && !!searchValue) || searchValue != debouncedSearchTerm
	}
}
