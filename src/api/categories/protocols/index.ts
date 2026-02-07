import {
	ETF_FLOWS_API,
	ETF_SNAPSHOT_API,
	LSD_RATES_API,
	PROTOCOL_API,
	PROTOCOLS_API,
	YIELD_POOLS_API
} from '~/constants'
import { getNDistinctColors, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { BasicPropsToKeep, formatProtocolsData } from './utils'

// - used in /airdrops, /protocols, /recent, /top-gainers-and-losers, /top-protocols, /watchlist
export async function getSimpleProtocolsPageData(propsToKeep?: BasicPropsToKeep) {
	const { protocols, chains, parentProtocols } = await fetchJson(PROTOCOLS_API)

	const filteredProtocols = formatProtocolsData({
		protocols,
		protocolProps: propsToKeep
	})

	return { protocols: filteredProtocols, chains, parentProtocols }
}

// - used in /lsd
export async function getLSDPageData() {
	const [{ protocols }, { data: pools }, lsdRates] = await Promise.all([
		fetchJson(PROTOCOLS_API),
		fetchJson(YIELD_POOLS_API),
		fetchJson(LSD_RATES_API)
	])

	// filter for LSDs
	const lsdProtocols = protocols
		.filter((p) => p.category === 'Liquid Staking' && p.chains.includes('Ethereum'))
		.map((p) => p.name)
		.filter((p) => !['StakeHound', 'Genius', 'SharedStake', 'VaultLayer'].includes(p))
		.concat('Crypto.com Liquid Staking')

	// get historical data
	const lsdProtocolsSlug = lsdProtocols.map((p) => slug(p))
	const lsdProtocolsSlugSet = new Set(lsdProtocolsSlug)
	const history = await Promise.all(lsdProtocolsSlug.map((p) => fetchJson(`${PROTOCOL_API}/${p}`)))

	let lsdApy = pools
		.filter((p) => lsdProtocolsSlugSet.has(p.project) && p.chain === 'Ethereum' && p.symbol.includes('ETH'))
		.concat(pools.find((i) => i.project === 'crypto.com-staked-eth'))
		.filter(Boolean)
		.map((p) => ({
			...p,
			name: p.project
				.split('-')
				.map((i) =>
					i === 'stakewise' ? 'StakeWise' : i === 'eth' ? i.toUpperCase() : i.charAt(0).toUpperCase() + i.slice(1)
				)
				.join(' ')
		}))
	lsdApy = lsdApy.map((p) => ({
		...p,
		name:
			p.project === 'binance-staked-eth'
				? 'Binance staked ETH'
				: p.project === 'bedrock-unieth'
					? 'Bedrock uniETH'
					: p.project === 'mantle-staked-eth'
						? 'Mantle Staked ETH'
						: p.project === 'dinero-(pirex-eth)'
							? 'Dinero (Pirex ETH)'
							: p.project === 'mev-protocol'
								? 'MEV Protocol'
								: p.project === 'crypto.com-staked-eth'
									? 'Crypto.com Liquid Staking'
									: p.project === 'dinero-(pxeth)'
										? 'Dinero (pxETH)'
										: p.name
	}))

	const nameGeckoMapping = {}
	for (const p of history) {
		nameGeckoMapping[p.name] = p.name === 'Frax Ether' ? 'frax-share' : p.gecko_id
	}

	const allColors = getNDistinctColors(lsdProtocols.length)
	const colors: Record<string, string> = {}
	for (let i = 0; i < lsdProtocols.length; i++) {
		colors[lsdProtocols[i]] = allColors[i]
	}
	colors['Others'] = '#AAAAAA'

	return {
		props: {
			chartData: history,
			lsdColors: colors,
			lsdRates,
			nameGeckoMapping,
			lsdApy
		}
	}
}

interface AssetTotals {
	[key: string]: {
		aum: number
		flows: number
	}
}

export async function getETFData() {
	const [snapshot, flows] = await Promise.all([ETF_SNAPSHOT_API, ETF_FLOWS_API].map((url) => fetchJson(url)))

	const maxDate = Math.max(...flows.map((item) => new Date(item.day).getTime()))

	const formattedDate = new Date(maxDate).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	})

	const processedSnapshot = snapshot
		.map((i) => ({
			...i,
			chain: [i.asset.charAt(0).toUpperCase() + i.asset.slice(1)]
		}))
		.sort((a, b) => b.flows - a.flows)

	const processedFlows = flows.reduce((acc, { gecko_id, day, total_flow_usd }) => {
		const timestamp = Math.floor(new Date(day).getTime() / 1000 / 86400) * 86400
		acc[timestamp] = {
			date: timestamp,
			...acc[timestamp],
			[gecko_id.charAt(0).toUpperCase() + gecko_id.slice(1)]: total_flow_usd
		}
		return acc
	}, {})

	const totalsByAsset = processedSnapshot.reduce((acc: AssetTotals, item) => {
		acc[item.asset.toLowerCase()] = {
			aum: (acc[item.asset.toLowerCase()]?.aum || 0) + item.aum,
			flows: (acc[item.asset.toLowerCase()]?.flows || 0) + item.flows
		}
		return acc
	}, {})

	return {
		snapshot: processedSnapshot,
		flows: processedFlows,
		totalsByAsset,
		lastUpdated: formattedDate
	}
}

export async function getAirdropDirectoryData() {
	const airdrops = await fetchJson('https://airdrops.llama.fi/config')

	const now = Date.now()
	const result: Array<{ endTime?: number; isActive: boolean; page?: string }> = []
	for (const key in airdrops) {
		const i = airdrops[key] as { endTime?: number; isActive: boolean; page?: string }
		if (i.isActive === false || !i.page) continue
		if (!i.endTime || (i.endTime < 1e12 ? i.endTime * 1000 > now : i.endTime > now)) {
			result.push(i)
		}
	}
	return result
}

export function formatGovernanceData(data: {
	proposals: Array<{ scores: Array<number>; choices: Array<string>; id: string }>
	stats: {
		months: {
			[date: string]: {
				total?: number
				successful?: number
				proposals: Array<string>
			}
		}
	}
}) {
	const proposals: Array<{
		scores: Array<number>
		choices: Array<string>
		id: string
		totalVotes: number
		winningChoice: string
		winningPerc: string
	}> = []
	if (Array.isArray(data.proposals)) {
		for (const proposal of data.proposals) {
			const winningScore = proposal.scores.length > 0 ? Math.max(...proposal.scores) : undefined
			const totalVotes = proposal.scores.reduce((acc, curr) => (acc += curr), 0)
			proposals.push({
				...proposal,
				totalVotes,
				winningChoice: winningScore ? proposal.choices[proposal.scores.findIndex((x) => x === winningScore)] : '',
				winningPerc:
					totalVotes && winningScore ? `(${Number(((winningScore / totalVotes) * 100).toFixed(2))}% of votes)` : ''
			})
		}
	} else {
		for (const proposalAddress in data.proposals as Record<string, any>) {
			const proposal = data.proposals[proposalAddress] as { scores: Array<number>; choices: Array<string>; id: string }
			const winningScore = proposal.scores.length > 0 ? Math.max(...proposal.scores) : undefined
			const totalVotes = proposal.scores.reduce((acc, curr) => (acc += curr), 0)
			proposals.push({
				...proposal,
				totalVotes,
				winningChoice: winningScore ? proposal.choices[proposal.scores.findIndex((x) => x === winningScore)] : '',
				winningPerc:
					totalVotes && winningScore ? `(${Number(((winningScore / totalVotes) * 100).toFixed(2))}% of votes)` : ''
			})
		}
	}

	const activity: Array<{ date: number; Total: number; Successful: number }> = []
	const maxVotes: Array<{ date: number; 'Max Votes': string }> = []
	const statsMonths = data.stats.months || {}
	for (const date in statsMonths) {
		const values = statsMonths[date]
		activity.push({
			date: Math.floor(new Date(date).getTime() / 1000),
			Total: values.total || 0,
			Successful: values.successful || 0
		})
		let maxVotesValue = 0
		for (const proposal of values.proposals ?? []) {
			const votes = proposals.find((p) => p.id === proposal)?.totalVotes ?? 0
			if (votes > maxVotesValue) {
				maxVotesValue = votes
			}
		}
		maxVotes.push({
			date: Math.floor(new Date(date).getTime() / 1000),
			'Max Votes': maxVotesValue.toFixed(2)
		})
	}

	return { maxVotes, activity, proposals }
}
