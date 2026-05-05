import { fetchBridges } from '~/containers/Bridges/api'
import { fetchChainsByCategoryAll, fetchChainsList } from '~/containers/Chains/api'
import { fetchCexs } from '~/containers/Cexs/api'
import { fetchHacks } from '~/containers/Hacks/api'
import { fetchProtocols } from '~/containers/Protocols/api'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import { chainIconUrl, tokenIconUrl } from '~/utils/icons'
import type {
	EntityPreview,
	EntityPreviewBridge,
	EntityPreviewCategory,
	EntityPreviewCex,
	EntityPreviewChain,
	EntityPreviewHack,
	EntityPreviewProtocol,
	EntityPreviewStablecoin
} from '../entityPreviewTypes'
import type { ArticleEntityType } from '../types'

const TTL_MS = 5 * 60 * 1000

type Cache<T> = { value: T | null; expires: number; inflight: Promise<T> | null }

function makeCache<T>(loader: () => Promise<T>) {
	const cache: Cache<T> = { value: null, expires: 0, inflight: null }
	return async (): Promise<T> => {
		const now = Date.now()
		if (cache.value && cache.expires > now) return cache.value
		if (cache.inflight) return cache.inflight
		cache.inflight = loader()
			.then((v) => {
				cache.value = v
				cache.expires = now + TTL_MS
				cache.inflight = null
				return v
			})
			.catch((e) => {
				cache.inflight = null
				throw e
			})
		return cache.inflight
	}
}

const getProtocols = makeCache(() => fetchProtocols())
const getChains = makeCache(() => fetchChainsList())
const getChainsByCategory = makeCache(() => fetchChainsByCategoryAll<{ chains?: any[] }>())
const getStablecoins = makeCache(() => fetchStablecoinAssetsApi())
const getCexs = makeCache(() => fetchCexs())
const getBridges = makeCache(() => fetchBridges(true))
const getHacks = makeCache(() => fetchHacks())

const slugify = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-')

const pctChange = (now?: number | null, prev?: number | null): number | null => {
	if (typeof now !== 'number' || typeof prev !== 'number' || prev === 0) return null
	return (now - prev) / prev
}

export async function buildProtocolPreview(slug: string): Promise<EntityPreviewProtocol | null> {
	const data: any = await getProtocols()
	const list: any[] = Array.isArray(data?.protocols) ? data.protocols : Array.isArray(data) ? data : []
	const parents: any[] = Array.isArray(data?.parentProtocols) ? data.parentProtocols : []
	const target = slug.toLowerCase()
	const match = list.find(
		(p: any) =>
			(typeof p.slug === 'string' && p.slug.toLowerCase() === target) ||
			(typeof p.name === 'string' && slugify(p.name) === target)
	)
	if (match) {
		return {
			kind: 'protocol',
			tvl: typeof match.tvl === 'number' ? match.tvl : null,
			change1d: pctChange(match.tvl, match.tvlPrevDay),
			change7d: pctChange(match.tvl, match.tvlPrevWeek),
			change30d: pctChange(match.tvl, match.tvlPrevMonth),
			category: typeof match.category === 'string' ? match.category : null,
			chains: Array.isArray(match.chains) ? match.chains.slice(0, 8) : [],
			mcap: typeof match.mcap === 'number' ? match.mcap : null,
			logo: match.logo || tokenIconUrl(match.slug || match.name || slug)
		}
	}
	const parent = parents.find(
		(p: any) =>
			(typeof p.id === 'string' && p.id.toLowerCase() === target) ||
			(typeof p.name === 'string' && slugify(p.name) === target)
	)
	if (!parent) return null
	const children = list.filter((p: any) => p.parentProtocol === parent.id)
	const sum = (k: string) => children.reduce((s, p: any) => s + (typeof p[k] === 'number' ? p[k] : 0), 0)
	const tvl = sum('tvl')
	const categories = Array.from(new Set(children.map((c: any) => c.category).filter((v): v is string => !!v)))
	return {
		kind: 'protocol',
		tvl: tvl > 0 ? tvl : null,
		change1d: pctChange(tvl, sum('tvlPrevDay')),
		change7d: pctChange(tvl, sum('tvlPrevWeek')),
		change30d: pctChange(tvl, sum('tvlPrevMonth')),
		category: categories[0] ?? null,
		chains: Array.isArray(parent.chains) ? parent.chains.slice(0, 8) : [],
		mcap: null,
		logo: parent.logo || tokenIconUrl(parent.name || slug)
	}
}

export async function buildChainPreview(slug: string): Promise<EntityPreviewChain | null> {
	const [chains, byCat] = await Promise.all([getChains(), getChainsByCategory()])
	const target = slug.toLowerCase()
	const match: any = (chains as any[]).find((c) => slugify(String(c.name)) === target)
	const richList: any[] = Array.isArray((byCat as any)?.chainTvls) ? (byCat as any).chainTvls : []
	const rich = richList.find((c: any) => slugify(String(c.name)) === target)
	if (!match && !rich) return null
	const name = match?.name ?? rich?.name
	const tvl = typeof rich?.tvl === 'number' ? rich.tvl : typeof match?.tvl === 'number' ? match.tvl : null
	return {
		kind: 'chain',
		tvl,
		change1d: pctChange(tvl, rich?.tvlPrevDay),
		change7d: pctChange(tvl, rich?.tvlPrevWeek),
		protocolCount: typeof rich?.protocols === 'number' ? rich.protocols : null,
		logo: name ? chainIconUrl(name) : null
	}
}

export async function buildStablecoinPreview(slug: string): Promise<EntityPreviewStablecoin | null> {
	const data: any = await getStablecoins()
	const list: any[] = Array.isArray(data?.peggedAssets) ? data.peggedAssets : Array.isArray(data) ? data : []
	const target = slug.toLowerCase()
	const match = list.find(
		(s: any) =>
			(typeof s.symbol === 'string' && s.symbol.toLowerCase() === target) ||
			(typeof s.name === 'string' && slugify(s.name) === target) ||
			(s.id !== undefined && String(s.id) === slug)
	)
	if (!match) return null
	const totalCirc = match.circulating?.peggedUSD ?? match.circulating ?? null
	const totalCircPrev = match.circulatingPrevWeek?.peggedUSD ?? match.circulatingPrevWeek ?? null
	const chainBreakdown: Record<string, any> = match.chainCirculating || {}
	const topChains = Object.entries(chainBreakdown)
		.map(([name, value]: [string, any]) => ({
			name,
			circulating: Number(value?.current?.peggedUSD ?? value?.current ?? value?.peggedUSD ?? 0)
		}))
		.filter((c) => c.circulating > 0)
		.sort((a, b) => b.circulating - a.circulating)
		.slice(0, 4)
	return {
		kind: 'stablecoin',
		circulating: typeof totalCirc === 'number' ? totalCirc : null,
		change7d: pctChange(totalCirc, totalCircPrev),
		pegType: match.pegType || null,
		pegMechanism: match.pegMechanism || null,
		price: typeof match.price === 'number' ? match.price : null,
		topChains
	}
}

export async function buildCategoryPreview(slug: string): Promise<EntityPreviewCategory | null> {
	const data: any = await getProtocols()
	const list: any[] = Array.isArray(data?.protocols) ? data.protocols : Array.isArray(data) ? data : []
	const target = slug.toLowerCase()
	const matches = list.filter((p: any) => typeof p.category === 'string' && slugify(p.category) === target)
	if (matches.length === 0) return null
	const tvl = matches.reduce((s, p) => s + (typeof p.tvl === 'number' ? p.tvl : 0), 0)
	const top = [...matches]
		.sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))
		.slice(0, 3)
		.map((p: any) => ({
			name: p.name,
			slug: p.slug || slugify(p.name),
			tvl: typeof p.tvl === 'number' ? p.tvl : 0,
			logo: p.logo || tokenIconUrl(p.slug || p.name)
		}))
	return { kind: 'category', tvl, protocolCount: matches.length, topProtocols: top }
}

export async function buildCexPreview(slug: string): Promise<EntityPreviewCex | null> {
	const data: any = await getCexs()
	const list: any[] = Array.isArray(data) ? data : Array.isArray((data as any)?.cexs) ? (data as any).cexs : []
	const target = slug.toLowerCase()
	const match = list.find(
		(c: any) =>
			(typeof c.slug === 'string' && c.slug.toLowerCase() === target) ||
			(typeof c.name === 'string' && slugify(c.name) === target)
	)
	if (!match) return null
	return {
		kind: 'cex',
		tvl: typeof match.currentTvl === 'number' ? match.currentTvl : null,
		cleanAssetsTvl: typeof match.cleanAssetsTvl === 'number' ? match.cleanAssetsTvl : null,
		spotVolume: typeof match.spotVolume === 'number' ? match.spotVolume : null,
		inflows1w: typeof match.inflows_1w === 'number' ? match.inflows_1w : null
	}
}

export async function buildBridgePreview(slug: string): Promise<EntityPreviewBridge | null> {
	const data: any = await getBridges()
	const list: any[] = Array.isArray(data?.bridges) ? data.bridges : Array.isArray(data) ? data : []
	const target = slug.toLowerCase()
	const match = list.find(
		(b: any) =>
			(typeof b.slug === 'string' && b.slug.toLowerCase() === target) ||
			(typeof b.name === 'string' && slugify(b.name) === target) ||
			(typeof b.displayName === 'string' && slugify(b.displayName) === target)
	)
	if (!match) return null
	return {
		kind: 'bridge',
		volume24h: typeof match.last24hVolume === 'number' ? match.last24hVolume : null,
		volume7d: typeof match.weeklyVolume === 'number' ? match.weeklyVolume : null,
		chains: Array.isArray(match.chains) ? match.chains.slice(0, 6) : [],
		destinationChain: typeof match.destinationChain === 'string' ? match.destinationChain : null
	}
}

export async function buildHackPreview(slug: string): Promise<EntityPreviewHack | null> {
	const list = await getHacks()
	const target = slug.toLowerCase()
	const numericId = /^\d+$/.test(slug) ? Number(slug) : null
	const match = list.find((h) => {
		if (numericId !== null && h.defillamaId === numericId) return true
		const name = typeof h.name === 'string' ? h.name : ''
		return slugify(name) === target || name.toLowerCase() === target
	})
	if (!match) return null
	const dateIso = typeof match.date === 'number' ? new Date(match.date * 1000).toISOString() : null
	return {
		kind: 'hack',
		date: dateIso,
		amount: typeof match.amount === 'number' ? match.amount : null,
		returnedFunds: typeof match.returnedFunds === 'number' ? match.returnedFunds : null,
		classification: match.classification ?? null,
		technique: match.technique ?? null,
		chains: Array.isArray(match.chain) ? match.chain.slice(0, 6) : [],
		targetType: match.targetType ?? null,
		bridgeHack: !!match.bridgeHack
	}
}

export async function buildEntityPreview(type: ArticleEntityType, slug: string): Promise<EntityPreview | null> {
	switch (type) {
		case 'protocol':
			return buildProtocolPreview(slug)
		case 'chain':
			return buildChainPreview(slug)
		case 'stablecoin':
			return buildStablecoinPreview(slug)
		case 'category':
			return buildCategoryPreview(slug)
		case 'cex':
			return buildCexPreview(slug)
		case 'bridge':
			return buildBridgePreview(slug)
		case 'hack':
			return buildHackPreview(slug)
		default:
			return null
	}
}
