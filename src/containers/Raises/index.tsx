import * as React from 'react'
import { useRouter } from 'next/router'
import { Announcement } from '~/components/Announcement'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { ILineAndBarChartProps } from '~/components/ECharts/types'
import { RaisesFilters } from '~/containers/Raises/Filters'
import Layout from '~/layout'
import { formattedNum } from '~/utils'
import { prepareRaisesCsv } from './download'
import { useRaisesData } from './hooks'
import { RaisesTable } from './RaisesTable'

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

const RaisesContainer = ({ raises, investors, rounds, sectors, chains, investorName }) => {
	const { pathname } = useRouter()

	const {
		filteredRaisesList,
		selectedInvestors,
		selectedRounds,
		selectedChains,
		selectedSectors,
		totalAmountRaised,
		monthlyInvestmentChart
	} = useRaisesData({
		raises,
		investors,
		rounds,
		sectors,
		chains
	})

	const prepareCsv = React.useCallback(() => {
		return prepareRaisesCsv({ raises: filteredRaisesList })
	}, [filteredRaisesList])

	return (
		<Layout
			title={`Raises - DefiLlama`}
			description={`Track recent raises, total funding amount, and total funding rounds on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`recent raises, total funding amount, total funding rounds`}
			canonicalUrl={`/raises`}
			pageName={['Raises Overview']}
		>
			<Announcement notCancellable>
				<span>Are we missing any funding round?</span>{' '}
				<a
					href="https://airtable.com/shrON6sFMgyFGulaq"
					className="font-medium text-(--blue) underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
				<br />
				<span>Are you a VC and want to submit your investments in bulk? Email them to us at support@defillama.com</span>
			</Announcement>
			<RaisesFilters
				header={investorName ? `${investorName} raises` : 'Raises'}
				rounds={rounds}
				selectedRounds={selectedRounds}
				sectors={sectors}
				selectedSectors={selectedSectors}
				investors={investors}
				selectedInvestors={selectedInvestors}
				chains={chains}
				selectedChains={selectedChains}
				pathname={pathname}
			/>

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Total Funding Rounds</span>
						<span className="font-jetbrains text-2xl font-semibold">{filteredRaisesList.length}</span>
					</p>
					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Total Funding Amount</span>
						<span className="font-jetbrains text-2xl font-semibold">${formattedNum(totalAmountRaised)}</span>
					</p>
					<CSVDownloadButton prepareCsv={prepareCsv} smol className="mt-auto mr-auto" />
				</div>

				<div className="col-span-2 min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<React.Suspense fallback={<></>}>
						<LineAndBarChart charts={monthlyInvestmentChart} valueSymbol="$" groupBy="monthly" />
					</React.Suspense>
				</div>
			</div>

			<RaisesTable raises={filteredRaisesList} prepareCsv={prepareCsv} />
		</Layout>
	)
}

export default RaisesContainer
