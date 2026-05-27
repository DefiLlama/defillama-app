import { buildEvmChainsSet } from '~/constants/chains'
import type { RawRaise } from '~/containers/Raises/api.types'
import type {
	RawYieldPool,
	YieldChainsResponse,
	YieldConfigResponse,
	YieldPoolsResponse,
	YieldUrlsResponse
} from '../api.types'
import { calculateApyNet7d } from '../domain/apyMath'
import type { YieldPageProps, YieldPool } from '../types'

// Build slug → valuation map from raises + protocol hierarchy
export function buildRaiseValuations(
	raises: RawRaise[],
	config: Record<string, any>,
	protocolsData: any
): Map<string, number> {
	const sorted = [...raises].sort((a, b) => b.date - a.date)

	// Index raises by defillamaId and name (most recent wins)
	const byId = new Map<string, number>()
	const byName = new Map<string, number>()
	for (const r of sorted) {
		const val = Number(r.valuation)
		if (!Number.isFinite(val) || val <= 0) continue
		if (r.defillamaId && !byId.has(String(r.defillamaId))) byId.set(String(r.defillamaId), val)
		if (r.name && !byName.has(r.name.trim().toLowerCase())) byName.set(r.name.trim().toLowerCase(), val)
	}

	const lite = protocolsData ?? { protocols: [], parentProtocols: [] }
	const protocols = lite.protocols ?? []
	const parents = lite.parentProtocols ?? []

	// Protocol lookups
	const liteByName = new Map<string, any>()
	const childrenByParent = new Map<string, any[]>()
	for (const p of protocols) {
		if (p.name) liteByName.set(p.name.toLowerCase(), p)
		if (p.parentProtocol) {
			if (!childrenByParent.has(p.parentProtocol)) childrenByParent.set(p.parentProtocol, [])
			childrenByParent.get(p.parentProtocol)!.push(p)
		}
	}

	// Parent protocol name + valuation lookups
	const parentNameById = new Map<string, string>()
	const valByParentName = new Map<string, number>()
	for (const pp of parents) {
		if (pp.id && pp.name) parentNameById.set(pp.id, pp.name)
		if (!pp.name || pp.name.length < 4) continue
		const name = pp.name.trim().toLowerCase()
		let val = byId.get(pp.id)
		if (val == null) {
			for (const child of childrenByParent.get(pp.id) ?? []) {
				val = byId.get(String(child.defillamaId ?? child.id ?? ''))
				if (val != null) break
			}
		}
		if (val == null) val = byName.get(name)
		if (val != null) valByParentName.set(name, val)
	}

	// Match config slugs → valuations (4-tier cascade)
	const result = new Map<string, number>()
	for (const slug in config) {
		const configName = config[slug]?.name
		if (!configName) continue
		const proto = liteByName.get(configName.toLowerCase())
		let val: number | undefined

		// 1: direct defillamaId
		if (proto) {
			val = byId.get(String(proto.defillamaId ?? proto.id ?? ''))
			// 2: parent protocol (by id, then by name)
			if (val == null && proto.parentProtocol) {
				val = byId.get(String(proto.parentProtocol))
				if (val == null) {
					const pName = parentNameById.get(proto.parentProtocol)
					if (pName) val = byName.get(pName.toLowerCase())
				}
			}
		}
		// 3: exact config name → raise name
		if (val == null) val = byName.get(configName.toLowerCase())
		// 4: config name starts with parent protocol name (e.g. "Phantom SOL" → "Phantom")
		if (val == null) {
			const lower = configName.toLowerCase()
			for (const [pName, pVal] of valByParentName) {
				if (lower.startsWith(pName + ' ')) {
					val = pVal
					break
				}
			}
		}

		if (val != null) result.set(slug, val)
	}
	return result
}

export function formatYieldsPageData({
	poolsData,
	configData,
	urlsData,
	chainsData,
	protocolsData
}: {
	poolsData: YieldPoolsResponse
	configData: YieldConfigResponse
	urlsData: YieldUrlsResponse
	chainsData: YieldChainsResponse
	protocolsData: any
}): YieldPageProps {
	let _pools: Array<RawYieldPool & Partial<YieldPool>> = poolsData?.data ?? []
	let _config = configData?.protocols ?? {}
	let _urls = urlsData ?? {}
	let _chains = chainsData ?? []
	let _lite = protocolsData ?? { protocols: [], parentProtocols: [] }

	// Build EVM chains set from API data (chains with chainId are EVM)
	const evmChainsSet = buildEvmChainsSet(_chains)

	// symbol in _config doesn't account for potential parentProtocol token, updating this here
	const parentProtocolByProtocolName = new Map<string, string>()
	for (const protocol of _lite.protocols) {
		if (protocol.name && protocol.parentProtocol)
			parentProtocolByProtocolName.set(protocol.name, protocol.parentProtocol)
	}
	const parentGeckoIdById = new Map<string, string | null>()
	for (const parentProtocol of _lite.parentProtocols) {
		if (parentProtocol.id) parentGeckoIdById.set(parentProtocol.id, parentProtocol.gecko_id ?? null)
	}

	for (const key in _config) {
		const i = _config[key]
		if ([null, '-'].includes(i['symbol'])) {
			const parentId = parentProtocolByProtocolName.get(i['name'])

			if (parentId) {
				const geckoId = parentGeckoIdById.get(parentId)
				i['symbol'] = geckoId ? 'x' : i['symbol']
			}
		}
	}

	// add projectName and audit fields from config to pools array
	const poolsWithConfig: Array<RawYieldPool & Partial<YieldPool>> = []
	for (const p of _pools) {
		const config = _config[p.project]
		poolsWithConfig.push({
			...p,
			projectName: config?.name ?? null,
			audits: config?.audits ?? null,
			airdrop: config?.symbol === null || config?.symbol === '-',
			category: config?.category ?? null,
			url: _urls[p.pool] ?? '',
			apyReward: p.apyReward > 0 ? p.apyReward : null,
			rewardTokens: p.apyReward > 0 ? p.rewardTokens : [],
			apyNet7d: calculateApyNet7d(p.apyBase7d, p.il7d)
		})
	}
	_pools = poolsWithConfig

	// add lsd apr
	const lsd = []
	const lsdSymbolsSet = new Set<string>()
	for (const p of _pools) {
		if (p.category === 'Liquid Staking' && p.exposure === 'single' && p.project !== 'stafi' && p.symbol !== 'ETH') {
			lsd.push(p)
			lsdSymbolsSet.add(p.symbol)
		}
	}
	const lsdSymbols = Array.from(lsdSymbolsSet)
	const poolsWithLsd: Array<RawYieldPool & Partial<YieldPool>> = []
	const lsdExcludedProjects = new Set(['curve-dex', 'olympus-dao', 'convex-finance'])
	const lsdFeeProjects = new Set(['balancer-v2', 'aura'])
	for (const p of _pools) {
		let apyLsd = null
		let includesLsdSymbol = false
		for (const symbol of lsdSymbols) {
			if (p.symbol.includes(symbol)) {
				includesLsdSymbol = true
				break
			}
		}
		if (p.category !== 'Liquid Staking' && includesLsdSymbol && !lsdExcludedProjects.has(p.project)) {
			const l = p.underlyingTokens?.length
			apyLsd = 0
			for (const lsdPool of lsd) {
				if (!p.symbol.includes(lsdPool.symbol)) continue
				// balancer takes 50% of lsd apr as fee (https://docs.balancer.fi/concepts/governance/protocol-fees.html#wrapped-token-yield-fees)
				apyLsd += lsdFeeProjects.has(p.project) ? (lsdPool.apyBase * 0.5) / l : lsdPool.apyBase / l
			}
			apyLsd = Number.isFinite(apyLsd) ? apyLsd : null
		}

		let lsdTokenOnly = true
		for (const symbolPart of p.symbol.split('-')) {
			let symbolPartHasLsd = false
			for (const lsdSymbol of lsdSymbols) {
				if (symbolPart.includes(lsdSymbol)) {
					symbolPartHasLsd = true
					break
				}
			}
			if (!symbolPartHasLsd) {
				lsdTokenOnly = false
				break
			}
		}

		poolsWithLsd.push({
			...p,
			apyLsd,
			apyBaseIncludingLsdApy: p.apyBase + apyLsd,
			apyIncludingLsdApy: p.apy + apyLsd,
			lsdTokenOnly
		})
	}
	_pools = poolsWithLsd

	const poolsList: YieldPool[] = []

	const chainList: Set<string> = new Set()

	const projectList: Set<string> = new Set()

	const categoryList: Set<string> = new Set()

	for (const pool of _pools) {
		// remove potential undefined on projectName
		if (!pool.projectName) continue

		const normalizedPool: YieldPool = {
			pool: pool.pool,
			symbol: pool.symbol,
			project: pool.project,
			projectName: pool.projectName,
			chain: pool.chain,
			category: pool.category ?? null,
			tvlUsd: pool.tvlUsd,
			apy: pool.apy,
			apyBase: pool.apyBase,
			apyReward: pool.apyReward,
			rewardTokens: pool.rewardTokens ?? [],
			rewardTokensSymbols: pool.rewardTokensSymbols ?? undefined,
			rewardTokensNames: pool.rewardTokensNames ?? undefined,
			rewardMeta: pool.rewardMeta ?? null,
			underlyingTokens: pool.underlyingTokens ?? [],
			airdrop: Boolean(pool.airdrop),
			raiseValuation: pool.raiseValuation ?? null,
			audits: pool.audits ?? null,
			url: pool.url ?? '',
			stablecoin: pool.stablecoin,
			exposure: pool.exposure,
			ilRisk: pool.ilRisk,
			hasMemeToken: pool.hasMemeToken,
			outlier: pool.outlier,
			predictions: pool.predictions,
			apyPct1D: pool.apyPct1D,
			apyPct7D: pool.apyPct7D,
			il7d: pool.il7d,
			apyBase7d: pool.apyBase7d,
			apyNet7d: pool.apyNet7d,
			apyMean30d: pool.apyMean30d,
			volumeUsd1d: pool.volumeUsd1d,
			volumeUsd7d: pool.volumeUsd7d,
			apyBaseInception: pool.apyBaseInception,
			apyLsd: pool.apyLsd,
			apyIncludingLsdApy: pool.apyIncludingLsdApy,
			apyBaseIncludingLsdApy: pool.apyBaseIncludingLsdApy,
			lsdTokenOnly: pool.lsdTokenOnly,
			poolMeta: pool.poolMeta
		}

		poolsList.push(normalizedPool)
		chainList.add(normalizedPool.chain)
		if (normalizedPool.category) categoryList.add(normalizedPool.category)
		projectList.add(normalizedPool.projectName)
	}

	let tokenNameMapping = {}
	for (const key in _config) {
		if (key === 'cakedao') continue
		tokenNameMapping[_config[key].symbol] = _config[key].name
	}
	// add chain symbols too
	for (const chain of _chains) {
		tokenNameMapping[chain.tokenSymbol] = chain.name === 'xDai' ? 'Gnosis' : chain.name
	}

	tokenNameMapping['USDC'] = 'USD Coin'
	tokenNameMapping['VELO'] = 'Velodrome'
	// remove any null keys (where no token)
	const filteredTokenNameMapping: Record<string, string> = {}
	for (const k in tokenNameMapping) {
		if (k !== 'null') {
			filteredTokenNameMapping[k] = tokenNameMapping[k]
		}
	}
	tokenNameMapping = filteredTokenNameMapping

	const symbolsSet = new Set<string>()
	for (const pool of _pools) {
		for (const symbol of pool.symbol.split(' ')[0].split('-')) {
			symbolsSet.add(symbol)
		}
	}
	const symbols = Array.from(symbolsSet)

	const tokens = [
		{
			name: 'All Bitcoins',
			symbol: 'ALL_BITCOINS',
			logo: null,
			fallbackLogo: null
		},
		{
			name: 'All USD Stablecoins',
			symbol: 'ALL_USD_STABLES',
			logo: null,
			fallbackLogo: null
		}
	]

	const tokenSymbolsList = ['ALL_BITCOINS', 'ALL_USD_STABLES']

	for (const token of symbols as string[]) {
		if (token) {
			tokens.push({
				name: token,
				symbol: token,
				logo: null,
				fallbackLogo: null
			})
			tokenSymbolsList.push(token)
		}
	}

	return {
		pools: poolsList,
		chainList: Array.from(chainList),
		projectList: Array.from(projectList),
		categoryList: Array.from(categoryList),
		tokenNameMapping,
		tokens,
		tokenSymbolsList,
		usdPeggedSymbols: [],
		stablecoinInfoBySymbol: {},
		tokenCategories: {},
		evmChains: Array.from(evmChainsSet)
	}
}
