import { IncomeStatement } from '~/containers/ProtocolOverview/IncomeStatement'
import type { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'

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
			titleClassName="scroll-mt-4 text-xl font-bold"
		/>
	)
}
