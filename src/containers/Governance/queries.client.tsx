import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export async function fetchAndFormatGovernanceData(apis: Array<string> | null) {
	if (!apis) return []

	const data = await Promise.allSettled(
		apis.map((gapi) =>
			fetchJson(gapi).then((raw) => {
				const { proposals, activity, maxVotes } = formatGovernanceData(raw as any)

				return {
					metadata: raw.metadata ?? null,
					stats: raw.stats ?? null,
					proposals,
					controversialProposals: proposals
						.sort((a, b) => (b['score_curve'] || 0) - (a['score_curve'] || 0))
						.slice(0, 10),
					activity,
					maxVotes
				}
			})
		)
	)

	const results = []
	for (const item of data) {
		if (item.status === 'fulfilled') results.push(stripUndefined(item.value))
	}
	return results
}

export function getGovernanceTypeFromApi(apiUrl: string) {
	return apiUrl.includes('governance-cache/snapshot')
		? 'snapshot'
		: apiUrl.includes('governance-cache/compound')
			? 'compound'
			: 'tally'
}

export const useFetchProtocolGovernanceData = (governanceApis: Array<string> | null) => {
	const isEnabled = !!governanceApis && governanceApis.length > 0
	return useQuery({
		queryKey: ['protocol-governance', JSON.stringify(governanceApis), isEnabled],
		queryFn: isEnabled ? () => fetchAndFormatGovernanceData(governanceApis) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

function stripUndefined<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj))
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
