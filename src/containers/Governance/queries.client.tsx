import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'
import type {
	GovernanceActivityRow,
	GovernanceDataEntry,
	GovernanceMaxVotesRow,
	GovernanceProposal,
	GovernanceStats,
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
	scores?: number[] | null
	choices?: string[] | null
	scores_total: number
	score_curve?: number
}

type RawGovernanceResponse = {
	metadata?: Record<string, unknown> | null
	stats?: {
		chainName?: string
		proposalsCount?: number
		successfulProposals?: number
		proposalsInLast30Days?: number
		propsalsInLast30Days?: number
		successfulProposalsInLast30Days?: number
		successfulPropsalsInLast30Days?: number
		highestTotalScore?: number
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
	proposals?: RawProposal[] | Record<string, RawProposal>
}

function normalizeGovernanceStats(stats: RawGovernanceResponse['stats']): GovernanceStats | null {
	if (!stats) return null

	return {
		chainName: typeof stats.chainName === 'string' ? stats.chainName : undefined,
		proposalsCount: typeof stats.proposalsCount === 'number' ? stats.proposalsCount : undefined,
		successfulProposals: typeof stats.successfulProposals === 'number' ? stats.successfulProposals : undefined,
		proposalsInLast30Days:
			typeof stats.proposalsInLast30Days === 'number'
				? stats.proposalsInLast30Days
				: typeof stats.propsalsInLast30Days === 'number'
					? stats.propsalsInLast30Days
					: undefined,
		successfulProposalsInLast30Days:
			typeof stats.successfulProposalsInLast30Days === 'number'
				? stats.successfulProposalsInLast30Days
				: typeof stats.successfulPropsalsInLast30Days === 'number'
					? stats.successfulPropsalsInLast30Days
					: undefined,
		highestTotalScore: typeof stats.highestTotalScore === 'number' ? stats.highestTotalScore : undefined
	}
}

export async function fetchAndFormatGovernanceData(apis: Array<string> | null): Promise<GovernanceDataEntry[]> {
	if (!apis) return []

	const data = await Promise.allSettled(
		apis.map((gapi) =>
			fetchJson<RawGovernanceResponse>(gapi).then((raw) => {
				const { proposals, activity, maxVotes } = formatGovernanceData(raw)

				return {
					metadata: (raw.metadata as GovernanceDataEntry['metadata']) ?? null,
					stats: normalizeGovernanceStats(raw.stats),
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
	const scores = (proposal.scores ?? []).filter((score): score is number => Number.isFinite(score))
	const choices = Array.isArray(proposal.choices) ? proposal.choices : []
	const winningScore = scores.length > 0 ? Math.max(...scores) : undefined
	const winningIndex = winningScore != null ? scores.findIndex((score) => score === winningScore) : -1
	const totalVotes = scores.reduce((acc, curr) => acc + curr, 0)

	return {
		...proposal,
		scores,
		choices,
		totalVotes,
		winningChoice: winningIndex >= 0 ? (choices[winningIndex] ?? '') : '',
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
	const rawProposals = data?.proposals

	if (Array.isArray(rawProposals)) {
		for (const proposal of rawProposals) {
			proposals.push(processProposal(proposal))
		}
	} else if (rawProposals != null && typeof rawProposals === 'object') {
		for (const [, proposal] of Object.entries(rawProposals)) {
			proposals.push(processProposal(proposal))
		}
	}

	const activity: GovernanceActivityRow[] = []
	const maxVotes: GovernanceMaxVotesRow[] = []
	const statsMonths = data.stats?.months ?? {}
	for (const [date, values] of Object.entries(statsMonths)) {
		const timestamp = Math.floor(new Date(date).getTime() / 1000)
		if (!Number.isFinite(timestamp)) continue

		activity.push({
			date: timestamp,
			Total: values.total ?? 0,
			Successful: values.successful ?? 0
		})

		let maxVotesValue = 0
		for (const proposalId of Array.isArray(values.proposals) ? values.proposals : []) {
			const votes = proposals.find((p) => p.id === proposalId)?.totalVotes ?? 0
			if (votes > maxVotesValue) {
				maxVotesValue = votes
			}
		}

		maxVotes.push({
			date: timestamp,
			'Max Votes': maxVotesValue.toFixed(2)
		})
	}

	return { maxVotes, activity, proposals }
}
