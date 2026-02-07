import type { GetStaticPropsContext } from 'next'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { formatGovernanceData } from '~/api/categories/protocols'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import {
	GOVERNANCE_COMPOUND_API,
	GOVERNANCE_SNAPSHOT_API,
	GOVERNANCE_TALLY_API,
	PROTOCOL_GOVERNANCE_COMPOUND_API,
	PROTOCOL_GOVERNANCE_SNAPSHOT_API,
	PROTOCOL_GOVERNANCE_TALLY_API
} from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { GovernanceTable } from '~/containers/ProtocolOverview/Governance'
import Layout from '~/layout'
import { chainIconUrl, formattedNum, slug, tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

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

export const getStaticProps = withPerformanceLogging(
	'governance/[project]',
	async ({ params }: GetStaticPropsContext<{ project: string }>) => {
		if (!params?.project) {
			return { notFound: true, props: null }
		}

		const project = params.project
		const [snapshot, compound, tally]: [
			{ [key: string]: { name: string; id: string } },
			{ [key: string]: { name: string; id: string } },
			{ [key: string]: { name: string; id: string } }
		] = await Promise.all([
			fetchJson(GOVERNANCE_SNAPSHOT_API),
			fetchJson(GOVERNANCE_COMPOUND_API),
			fetchJson(GOVERNANCE_TALLY_API)
		])

		const snapshotProjectId = Object.values(snapshot).find((p) => slug(p.name) === project)?.id
		const compoundProjectId = Object.values(compound).find((p) => slug(p.name) === project)?.id
		const tallyProjectId = Object.values(tally).find((p) => slug(p.name) === project)?.id

		if (!snapshotProjectId && !compoundProjectId && !tallyProjectId) {
			return { notFound: true }
		}

		let api = snapshotProjectId
			? PROTOCOL_GOVERNANCE_SNAPSHOT_API + '/' + snapshotProjectId.replace(/(:|’|')/g, '/') + '.json'
			: compoundProjectId
				? PROTOCOL_GOVERNANCE_COMPOUND_API + '/' + compoundProjectId.replace(/(:|’|')/g, '/') + '.json'
				: tallyProjectId
					? PROTOCOL_GOVERNANCE_TALLY_API + '/' + tallyProjectId.replace(/(:|’|')/g, '/') + '.json'
					: null

		if (api) {
			api = api.toLowerCase()
		}

		const data: {
			proposals: {
				[id: string]: {
					id: string
					title: string
					choices: Array<string>
					scores: Array<number>
				}
			}
			stats: {
				months: {
					[month: string]: { total: number; successful: number; proposals: Array<string> }
				}
			}
		} = await fetchJson(api)

		const recentMonth = Object.keys(data.stats.months).sort().pop()
		const missingMonths = getDateRange(recentMonth)

		for (const month of missingMonths) {
			data.stats.months[month] = { total: 0, successful: 0, proposals: [] }
		}

		const { proposals, activity, maxVotes } = formatGovernanceData(data as any)

		return {
			props: {
				data: {
					...data,
					proposals,
					controversialProposals: proposals
						.sort((a, b) => (b['score_curve'] || 0) - (a['score_curve'] || 0))
						.slice(0, 10),
					activity,
					maxVotes
				},
				governanceType: snapshotProjectId ? 'snapshot' : compoundProjectId ? 'compound' : 'tally'
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocol({ data, governanceType }) {
	const activityDataset = React.useMemo<MultiSeriesChart2Dataset>(() => {
		const source = (data?.activity ?? []).map((row: any) => ({
			timestamp: Number(row.date) * 1e3,
			Total: row.Total ?? 0,
			Successful: row.Successful ?? 0
		}))
		return { source, dimensions: ['timestamp', 'Total', 'Successful'] }
	}, [data?.activity])

	const maxVotesDataset = React.useMemo<MultiSeriesChart2Dataset>(() => {
		const source = (data?.maxVotes ?? []).map((row: any) => ({
			timestamp: Number(row.date) * 1e3,
			'Max Votes': row['Max Votes'] == null ? 0 : Number(row['Max Votes'])
		}))
		return { source, dimensions: ['timestamp', 'Max Votes'] }
	}, [data?.maxVotes])

	return (
		<Layout
			title={`${data.metadata.name} Governance - DefiLlama`}
			description={`${data.metadata.name} Governance on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${data.metadata.name} governance, governance on blockchain`}
			canonicalUrl={`/governance/${data.metadata.name}`}
		>
			<div className="relative isolate flex flex-col gap-9 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 xl:grid-cols-[auto_1fr]">
				<h1 className="flex items-center gap-2 text-xl font-semibold">
					<TokenLogo logo={tokenIconUrl(data.metadata.name)} />
					<span>{data.metadata.name}</span>
				</h1>

				<div className="flex flex-wrap justify-between gap-4">
					{data.stats.chainName ? (
						<p className="flex flex-col gap-1">
							<span className="text-sm font-semibold text-(--text-meta)">Chain</span>
							<span className="flex items-center gap-1 font-jetbrains text-lg font-semibold">
								<TokenLogo logo={chainIconUrl(data.stats.chainName)} size={32} />
								<span>{data.stats.chainName}</span>
							</span>
						</p>
					) : null}

					{data.stats.proposalsCount ? (
						<p className="flex flex-col gap-1">
							<span className="text-(--text-meta)">Total Proposals</span>
							<span className="font-jetbrains text-lg font-semibold">{data.stats.proposalsCount}</span>
						</p>
					) : null}

					{data.stats.successfulProposal ? (
						<p className="flex flex-col gap-1">
							<span className="text-(--text-meta)">Successful Proposals</span>
							<span className="font-jetbrains text-lg font-semibold">{data.stats.successfulProposals}</span>
						</p>
					) : null}

					{data.stats.propsalsInLast30Days ? (
						<p className="flex flex-col gap-1">
							<span className="text-(--text-meta)">Successful Proposals in last 30 days</span>
							<span className="font-jetbrains text-lg font-semibold">{data.stats.propsalsInLast30Days}</span>
						</p>
					) : null}

					{data.stats.highestTotalScore ? (
						<p className="flex flex-col gap-1">
							<span className="text-(--text-meta)">Max Total Votes</span>
							<span className="font-jetbrains text-lg font-semibold">{formattedNum(data.stats.highestTotalScore)}</span>
						</p>
					) : null}

					{data.metadata.followersCount ? (
						<p className="flex flex-col gap-1">
							<span className="text-(--text-meta)">Followers</span>
							<span className="font-jetbrains text-lg font-semibold">{formattedNum(data.metadata.followersCount)}</span>
						</p>
					) : null}
				</div>

				<div className="grid grid-cols-2">
					<div className="relative col-span-full flex min-h-[408px] flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<React.Suspense fallback={<div className="min-h-[408px]" />}>
							<MultiSeriesChart2
								title="Activity"
								dataset={activityDataset?.source?.length ? activityDataset : EMPTY_ACTIVITY_DATASET}
								charts={ACTIVITY_CHARTS}
								valueSymbol=""
								exportButtons="auto"
							/>
						</React.Suspense>
					</div>
					<div className="relative col-span-full flex min-h-[408px] flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<React.Suspense fallback={<div className="min-h-[408px]" />}>
							<MultiSeriesChart2
								title="Max Votes"
								dataset={maxVotesDataset?.source?.length ? maxVotesDataset : EMPTY_MAXVOTES_DATASET}
								charts={MAX_VOTES_CHARTS}
								valueSymbol=""
								exportButtons="auto"
							/>
						</React.Suspense>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-9">
					{data.metadata.domain && (
						<a
							className="flex items-center justify-center gap-1 rounded-md bg-(--link-bg) px-2 py-1 text-xs whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
							target="_blank"
							rel="noopener noreferrer"
							href={`https://${data.metadata.domain}`}
						>
							<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
						</a>
					)}

					{data.metadata.twitter && (
						<a
							className="flex items-center justify-center gap-1 rounded-md bg-(--link-bg) px-2 py-1 text-xs whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
							target="_blank"
							rel="noopener noreferrer"
							href={`https://x.com/${data.metadata.twitter}`}
						>
							<span>Twitter</span> <Icon name="arrow-up-right" height={14} width={14} />
						</a>
					)}

					{data.metadata.github && (
						<a
							className="flex items-center justify-center gap-1 rounded-md bg-(--link-bg) px-2 py-1 text-xs whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
							target="_blank"
							rel="noopener noreferrer"
							href={`https://github.com/${data.metadata.github}`}
						>
							<span>GitHub</span>
							<Icon name="arrow-up-right" height={14} width={14} />
						</a>
					)}

					{data.metadata.coingecko && (
						<a
							className="flex items-center justify-center gap-1 rounded-md bg-(--link-bg) px-2 py-1 text-xs whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
							target="_blank"
							rel="noopener noreferrer"
							href={`https://www.coingecko.com/en/coins/${data.metadata.coingecko}`}
						>
							<span>View on CoinGecko</span> <Icon name="arrow-up-right" height={14} width={14} />
						</a>
					)}
				</div>
			</div>

			<GovernanceTable data={data} governanceType={governanceType} />
		</Layout>
	)
}

function getDateRange(startDateStr) {
	const startDate = new Date(startDateStr)
	const endDate = new Date()
	const dateRange = []
	while (startDate <= endDate) {
		dateRange.push(startDate.toISOString().slice(0, 7))
		startDate.setMonth(startDate.getMonth() + 1)
	}
	return dateRange.slice(1)
}
