import { IncomeStatement } from '~/containers/ProtocolOverview/IncomeStatement'
import type { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'

const TOKEN_INCOME_STATEMENT_SECTION_ID = 'token-income-statement'

interface TokenIncomeStatementSectionProps {
	protocolName: string
	incomeStatement: IProtocolOverviewPageData['incomeStatement'] | null | undefined
	hasIncentives?: boolean
}

export function TokenIncomeStatementSection({
	protocolName,
	incomeStatement,
	hasIncentives = false
}: TokenIncomeStatementSectionProps) {
	if (!incomeStatement?.data) return null

	return (
		<IncomeStatement
			name={protocolName}
			incomeStatement={incomeStatement}
			hasIncentives={hasIncentives}
			view="table"
			anchorId={TOKEN_INCOME_STATEMENT_SECTION_ID}
			titleClassName="scroll-mt-24 text-xl font-bold"
		/>
	)
}
