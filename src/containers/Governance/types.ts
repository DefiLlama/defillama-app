export type GovernanceType = 'snapshot' | 'compound' | 'tally'

export interface GovernanceProposal {
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
	totalVotes: number
	winningChoice: string
	winningPerc: string
}

export interface GovernanceActivityRow {
	date: number
	Total: number
	Successful: number
}

export interface GovernanceMaxVotesRow {
	date: number
	'Max Votes': string
}

export interface GovernanceStats {
	chainName?: string
	proposalsCount?: number
	successfulProposals?: number
	proposalsInLast30Days?: number
	successfulProposalsInLast30Days?: number
	highestTotalScore?: number
}

export interface GovernanceMetadata {
	name?: string
	followersCount?: number
}

export interface GovernanceDataEntry {
	metadata: GovernanceMetadata | null
	stats: GovernanceStats | null
	proposals: GovernanceProposal[]
	controversialProposals: GovernanceProposal[]
	activity: GovernanceActivityRow[]
	maxVotes: GovernanceMaxVotesRow[]
}

export interface GovernanceOverviewItem {
	name: string
	proposalsCount: string
	followersCount: string
	strategyCount: string
	successfulProposals?: number
	states: Record<string, number>
	months: Record<string, { proposals: string[]; states: { active?: number; closed?: number } }>
	proposalsInLast30Days: number
	successfulProposalsInLast30Days: number
	subRowData: Record<string, number>
}
