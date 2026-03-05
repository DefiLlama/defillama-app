import { buildEvmChainsSet } from '~/constants/chains'
import type { RawRaise } from '~/containers/Raises/api.types'

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
	for (const slug of Object.keys(config)) {
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

export function formatYieldsPageData(poolsAndConfig: any) {
	let _pools = poolsAndConfig[0]?.data ?? []
	let _config = poolsAndConfig[1]?.protocols ?? []
	let _urls = poolsAndConfig[2] ?? []
	let _chains = poolsAndConfig[3] ?? []
	let _lite = poolsAndConfig[4] ?? []

	// Build EVM chains set from API data (chains with chainId are EVM)
	const evmChainsSet = buildEvmChainsSet(_chains)

	// symbol in _config doesn't account for potential parentProtocol token, updating this here
	for (const i of Object.values(_config)) {
		if ([null, '-'].includes(i['symbol'])) {
			const parentId = _lite.protocols.find((l) => l.name === i['name'])?.parentProtocol

			if (parentId) {
				const geckoId = _lite.parentProtocols.find((p) => p.id === parentId)?.gecko_id
				i['symbol'] = geckoId ? 'x' : i['symbol']
			}
		}
	}

	// add projectName and audit fields from config to pools array
	_pools = _pools.map((p) => ({
		...p,
		projectName: _config[p.project]?.name ?? null,
		audits: _config[p.project]?.audits ?? null,
		airdrop: _config[p.project]?.symbol === null || _config[p.project]?.symbol === '-',
		category: _config[p.project]?.category ?? null,
		url: _urls[p.pool] ?? '',
		apyReward: p.apyReward > 0 ? p.apyReward : null,
		rewardTokens: p.apyReward > 0 ? p.rewardTokens : [],
		apyNet7d: p.apyBase7d > 0 ? Math.max(p.apyBase7d + p.il7d * 52, -100) : null // scale il7d (negative value) to year
	}))

	// add lsd apr
	const lsd = _pools.filter(
		(p) => p.category === 'Liquid Staking' && p.exposure === 'single' && p.project !== 'stafi' && p.symbol !== 'ETH'
	)
	const lsdSymbols = [...new Set(lsd.map((p) => p.symbol))]
	_pools = _pools.map((p) => {
		let apyLsd = null
		if (
			p.category !== 'Liquid Staking' &&
			lsdSymbols.some((i) => p.symbol.includes(i)) &&
			!['curve-dex', 'olympus-dao', 'convex-finance'].includes(p.project)
		) {
			const l = p.underlyingTokens?.length
			apyLsd = lsd
				.filter((i) => p.symbol.includes(i.symbol))
				.reduce(
					// balancer takes 50% of lsd apr as fee (https://docs.balancer.fi/concepts/governance/protocol-fees.html#wrapped-token-yield-fees)
					(acc, v) => (['balancer-v2', 'aura'].includes(p.project) ? (v.apyBase * 0.5) / l + acc : v.apyBase / l + acc),
					0
				)
			apyLsd = Number.isFinite(apyLsd) ? apyLsd : null
		}

		return {
			...p,
			apyLsd,
			apyBaseIncludingLsdApy: p.apyBase + apyLsd,
			apyIncludingLsdApy: p.apy + apyLsd,
			lsdTokenOnly: !p.symbol
				.split('-')
				.map((s) => lsdSymbols.some((i) => s.includes(i)))
				.includes(false)
		}
	})

	const poolsList = []

	const chainList: Set<string> = new Set()

	const projectList: Set<string> = new Set()

	const categoryList: Set<string> = new Set()

	for (const pool of _pools) {
		// remove potential undefined on projectName
		if (pool.projectName) {
			poolsList.push(pool)
			chainList.add(pool.chain)
			if (pool.category) categoryList.add(pool.category)
			projectList.add(pool.projectName)
		}
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

	const symbols = [...new Set(_pools.map((p) => p.symbol.split(' ')[0].split('-')).flat())]

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
		evmChains: Array.from(evmChainsSet)
	}
}
