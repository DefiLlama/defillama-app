import { writeFileSync } from 'node:fs'
import {
	ACTIVE_USERS_API,
	BRIDGES_API,
	CHAINS_API,
	CHAINS_ASSETS,
	DIMENISIONS_OVERVIEW_API,
	HACKS_API,
	LIQUIDITY_API,
	NFT_MARKETPLACES_STATS_API,
	PROTOCOLS_API,
	PROTOCOLS_EXPENSES_API,
	PROTOCOLS_TREASURY,
	RAISES_API,
	YIELD_POOLS_API
} from '~/constants'
import { fetchOverCache } from '~/utils/perf'

export const slug = (tokenName = '') => tokenName?.toLowerCase().split(' ').join('-').split("'").join('')

const finalProtocols = {}
const finalChains = {}

const [
	tvlData,
	yieldsData,
	expensesData,
	treasuryData,
	liquidityData,
	hacksData,
	nftMarketplacesData,
	raisesData,
	activeUsersData,
	feesData,
	revenueData,
	volumeData,
	perpsData,
	aggregatorsData,
	optionsData,
	perpsAggregatorsData,
	bridgeAggregatorsData,
	emmissionsData,
	bridgesData,
	chainAssetsData,
	chainsData
] = await Promise.all([
	fetchOverCache(PROTOCOLS_API).then((res) => res.json()),
	fetchOverCache(YIELD_POOLS_API)
		.then((res) => res.json())
		.then((res) => res.data ?? []),
	fetchOverCache(PROTOCOLS_EXPENSES_API).then((res) => res.json()),
	fetchOverCache(PROTOCOLS_TREASURY).then((res) => res.json()),
	fetchOverCache(LIQUIDITY_API).then((res) => res.json()),
	fetchOverCache(HACKS_API).then((res) => res.json()),
	fetchOverCache(NFT_MARKETPLACES_STATS_API).then((res) => res.json()),
	fetchOverCache(RAISES_API).then((res) => res.json()),
	fetchOverCache(ACTIVE_USERS_API)
		.then((res) => res.json())
		.catch(() => ({})),
	fetchOverCache(
		`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	).then((res) => res.json()),
	fetchOverCache(
		`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyRevenue`
	).then((res) => res.json()),
	fetchOverCache(
		`${DIMENISIONS_OVERVIEW_API}/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	).then((res) => res.json()),
	fetchOverCache(
		`${DIMENISIONS_OVERVIEW_API}/derivatives?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	).then((res) => res.json()),
	fetchOverCache(
		`${DIMENISIONS_OVERVIEW_API}/aggregators?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	).then((res) => res.json()),
	fetchOverCache(
		`${DIMENISIONS_OVERVIEW_API}/options?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	).then((res) => res.json()),
	fetchOverCache(
		`${DIMENISIONS_OVERVIEW_API}/aggregator-derivatives?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	).then((res) => res.json()),
	fetchOverCache(
		`${DIMENISIONS_OVERVIEW_API}/bridge-aggregators?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
	).then((res) => res.json()),
	fetchOverCache(`https://defillama-datasets.llama.fi/emissionsProtocolsList`).then((res) => res.json()),
	fetchOverCache(`${BRIDGES_API}?includeChains=true`).then((res) => res.json()),
	fetchOverCache(CHAINS_ASSETS).then((res) => res.json()),
	fetchOverCache(CHAINS_API).then((res) => res.json())
])

for (const chain of tvlData.chains) {
	finalChains[slug(chain)] = { name: chain }
}

const nameToId = {}
const parentToChildProtocols = {}
for (const protocol of tvlData.protocols) {
	nameToId[protocol.defillamaId] = protocol.name
	const name = slug(protocol.name)
	finalProtocols[protocol.defillamaId] = {
		name,
		tvl: protocol.tvl ? true : false,
		yields: yieldsData.find((pool) => pool.project === name) ? true : false,
		...(protocol.governanceID ? { governance: true } : {})
	}

	if (protocol.parentProtocol) {
		parentToChildProtocols[protocol.parentProtocol] = [...(parentToChildProtocols[protocol.parentProtocol] ?? []), name]
		if (protocol.tvl) {
			finalProtocols[protocol.parentProtocol] = {
				...finalProtocols[protocol.parentProtocol],
				tvl: true
			}
		}
	}
}
for (const protocol of tvlData.parentProtocols) {
	nameToId[protocol.id] = protocol.name

	const name = slug(protocol.name)
	finalProtocols[protocol.id] = {
		name,
		yields: yieldsData.find(
			(pool) => pool.project === name || parentToChildProtocols[protocol.id]?.includes(pool.project)
		)
			? true
			: false,
		...finalProtocols[protocol.id],
		...(protocol.governanceID ? { governance: true } : {})
	}
}

for (const protocol of expensesData) {
	finalProtocols[protocol.protocolId] = {
		...finalProtocols[protocol.protocolId],
		expenses: true
	}
}

for (const protocol of treasuryData) {
	finalProtocols[protocol.id.split('-treasury')[0]] = {
		...finalProtocols[protocol.id.split('-treasury')[0]],
		treasury: true
	}
}

for (const protocol of liquidityData) {
	finalProtocols[protocol.id] = {
		...finalProtocols[protocol.id],
		liquidity: true
	}
}

// todo forks api

for (const protocol of hacksData) {
	if (protocol.defillamaId) {
		finalProtocols[protocol.defillamaId.toString()] = {
			...finalProtocols[protocol.defillamaId.toString()],
			hacks: true
		}
	}
}

for (const market of nftMarketplacesData) {
	const marketplaceExists = Object.entries(nameToId).find(
		(protocol) => slug(market.exchangeName) === slug(protocol[1] as string)
	) as [string, string] | undefined
	if (marketplaceExists) {
		finalProtocols[marketplaceExists[0]] = {
			...finalProtocols[marketplaceExists[0]],
			nfts: true
		}
	}
}

for (const raise of raisesData.raises) {
	if (raise.defillamaId && !raise.defillamaId.startsWith('chain')) {
		finalProtocols[raise.defillamaId] = {
			...finalProtocols[raise.defillamaId],
			raises: true
		}
	}
}

for (const protocol in activeUsersData) {
	if (protocol.startsWith('chain')) {
		const chain = Object.keys(finalChains).find((chain) => protocol === `chain#${chain.toLowerCase()}`)
		if (chain) {
			finalChains[slug(chain)] = {
				...(finalChains[slug(chain)] ?? { name: chain }),
				activeUsers: true
			}
		}
	} else {
		finalProtocols[protocol] = {
			...finalProtocols[protocol],
			activeUsers: true
		}
	}
}

for (const protocol of feesData.protocols) {
	finalProtocols[protocol.defillamaId] = {
		...finalProtocols[protocol.defillamaId],
		fees: true
	}

	if (protocol.parentProtocol) {
		finalProtocols[protocol.parentProtocol] = {
			...finalProtocols[protocol.parentProtocol],
			fees: true
		}
	}
}
for (const chain of feesData.allChains ?? []) {
	finalChains[slug(chain)] = {
		...(finalChains[slug(chain)] ?? { name: chain }),
		fees: true
	}
}

for (const protocol of revenueData.protocols) {
	finalProtocols[protocol.defillamaId] = {
		...finalProtocols[protocol.defillamaId],
		revenue: true
	}

	if (protocol.parentProtocol) {
		finalProtocols[protocol.parentProtocol] = {
			...finalProtocols[protocol.parentProtocol],
			revenue: true
		}
	}
}

for (const protocol of volumeData.protocols) {
	finalProtocols[protocol.defillamaId] = {
		...finalProtocols[protocol.defillamaId],
		dexs: true
	}

	if (protocol.parentProtocol) {
		finalProtocols[protocol.parentProtocol] = {
			...finalProtocols[protocol.parentProtocol],
			dexs: true
		}
	}
}
for (const chain of volumeData.allChains ?? []) {
	finalChains[slug(chain)] = {
		...(finalChains[slug(chain)] ?? { name: chain }),
		dexs: true
	}
}

for (const protocol of perpsData.protocols) {
	finalProtocols[protocol.defillamaId] = {
		...finalProtocols[protocol.defillamaId],
		perps: true
	}

	if (protocol.parentProtocol) {
		finalProtocols[protocol.parentProtocol] = {
			...finalProtocols[protocol.parentProtocol],
			perps: true
		}
	}
}
for (const chain of perpsData.allChains ?? []) {
	finalChains[slug(chain)] = {
		...(finalChains[slug(chain)] ?? { name: chain }),
		derivatives: true
	}
}

for (const protocol of aggregatorsData.protocols) {
	finalProtocols[protocol.defillamaId] = {
		...finalProtocols[protocol.defillamaId],
		aggregator: true
	}

	if (protocol.parentProtocol) {
		finalProtocols[protocol.parentProtocol] = {
			...finalProtocols[protocol.parentProtocol],
			aggregator: true
		}
	}
}
for (const chain of aggregatorsData.allChains ?? []) {
	finalChains[slug(chain)] = {
		...(finalChains[slug(chain)] ?? { name: chain }),
		aggregators: true
	}
}

for (const protocol of optionsData.protocols) {
	finalProtocols[protocol.defillamaId] = {
		...finalProtocols[protocol.defillamaId],
		options: true
	}

	if (protocol.parentProtocol) {
		finalProtocols[protocol.parentProtocol] = {
			...finalProtocols[protocol.parentProtocol],
			options: true
		}
	}
}
for (const chain of optionsData.allChains ?? []) {
	finalChains[slug(chain)] = {
		...(finalChains[slug(chain)] ?? { name: chain }),
		options: true
	}
}

for (const protocol of perpsAggregatorsData.protocols) {
	finalProtocols[protocol.defillamaId] = {
		...finalProtocols[protocol.defillamaId],
		perpsAggregators: true
	}

	if (protocol.parentProtocol) {
		finalProtocols[protocol.parentProtocol] = {
			...finalProtocols[protocol.parentProtocol],
			perpsAggregators: true
		}
	}
}
for (const chain of perpsAggregatorsData.allChains ?? []) {
	finalChains[slug(chain)] = {
		...(finalChains[slug(chain)] ?? { name: chain }),
		'aggregator-derivatives': true
	}
}

for (const protocol of bridgeAggregatorsData.protocols) {
	finalProtocols[protocol.defillamaId] = {
		...finalProtocols[protocol.defillamaId],
		bridgeAggregators: true
	}

	if (protocol.parentProtocol) {
		finalProtocols[protocol.parentProtocol] = {
			...finalProtocols[protocol.parentProtocol],
			bridgeAggregators: true
		}
	}
}
for (const chain of bridgeAggregatorsData.allChains ?? []) {
	finalChains[slug(chain)] = {
		...(finalChains[slug(chain)] ?? { name: chain }),
		'bridge-aggregators': true
	}
}

for (const protocol of Object.entries(nameToId)) {
	if (emmissionsData.includes(slug(protocol[1] as string))) {
		finalProtocols[protocol[0]] = {
			...finalProtocols[protocol[0]],
			emissions: true
		}
	}
}

writeFileSync(`./metadata/protocols.json`, JSON.stringify(finalProtocols, null, 4), 'utf8')

for (const chain of bridgesData.chains) {
	if (finalChains[slug(chain.name)]) {
		finalChains[slug(chain.name)] = { ...(finalChains[slug(chain.name)] ?? { name: chain.name }), inflows: true }
	}
}

for (const chain in chainAssetsData) {
	if (finalChains[slug(chain)]) {
		finalChains[slug(chain)] = { ...(finalChains[slug(chain)] ?? { name: chain }), chainAssets: true }
	}
}

for (const chain of chainsData) {
	if (finalChains[slug(chain.name)] && chain.gecko_id) {
		finalChains[slug(chain.name)] = {
			...(finalChains[slug(chain.name)] ?? { name: chain.name }),
			gecko_id: chain.gecko_id,
			tokenSymbol: chain.tokenSymbol
		}
	}
}

writeFileSync(`./metadata/chains.json`, JSON.stringify(finalChains, null, 4), 'utf8')

console.log('finished building metadata')
