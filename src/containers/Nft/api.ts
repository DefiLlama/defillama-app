import { DATASETS_SERVER_URL, NFT_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	RawCollectionDetail,
	RawCollectionStats,
	RawFloorHistoryEntry,
	RawNftCollection,
	RawNftMarketplaceStats,
	RawNftMarketplaceVolume,
	RawNftVolume,
	RawOrderbookEntry,
	RawParentCompany,
	RawRoyalty
} from './api.types'

const encodeSlug = (slug: string): string => encodeURIComponent(slug)

export async function fetchNftCollections(): Promise<RawNftCollection[]> {
	return fetchJson<RawNftCollection[]>(`${NFT_SERVER_URL}/collections`, { timeout: 60_000 })
}

export async function fetchNftVolumes(): Promise<RawNftVolume[]> {
	return fetchJson<RawNftVolume[]>(`${NFT_SERVER_URL}/volume`, { timeout: 60_000 })
}

export async function fetchNftCollection(slug: string): Promise<RawCollectionDetail[]> {
	return fetchJson<RawCollectionDetail[]>(`${NFT_SERVER_URL}/collection/${encodeSlug(slug)}`)
}

export async function fetchNftCollectionSales(slug: string): Promise<Array<[number, number]>> {
	const data = await fetchJson<Array<[number, number]> | null>(
		`${NFT_SERVER_URL}/sales?collectionId=${encodeSlug(slug)}`
	)
	return data != null && Array.isArray(data) ? data.map((i) => [i[0] * 1000, i[1]] as [number, number]) : []
}

export async function fetchNftCollectionStats(slug: string): Promise<RawCollectionStats[]> {
	return fetchJson<RawCollectionStats[]>(`${NFT_SERVER_URL}/stats/${encodeSlug(slug)}`)
}

export async function fetchNftCollectionFloorHistory(slug: string): Promise<RawFloorHistoryEntry[]> {
	return fetchJson<RawFloorHistoryEntry[]>(`${NFT_SERVER_URL}/floorHistory/${encodeSlug(slug)}`)
}

export async function fetchNftCollectionOrderbook(slug: string): Promise<RawOrderbookEntry[]> {
	return fetchJson<RawOrderbookEntry[]>(`${NFT_SERVER_URL}/orderbook/${encodeSlug(slug)}`)
}

export async function fetchNftMarketplaceStats(): Promise<RawNftMarketplaceStats[]> {
	return fetchJson<RawNftMarketplaceStats[]>(`${NFT_SERVER_URL}/exchangeStats`)
}

export async function fetchNftMarketplaceVolumes(): Promise<RawNftMarketplaceVolume[]> {
	return fetchJson<RawNftMarketplaceVolume[]>(`${NFT_SERVER_URL}/exchangeVolume`, { timeout: 60_000 })
}

export async function fetchNftRoyalties(): Promise<RawRoyalty[]> {
	return fetchJson<RawRoyalty[]>(`${NFT_SERVER_URL}/royalties`)
}

export async function fetchNftRoyaltyHistory(slug: string): Promise<Array<[number, number]>> {
	return fetchJson<Array<[number, number]>>(`${NFT_SERVER_URL}/royaltyHistory/${encodeSlug(slug)}`)
}

export async function fetchNftRoyalty(slug: string): Promise<RawRoyalty[]> {
	return fetchJson<RawRoyalty[]>(`${NFT_SERVER_URL}/royalty/${encodeSlug(slug)}`)
}

export async function fetchParentCompanies(): Promise<RawParentCompany[]> {
	return fetchJson<RawParentCompany[]>(
		'https://raw.githubusercontent.com/DefiLlama/defillama-server/master/defi/src/nfts/output/parentCompanies.json'
	)
}

export async function fetchNftsVolumeByChain(): Promise<Record<string, number>> {
	return fetchJson<Record<string, number>>(`${DATASETS_SERVER_URL}/temp/chainNfts`)
}
