import { writeFileSync } from 'node:fs'
import {
	ACTIVE_USERS_API,
	DIMENISIONS_OVERVIEW_API,
	HACKS_API,
	LIQUIDITY_API,
	NFT_MARKETPLACES_STATS_API,
	PROTOCOLS_API,
	PROTOCOLS_EXPENSES_API,
	PROTOCOLS_TREASURY,
	RAISES_API
} from '~/constants'

export const slug = (tokenName = '') => tokenName?.toLowerCase().split(' ').join('-').split("'").join('')

const finalProtocols = {}

const tvlData = await fetch(PROTOCOLS_API).then((res) => res.json())
const nameToId = {}
for (const protocol of tvlData.protocols) {
	nameToId[protocol.defillamaId] = protocol.name

	finalProtocols[protocol.defillamaId] = {
		tvl: protocol.tvl !== null ? true : false,
		...(protocol.governanceID ? { governance: true } : {})
	}

	if (protocol.parentProtocol && protocol.tvl !== null) {
		finalProtocols[protocol.parentProtocol] = {
			...finalProtocols[protocol.parentProtocol],
			tvl: true
		}
	}
}
for (const protocol of tvlData.parentProtocols) {
	nameToId[protocol.id] = protocol.name

	finalProtocols[protocol.id] = {
		...finalProtocols[protocol.id],
		...(protocol.governanceID ? { governance: true } : {})
	}
}

const expensesData = await fetch(PROTOCOLS_EXPENSES_API).then((res) => res.json())
for (const protocol of expensesData) {
	finalProtocols[protocol.protocolId] = {
		...finalProtocols[protocol.protocolId],
		expenses: true
	}
}

const treasuryData = await fetch(PROTOCOLS_TREASURY).then((res) => res.json())
for (const protocol of treasuryData) {
	finalProtocols[protocol.id.split('-treasury')[0]] = {
		...finalProtocols[protocol.id.split('-treasury')[0]],
		treasury: true
	}
}

// todo YIELD_POOLS_API & YIELD_CONFIG_API

const liquidityData = await fetch(LIQUIDITY_API).then((res) => res.json())
for (const protocol of liquidityData) {
	finalProtocols[protocol.id] = {
		...finalProtocols[protocol.id],
		liquidity: true
	}
}

// todo forks api

const hacksData = await fetch(HACKS_API).then((res) => res.json())
for (const protocol of hacksData) {
	if (protocol.defillamaId) {
		finalProtocols[protocol.defillamaId.toString()] = {
			...finalProtocols[protocol.defillamaId.toString()],
			hacks: true
		}
	}
}

const nftMarketplacesData = await fetch(NFT_MARKETPLACES_STATS_API).then((res) => res.json())
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

const raisesData = await fetch(RAISES_API).then((res) => res.json())
for (const raise of raisesData.raises) {
	if (raise.defillamaId && !raise.defillamaId.startsWith('chain')) {
		finalProtocols[raise.defillamaId] = {
			...finalProtocols[raise.defillamaId],
			raises: true
		}
	}
}

const activeUsersData = await fetch(ACTIVE_USERS_API).then((res) => res.json())
for (const protocol in activeUsersData) {
	if (!protocol.startsWith('chain')) {
		finalProtocols[protocol] = {
			...finalProtocols[protocol],
			activeUsers: true
		}
	}
}

const feesData = await fetch(
	`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
).then((res) => res.json())
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

const revenueData = await fetch(
	`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyRevenue`
).then((res) => res.json())
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

const volumeData = await fetch(
	`${DIMENISIONS_OVERVIEW_API}/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
).then((res) => res.json())
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

const derivativesData = await fetch(
	`${DIMENISIONS_OVERVIEW_API}/derivatives?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
).then((res) => res.json())
for (const protocol of derivativesData.protocols) {
	finalProtocols[protocol.defillamaId] = {
		...finalProtocols[protocol.defillamaId],
		derivatives: true
	}

	if (protocol.parentProtocol) {
		finalProtocols[protocol.parentProtocol] = {
			...finalProtocols[protocol.parentProtocol],
			derivatives: true
		}
	}
}

const aggregatorsData = await fetch(
	`${DIMENISIONS_OVERVIEW_API}/aggregators?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
).then((res) => res.json())
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

const optionsData = await fetch(
	`${DIMENISIONS_OVERVIEW_API}/options?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
).then((res) => res.json())
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

const aggregatorDerivativesData = await fetch(
	`${DIMENISIONS_OVERVIEW_API}/aggregator-derivatives?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
).then((res) => res.json())
for (const protocol of aggregatorDerivativesData.protocols) {
	finalProtocols[protocol.defillamaId] = {
		...finalProtocols[protocol.defillamaId],
		aggregatorDerivatives: true
	}

	if (protocol.parentProtocol) {
		finalProtocols[protocol.parentProtocol] = {
			...finalProtocols[protocol.parentProtocol],
			aggregatorDerivatives: true
		}
	}
}

const emmissionsData = await fetch(`https://defillama-datasets.llama.fi/emissionsProtocolsList`).then((res) =>
	res.json()
)
for (const protocol of Object.entries(nameToId)) {
	if (emmissionsData.includes(slug(protocol[1] as string))) {
		finalProtocols[protocol[0]] = {
			...finalProtocols[protocol[0]],
			emissions: true
		}
	}
}

writeFileSync(`./metadata/protocols.json`, JSON.stringify(finalProtocols, null, 4), 'utf8')

console.log('finished building protocol metadata')
