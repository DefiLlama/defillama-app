import * as React from 'react'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { TagGroup } from '~/components/TagGroup'
import { TokenLogo } from '~/components/TokenLogo'
import { CHART_COLORS } from '~/constants/colors'
import { GovernanceTable } from '~/containers/Governance/GovernanceTable'
import { chainIconUrl, formattedNum, tokenIconUrl } from '~/utils'
import type { GovernanceDataEntry, GovernanceType } from './types'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

const EMPTY_ACTIVITY_DATASET: MultiSeriesChart2Dataset = {
	source: [],
	dimensions: ['timestamp', 'Total', 'Successful']
}
const EMPTY_MAXVOTES_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp', 'Max Votes'] }

const ACTIVITY_CHARTS: IMultiSeriesChart2Props['charts'] = [
	{ type: 'bar', name: 'Total', encode: { x: 'timestamp', y: 'Total' }, color: CHART_COLORS[0] },
	{ type: 'bar', name: 'Successful', encode: { x: 'timestamp', y: 'Successful' }, color: CHART_COLORS[1] }
]

const MAX_VOTES_CHARTS: IMultiSeriesChart2Props['charts'] = [
	{ type: 'bar', name: 'Max Votes', encode: { x: 'timestamp', y: 'Max Votes' }, color: CHART_COLORS[2] }
]

type GovernanceTypeLabel = 'Snapshot' | 'Compound' | 'Tally'

function governanceTypeToLabel(t: string): GovernanceTypeLabel {
	return t === 'snapshot' ? 'Snapshot' : t === 'compound' ? 'Compound' : 'Tally'
}

interface GovernanceProjectProps {
	projectName: string
	governanceData: GovernanceDataEntry[]
	governanceTypes: GovernanceType[]
	initialCategoryIndex?: number
}

export default function GovernanceProject({
	projectName,
	governanceData,
	governanceTypes,
	initialCategoryIndex = 0
}: GovernanceProjectProps) {
	const [categoryIndex, setCategoryIndex] = React.useState(initialCategoryIndex)

	const categoryLabels = React.useMemo<GovernanceTypeLabel[]>(
		() => (governanceTypes ?? []).map(governanceTypeToLabel),
		[governanceTypes]
	)

	const data = governanceData?.[categoryIndex]
	const governanceType = governanceTypes?.[categoryIndex]

	const filters =
		categoryLabels.length > 1 ? (
			<TagGroup
				selectedValue={categoryLabels[categoryIndex] ?? categoryLabels[0]}
				setValue={(value) => setCategoryIndex(categoryLabels.indexOf(value as GovernanceTypeLabel))}
				values={categoryLabels}
				className="ml-auto"
			/>
		) : null

	const activityDataset = React.useMemo<MultiSeriesChart2Dataset>(() => {
		const source = (data?.activity ?? []).map((row) => ({
			timestamp: Number(row.date) * 1e3,
			Total: row.Total ?? 0,
			Successful: row.Successful ?? 0
		}))
		return { source, dimensions: ['timestamp', 'Total', 'Successful'] }
	}, [data?.activity])

	const maxVotesDataset = React.useMemo<MultiSeriesChart2Dataset>(() => {
		const source = (data?.maxVotes ?? []).map((row) => ({
			timestamp: Number(row.date) * 1e3,
			'Max Votes': row['Max Votes'] == null ? 0 : Number(row['Max Votes'])
		}))
		return { source, dimensions: ['timestamp', 'Max Votes'] }
	}, [data?.maxVotes])

	const name = data?.metadata?.name ?? projectName

	return (
		<>
			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<TokenLogo logo={tokenIconUrl(name)} />
					<h1 className="text-xl font-semibold">{name}</h1>
					{filters}
				</div>

				{data?.stats?.chainName != null ||
				data?.stats?.proposalsCount != null ||
				data?.stats?.successfulProposals != null ||
				data?.stats?.propsalsInLast30Days != null ||
				data?.stats?.successfulPropsalsInLast30Days != null ||
				data?.stats?.highestTotalScore != null ||
				data?.metadata?.followersCount != null ? (
					<div className="flex min-h-[46px] w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-4 py-3">
						{data?.stats?.chainName != null ? (
							<div className="flex items-center gap-1.5">
								<span className="text-sm text-(--text-label)">Chain</span>
								<span className="flex items-center gap-1 text-sm font-medium">
									<TokenLogo logo={chainIconUrl(data.stats.chainName)} size={20} />
									<span>{data.stats.chainName}</span>
								</span>
							</div>
						) : null}

						{data?.stats?.proposalsCount != null ? (
							<div className="flex items-baseline gap-1.5">
								<span className="text-sm text-(--text-label)">Total Proposals</span>
								<span className="text-sm font-medium tabular-nums">{data.stats.proposalsCount}</span>
							</div>
						) : null}

						{data?.stats?.successfulProposals != null ? (
							<div className="flex items-baseline gap-1.5">
								<span className="text-sm text-(--text-label)">Successful</span>
								<span className="text-sm font-medium tabular-nums">{data.stats.successfulProposals}</span>
							</div>
						) : null}

						{data?.stats?.propsalsInLast30Days != null ? (
							<div className="flex items-baseline gap-1.5">
								<span className="text-sm text-(--text-label)">Proposals (30d)</span>
								<span className="text-sm font-medium tabular-nums">{data.stats.propsalsInLast30Days}</span>
							</div>
						) : null}

						{data?.stats?.successfulPropsalsInLast30Days != null ? (
							<div className="flex items-baseline gap-1.5">
								<span className="text-sm text-(--text-label)">Successful (30d)</span>
								<span className="text-sm font-medium tabular-nums">{data.stats.successfulPropsalsInLast30Days}</span>
							</div>
						) : null}

						{data?.stats?.highestTotalScore != null ? (
							<div className="flex items-baseline gap-1.5">
								<span className="text-sm text-(--text-label)">Max Total Votes</span>
								<span className="text-sm font-medium tabular-nums">{formattedNum(data.stats.highestTotalScore)}</span>
							</div>
						) : null}

						{data?.metadata?.followersCount != null ? (
							<div className="flex items-baseline gap-1.5">
								<span className="text-sm text-(--text-label)">Followers</span>
								<span className="text-sm font-medium tabular-nums">{formattedNum(data.metadata.followersCount)}</span>
							</div>
						) : null}
					</div>
				) : null}

				<div className="grid grid-cols-2 gap-2">
					<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<React.Suspense fallback={<div className="min-h-[398px]" />}>
							<MultiSeriesChart2
								title="Activity"
								dataset={activityDataset?.source?.length > 0 ? activityDataset : EMPTY_ACTIVITY_DATASET}
								charts={ACTIVITY_CHARTS}
								valueSymbol=""
								exportButtons={{ png: true, csv: true }}
							/>
						</React.Suspense>
					</div>
					<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<React.Suspense fallback={<div className="min-h-[398px]" />}>
							<MultiSeriesChart2
								title="Max Votes"
								dataset={maxVotesDataset?.source?.length > 0 ? maxVotesDataset : EMPTY_MAXVOTES_DATASET}
								charts={MAX_VOTES_CHARTS}
								valueSymbol=""
								exportButtons={{ png: true, csv: true }}
							/>
						</React.Suspense>
					</div>
				</div>
			</div>
			{data != null ? <GovernanceTable data={data} governanceType={governanceType} /> : null}
		</>
	)
}
