import { PROTOCOLS_API } from '~/constants'
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
