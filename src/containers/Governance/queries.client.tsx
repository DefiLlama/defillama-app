import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'
import type {
	GovernanceActivityRow,
	GovernanceDataEntry,
	GovernanceMaxVotesRow,
	GovernanceProposal,
	GovernanceType
} from './types'

type RawProposal = {
	id: string
	title: string
	state: string
	link: string
	discussion: string
	start: number
	end: number
	scores: number[]
	choices: string[]
	scores_total: number
	score_curve?: number
}

type RawGovernanceResponse = {
	metadata?: Record<string, unknown> | null
	stats?: {
		months?: Record<
			string,
			{
				total?: number
				successful?: number
				proposals: string[]
			}
		>
		[key: string]: unknown
	} | null
	proposals: RawProposal[] | Record<string, RawProposal>
}

export async function fetchAndFormatGovernanceData(apis: Array<string> | null): Promise<GovernanceDataEntry[]> {
	if (!apis) return []

	const data = await Promise.allSettled(
		apis.map((gapi) =>
			fetchJson<RawGovernanceResponse>(gapi).then((raw) => {
				const { proposals, activity, maxVotes } = formatGovernanceData(raw)

				return {
					metadata: (raw.metadata as GovernanceDataEntry['metadata']) ?? null,
					stats: (raw.stats as GovernanceDataEntry['stats']) ?? null,
					proposals,
					controversialProposals: [...proposals]
						.sort((a, b) => (b.score_curve ?? 0) - (a.score_curve ?? 0))
						.slice(0, 10),
					activity,
					maxVotes
				}
			})
		)
	)

	const results: GovernanceDataEntry[] = []
	for (const item of data) {
		if (item.status === 'fulfilled') results.push(stripUndefined(item.value))
	}
	return results
}

export function getGovernanceTypeFromApi(apiUrl: string): GovernanceType {
	return apiUrl.includes('governance-cache/snapshot')
		? 'snapshot'
		: apiUrl.includes('governance-cache/compound')
			? 'compound'
			: 'tally'
}

export const useFetchProtocolGovernanceData = (governanceApis: Array<string> | null) => {
	const isEnabled = governanceApis != null && governanceApis.length > 0
	return useQuery({
		queryKey: ['protocol-governance', JSON.stringify(governanceApis), isEnabled],
		queryFn: isEnabled ? () => fetchAndFormatGovernanceData(governanceApis) : () => Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})
}

function stripUndefined<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj)) as T
}

function processProposal(proposal: RawProposal): GovernanceProposal {
	const winningScore = proposal.scores.length > 0 ? Math.max(...proposal.scores) : undefined
	const totalVotes = proposal.scores.reduce((acc, curr) => acc + curr, 0)
	return {
		...proposal,
		totalVotes,
		winningChoice: winningScore != null ? (proposal.choices[proposal.scores.findIndex((x) => x === winningScore)] ?? '') : '',
		winningPerc:
			totalVotes !== 0 && winningScore != null ? `(${Number(((winningScore / totalVotes) * 100).toFixed(2))}% of votes)` : ''
	}
}

export function formatGovernanceData(data: RawGovernanceResponse): {
	proposals: GovernanceProposal[]
	activity: GovernanceActivityRow[]
	maxVotes: GovernanceMaxVotesRow[]
} {
	const proposals: GovernanceProposal[] = []
	if (Array.isArray(data.proposals)) {
		for (const proposal of data.proposals) {
			proposals.push(processProposal(proposal))
		}
	} else {
		for (const [, proposal] of Object.entries(data.proposals)) {
			proposals.push(processProposal(proposal))
		}
	}

	const activity: GovernanceActivityRow[] = []
	const maxVotes: GovernanceMaxVotesRow[] = []
	const statsMonths = data.stats?.months ?? {}
	for (const [date, values] of Object.entries(statsMonths)) {
		activity.push({
			date: Math.floor(new Date(date).getTime() / 1000),
			Total: values.total ?? 0,
			Successful: values.successful ?? 0
		})
		let maxVotesValue = 0
		for (const proposalId of values.proposals ?? []) {
			const votes = proposals.find((p) => p.id === proposalId)?.totalVotes ?? 0
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
