import { fetchExchangeMarketsListFromNetwork } from '~/containers/Cexs/api'
import { fetchTokenMarketsListFromNetwork } from '~/containers/Token/api'
import { slug } from '~/utils'
import {
	buildCexMarketsSlugIndex,
	buildTokenMarketsSymbolIndex,
	fetchExchangeMarketsListFromCache,
	fetchCexMarketsSlugIndexFromCache,
	fetchTokenMarketsSymbolIndexFromCache,
	resolveMarketsExchangeFromList,
	type CexMarketsSlugIndex,
	type CexMarketsSlugIndexEntry,
	type TokenMarketsSymbolIndex
} from '../markets'
import { readThroughDatasetCache } from './source'

function fetchExchangeMarketsList() {
	return readThroughDatasetCache({
		domain: 'markets',
		readCache: fetchExchangeMarketsListFromCache,
		readNetwork: fetchExchangeMarketsListFromNetwork
	})
}

function fetchTokenMarketsSymbolIndex(): Promise<TokenMarketsSymbolIndex> {
	return readThroughDatasetCache({
		domain: 'markets',
		readCache: fetchTokenMarketsSymbolIndexFromCache,
		readNetwork: async () => buildTokenMarketsSymbolIndex(await fetchTokenMarketsListFromNetwork())
	})
}

function fetchCexMarketsSlugIndex(): Promise<CexMarketsSlugIndex> {
	return readThroughDatasetCache({
		domain: 'markets',
		readCache: fetchCexMarketsSlugIndexFromCache,
		readNetwork: async () => buildCexMarketsSlugIndex(await fetchExchangeMarketsListFromNetwork())
	})
}

export async function resolveCexMarketsByDefillamaSlug(
	defillamaSlug: string
): Promise<CexMarketsSlugIndexEntry | null> {
	const index = await fetchCexMarketsSlugIndex()
	const key = slug(defillamaSlug)
	return Object.hasOwn(index, key) ? index[key] : null
}

export async function resolveMarketsExchangeByParam(exchange: string): Promise<string | null> {
	return resolveMarketsExchangeFromList(exchange, await fetchExchangeMarketsList())
}

export async function hasTokenMarkets(symbol: string): Promise<boolean> {
	const index = await fetchTokenMarketsSymbolIndex()
	return Object.hasOwn(index, symbol.toLowerCase())
}
