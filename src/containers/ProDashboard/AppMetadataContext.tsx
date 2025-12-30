import * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getDisplayAliases } from '~/utils/chainNormalizer'
import type { ChartBuilderConfig } from './components/AddChartModal/types'
import { getChainChartTypes, getProtocolChartTypes } from './types'

type BuilderMetric = ChartBuilderConfig['metric']

type ProtocolFlags = Record<string, any>
type ChainFlags = Record<string, any>

type ProtocolRecord = {
	slug: string
	displayName?: string
	chains?: string[]
	builderMetrics: Set<BuilderMetric>
	flags: ProtocolFlags
}

type ChainRecord = {
	name: string
	id?: string
	gecko_id?: string
	tokenSymbol?: string
	flags: ChainFlags
}

type AppMetadataContextType = {
	loading: boolean
	error?: string
	protocolsBySlug: Map<string, ProtocolRecord>
	hasProtocolBuilderMetric: (slug: string, metric: BuilderMetric) => boolean
	availableProtocolChartTypes: (slug: string, opts?: { hasGeckoId?: boolean }) => string[]
	chainsByName: Map<string, ChainRecord>
	availableChainChartTypes: (chainName: string, opts?: { hasGeckoId?: boolean }) => string[]
}

const AppMetadataContext = createContext<AppMetadataContextType | undefined>(undefined)

const PROTOCOL_FLAG_BY_BUILDER_METRIC: Record<BuilderMetric, keyof ProtocolFlags> = {
	tvl: 'tvl',
	fees: 'fees',
	revenue: 'revenue',
	volume: 'dexs',
	perps: 'perps',
	'open-interest': 'openInterest',
	'options-notional': 'optionsNotionalVolume',
	'options-premium': 'optionsPremiumVolume',
	'bridge-aggregators': 'bridgeAggregators',
	'dex-aggregators': 'dexAggregators',
	'perps-aggregators': 'perpsAggregators',
	'user-fees': 'fees',
	'holders-revenue': 'holdersRevenue',
	'protocol-revenue': 'revenue',
	'supply-side-revenue': 'fees',
	stablecoins: 'stablecoins',
	'chain-fees': 'chainFees',
	'chain-revenue': 'chainRevenue'
}

async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`${url} -> ${res.status}`)
	return res.json()
}

export function AppMetadataProvider({ children }: { children: React.ReactNode }) {
	const [protocolsRaw, setProtocolsRaw] = useState<Record<string, any> | null>(null)
	const [chainsRaw, setChainsRaw] = useState<Record<string, any> | null>(null)
	const [pfPsProtocols, setPfPsProtocols] = useState<{ pf: Set<string>; ps: Set<string> }>({
		pf: new Set(),
		ps: new Set()
	})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | undefined>(undefined)

	useEffect(() => {
		let cancelled = false
		setLoading(true)
		setError(undefined)

		const fetchPfPs = async (): Promise<{ pf: string[]; ps: string[] }> => {
			try {
				const res = await fetch('/api/dashboard/pf-ps-protocols')
				if (!res.ok) return { pf: [], ps: [] }
				return res.json()
			} catch {
				return { pf: [], ps: [] }
			}
		}

		Promise.all([
			fetchJson<Record<string, any>>('https://api.llama.fi/config/smol/appMetadata-protocols.json'),
			fetchJson<Record<string, any>>('https://api.llama.fi/config/smol/appMetadata-chains.json'),
			fetchPfPs()
		])
			.then(([protocols, chains, pfPs]) => {
				if (cancelled) return
				setProtocolsRaw(protocols)
				setChainsRaw(chains)
				setPfPsProtocols({
					pf: new Set(pfPs.pf || []),
					ps: new Set(pfPs.ps || [])
				})
			})
			.catch((e) => {
				if (cancelled) return
				setError(String(e?.message || e))
			})
			.finally(() => {
				if (cancelled) return
				setLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [])

	const { protocolsBySlug, chainsByName } = useMemo(() => {
		const protocolsBySlug = new Map<string, ProtocolRecord>()
		const chainsByName = new Map<string, ChainRecord>()

		if (protocolsRaw) {
			const tmp: Record<string, { flags: any; chains: Set<string>; displayName?: string }> = {}

			for (const key of Object.keys(protocolsRaw)) {
				const item = protocolsRaw[key]
				if (!item || typeof item !== 'object') continue
				const slug: string | undefined = item.name
				if (!slug) continue

				if (!tmp[slug]) {
					tmp[slug] = { flags: {}, chains: new Set<string>(), displayName: undefined }
				}

				for (const k of Object.keys(item)) {
					const v = (item as any)[k]
					if (k === 'chains' && Array.isArray(v)) {
						v.forEach((c: string) => tmp[slug].chains.add(c))
					} else if (k === 'displayName' && v && !tmp[slug].displayName) {
						tmp[slug].displayName = v
					} else if (typeof v === 'boolean') {
						tmp[slug].flags[k] = Boolean(tmp[slug].flags[k]) || v
					} else if (tmp[slug].flags[k] === undefined) {
						tmp[slug].flags[k] = v
					}
				}
			}

			for (const slug of Object.keys(tmp)) {
				const agg = tmp[slug]
				const builderMetrics = new Set<BuilderMetric>()
				for (const metric of Object.keys(PROTOCOL_FLAG_BY_BUILDER_METRIC) as BuilderMetric[]) {
					const flagKey = PROTOCOL_FLAG_BY_BUILDER_METRIC[metric]
					if (agg.flags?.[flagKey]) builderMetrics.add(metric)
				}
				const record: ProtocolRecord = {
					slug,
					displayName: agg.displayName,
					chains: Array.from(agg.chains),
					builderMetrics,
					flags: agg.flags
				}
				protocolsBySlug.set(slug, record)
				protocolsBySlug.set(slug.toLowerCase(), record)
			}
		}

		if (chainsRaw) {
			for (const key of Object.keys(chainsRaw)) {
				const item = chainsRaw[key]
				if (!item || typeof item !== 'object') continue
				const name: string | undefined = item.name
				if (!name) continue
				const record: ChainRecord = {
					name,
					id: item.id,
					gecko_id: item.gecko_id,
					tokenSymbol: item.tokenSymbol,
					flags: item
				}
				chainsByName.set(name, record)
				chainsByName.set(name.toLowerCase(), record)
				const aliases = getDisplayAliases(name)
				for (const alias of aliases) {
					chainsByName.set(alias, record)
				}
			}
		}

		return { protocolsBySlug, chainsByName }
	}, [protocolsRaw, chainsRaw])

	const hasProtocolBuilderMetric = useCallback(
		(slug: string, metric: BuilderMetric) => {
			const rec = protocolsBySlug.get(slug) ?? protocolsBySlug.get(slug.toLowerCase())
			return rec ? rec.builderMetrics.has(metric) : false
		},
		[protocolsBySlug]
	)

	const availableProtocolChartTypes = useCallback(
		(slug: string, opts?: { hasGeckoId?: boolean }) => {
			const record = protocolsBySlug.get(slug) ?? protocolsBySlug.get(slug.toLowerCase())
			const flags = record?.flags
			if (!flags) return []
			const types = new Set<string>()
			if (flags.tvl) types.add('tvl')
			if (flags.dexs) types.add('volume')
			if (flags.fees) types.add('fees')
			if (flags.revenue) types.add('revenue')
			if (flags.emissions || flags.incentives) types.add('incentives')
			if (flags.liquidity) types.add('liquidity')
			if (flags.treasury) types.add('treasury')
			if (flags.holdersRevenue) types.add('holdersRevenue')
			if (flags.bribeRevenue) types.add('bribes')
			if (flags.tokenTax) types.add('tokenTax')
			if (flags.perps) types.add('perps')
			if (flags.openInterest) types.add('openInterest')
			if (flags.dexAggregators) types.add('aggregators')
			if (flags.perpsAggregators) types.add('perpsAggregators')
			if (flags.bridgeAggregators) types.add('bridgeAggregators')
			if (flags.optionsPremiumVolume) types.add('optionsPremium')
			if (flags.optionsNotionalVolume) types.add('optionsNotional')
			if (flags.yields) types.add('medianApy')
			if (flags.borrowed) types.add('borrowed')
			if (opts?.hasGeckoId) {
				types.add('tokenMcap')
				types.add('tokenPrice')
				types.add('tokenVolume')
			}
			if (pfPsProtocols.pf.has(slug) || pfPsProtocols.pf.has(slug.toLowerCase())) {
				types.add('pfRatio')
			}
			if (pfPsProtocols.ps.has(slug) || pfPsProtocols.ps.has(slug.toLowerCase())) {
				types.add('psRatio')
			}
			const allowed = new Set(getProtocolChartTypes())
			return Array.from(types).filter((t) => allowed.has(t))
		},
		[protocolsBySlug, pfPsProtocols.pf, pfPsProtocols.ps]
	)

	const availableChainChartTypes = useCallback(
		(chainName: string, opts?: { hasGeckoId?: boolean }) => {
			const flags = chainsByName.get(chainName)?.flags
			if (!flags) return []
			const types = new Set<string>()
			types.add('tvl')
			if (flags.dexs) types.add('volume')
			if (flags.fees) {
				types.add('fees')
				types.add('bribes')
				types.add('tokenTax')
			}
			if (flags.revenue) types.add('revenue')
			if (flags.dexAggregators) types.add('aggregators')
			if (flags.perps) types.add('perps')
			if (flags.bridgeAggregators) types.add('bridgeAggregators')
			if (flags.perpsAggregators) types.add('perpsAggregators')
			if (flags.optionsNotionalVolume || flags.optionsPremiumVolume) types.add('options')
			if (flags.activeUsers) {
				types.add('activeUsers')
				types.add('users')
				types.add('newUsers')
				types.add('txs')
				types.add('gasUsed')
			}
			if (flags.chainAssets) {
				types.add('bridgedTvl')
			}
			if (flags.stablecoins) {
				types.add('stablecoins')
			}
			if (flags.inflows) {
				types.add('stablecoinInflows')
			}
			if (flags.chainFees) types.add('chainFees')
			if (flags.chainRevenue) types.add('chainRevenue')
			if (opts?.hasGeckoId || flags.gecko_id) {
				types.add('chainMcap')
				types.add('chainPrice')
			}
			const allowed = new Set(getChainChartTypes())
			return Array.from(types).filter((t) => allowed.has(t))
		},
		[chainsByName]
	)

	const value: AppMetadataContextType = useMemo(
		() => ({
			loading,
			error,
			protocolsBySlug,
			hasProtocolBuilderMetric,
			availableProtocolChartTypes,
			chainsByName,
			availableChainChartTypes
		}),
		[
			loading,
			error,
			protocolsBySlug,
			chainsByName,
			availableProtocolChartTypes,
			availableChainChartTypes,
			hasProtocolBuilderMetric
		]
	)

	return <AppMetadataContext.Provider value={value}>{children}</AppMetadataContext.Provider>
}

export function useAppMetadata() {
	const ctx = useContext(AppMetadataContext)
	if (!ctx) throw new Error('useAppMetadata must be used within an AppMetadataProvider')
	return ctx
}
