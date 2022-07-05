import useSWR from 'swr'
import { useDebounce } from '~/hooks'
import { fetcher } from '~/utils/useSWR'
import {
	NFT_CHAINS_API,
	NFT_CHART_API,
	NFT_COLLECTIONS_API,
	NFT_COLLECTION_API,
	NFT_MARKETPLACES_API,
	NFT_SEARCH_API
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
		const chart = await fetch(NFT_CHART_API).then((r) => r.json())
		const { data: collections } = await fetch(NFT_COLLECTIONS_API).then((r) => r.json())
		const statistics = getNFTStatistics(chart)

		return {
			chart,
			collections,
			statistics
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

export const getNFTCollection = async (slug) => {
	try {
		const data = await fetch(`${NFT_COLLECTION_API}/${slug}`).then((r) => r.json())
		return data.find((data) => data.SK === 'overview')
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
