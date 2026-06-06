import type { getProtocolIncomeStatement } from '~/containers/ProtocolOverview/queries'
import type { ITokenRightsData } from '~/containers/TokenRights/api.types'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import type { TokenBorrowRoutesResponse } from './tokenBorrowRoutes.types'
import type { TokenOverviewData } from './tokenOverview'
import type { TokenRiskResponse } from './tokenRisk.types'
import type { RiskTimelineResponse } from './tokenRiskTimeline.types'

export type TokenIncomeStatementData = NonNullable<Awaited<ReturnType<typeof getProtocolIncomeStatement>>>

export type TokenBorrowRoutesCounts = {
	borrowAsCollateral: number
	borrowAsDebt: number
}

export type TokenBorrowRoutesChainLists = {
	borrowAsCollateral: string[]
	borrowAsDebt: string[]
}

export type TokenYieldsHydration = {
	rows: IYieldTableRow[]
	rowCount: number
	chainList: string[]
	tokensList: string[]
	pageSize: number
}

export type TokenBorrowRoutesHydration = {
	data: TokenBorrowRoutesResponse
	counts: TokenBorrowRoutesCounts
	chainLists: TokenBorrowRoutesChainLists
	pageSize: number
}

export type TokenIssuer = {
	name: string
	slug: string
}

export type TokenPageSection =
	| {
			id: 'token-overview'
			label: 'Overview'
			overview: TokenOverviewData
			geckoId: string | null
			logo: string | null
			issuer: TokenIssuer | null
	  }
	| {
			id: 'token-markets'
			label: 'Markets'
			tokenSymbol: string
	  }
	| {
			id: 'token-income-statement'
			label: 'Income Statement'
			protocolName: string
			incomeStatement: TokenIncomeStatementData
			hasIncentives: boolean
	  }
	| {
			id: 'token-risks'
			label: 'Risks'
			tokenSymbol: string
			riskData: TokenRiskResponse
	  }
	| {
			id: 'token-risk-timeline'
			label: 'Risk Timeline'
			tokenSymbol: string
			timelineData: RiskTimelineResponse
	  }
	| {
			id: 'token-rights-and-value-accrual'
			label: 'Token Rights'
			name: string
			symbol: string
			tokenRightsData: ITokenRightsData
	  }
	| {
			id: 'token-usage'
			label: 'Token Usage'
			tokenSymbol: string
	  }
	| {
			id: 'token-liquidations'
			label: 'Liquidations'
			tokenSymbol: string
	  }
	| {
			id: 'token-unlocks'
			label: 'Unlocks'
			resolvedUnlocksSlug: string
	  }
	| {
			id: 'token-yields'
			label: 'Yields'
			tokenSymbol: string
			hydration: TokenYieldsHydration
	  }
	| {
			id: 'token-borrow'
			label: 'Borrow'
			tokenSymbol: string
			hydration: TokenBorrowRoutesHydration
	  }

export type TokenPageSectionId = TokenPageSection['id']

export type TokenPageProps = {
	seoTitle: string
	seoDescription: string
	canonicalUrl: string
	sections: TokenPageSection[]
}
