import { maxAgeForNext } from '~/api'
import * as React from 'react'
import Layout from '~/layout'
import { TokenLogo } from '~/components/TokenLogo'
import { standardizeProtocolName, tokenIconUrl, chainIconUrl, toK } from '~/utils'
import {
	GOVERNANCE_SNAPSHOT_API,
	GOVERNANCE_COMPOUND_API,
	GOVERNANCE_TALLY_API,
	PROTOCOL_GOVERNANCE_SNAPSHOT_API,
	PROTOCOL_GOVERNANCE_COMPOUND_API,
	PROTOCOL_GOVERNANCE_TALLY_API
} from '~/constants'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { IBarChartProps } from '~/components/ECharts/types'
import { formatGovernanceData } from '~/api/categories/protocols'
import { GovernanceTable } from '~/containers/Defi/Protocol/Governance'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'
import { Icon } from '~/components/Icon'
import { LazyChart } from '~/components/LazyChart'
import { ButtonLight } from '~/components/ButtonStyled'

const fetch = fetchWithErrorLogging

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export const getStaticProps = withPerformanceLogging(
	'governance/[...project]',
	async ({
		params: {
			project: [project]
		}
	}) => {
		const [snapshot, compound, tally]: [
			{ [key: string]: { name: string; id: string } },
			{ [key: string]: { name: string; id: string } },
			{ [key: string]: { name: string; id: string } }
		] = await Promise.all([
			fetch(GOVERNANCE_SNAPSHOT_API).then((res) => res.json()),
			fetch(GOVERNANCE_COMPOUND_API).then((res) => res.json()),
			fetch(GOVERNANCE_TALLY_API).then((res) => res.json())
		])

		const snapshotProjectId = Object.values(snapshot).find((p) => standardizeProtocolName(p.name) === project)?.id
		const compoundProjectId = Object.values(compound).find((p) => standardizeProtocolName(p.name) === project)?.id
		const tallyProjectId = Object.values(tally).find((p) => standardizeProtocolName(p.name) === project)?.id

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
		} = await fetch(api).then((res) => res.json())

		const recentMonth = Object.keys(data.stats.months).sort().pop()
		const missingMonths = getDateRange(recentMonth)

		missingMonths.forEach((month) => {
			data.stats.months[month] = { total: 0, successful: 0, proposals: [] }
		})

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
	return (
		<Layout title={`${data.metadata.name} Governance - DefiLlama`} defaultSEO>
			<div className="flex flex-col gap-9 p-6 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg7)] border border-[var(--divider)] shadow rounded-xl">
				<h1 className="flex items-center gap-2 text-xl">
					<TokenLogo logo={tokenIconUrl(data.metadata.name)} />
					<span>{data.metadata.name}</span>
				</h1>

				<div className="flex flex-wrap justify-between gap-4">
					{data.stats.chainName ? (
						<p className="flex flex-col gap-1">
							<span className="font-semibold text-sm text-[#737373] dark:text-[#a9a9a9]">Chain</span>
							<span className="flex items-center gap-1 font-jetbrains font-semibold text-2xl">
								<TokenLogo logo={chainIconUrl(data.stats.chainName)} size={32} />
								<span>{data.stats.chainName}</span>
							</span>
						</p>
					) : null}

					{data.stats.proposalsCount ? (
						<p className="flex flex-col gap-1">
							<span className="font-semibold text-sm text-[#737373] dark:text-[#a9a9a9]">Total Proposals</span>
							<span className="font-jetbrains font-semibold text-2xl">{data.stats.proposalsCount}</span>
						</p>
					) : null}

					{data.stats.successfulProposal ? (
						<p className="flex flex-col gap-1">
							<span className="font-semibold text-sm text-[#737373] dark:text-[#a9a9a9]">Successful Proposals</span>
							<span className="font-jetbrains font-semibold text-2xl">{data.stats.successfulProposals}</span>
						</p>
					) : null}

					{data.stats.propsalsInLast30Days ? (
						<p className="flex flex-col gap-1">
							<span className="font-semibold text-sm text-[#737373] dark:text-[#a9a9a9]">
								Successful Proposals in last 30 days
							</span>
							<span className="font-jetbrains font-semibold text-2xl">{data.stats.propsalsInLast30Days}</span>
						</p>
					) : null}

					{data.stats.highestTotalScore ? (
						<p className="flex flex-col gap-1">
							<span className="font-semibold text-sm text-[#737373] dark:text-[#a9a9a9]">Max Total Votes</span>
							<span className="font-jetbrains font-semibold text-2xl">{toK(data.stats.highestTotalScore)}</span>
						</p>
					) : null}

					{data.metadata.followersCount ? (
						<p className="flex flex-col gap-1">
							<span className="font-semibold text-sm text-[#737373] dark:text-[#a9a9a9]">Followers</span>
							<span className="font-jetbrains font-semibold text-2xl">{toK(data.metadata.followersCount)}</span>
						</p>
					) : null}
				</div>

				<div className="grid grid-cols-2 rounded-xl bg-[var(--bg6)]">
					<LazyChart>
						<BarChart
							title={'Activity'}
							chartData={data.activity}
							stacks={simpleStack}
							stackColors={stackedBarChartColors}
						/>
					</LazyChart>
					<LazyChart>
						<BarChart
							title={'Max Votes'}
							chartData={data.maxVotes}
							stacks={maxVotesStack}
							stackColors={stackedBarChartColors}
						/>
					</LazyChart>
				</div>

				<div className="flex flex-wrap items-center gap-9">
					{data.metadata.domain && (
						<Link href={`https://${data.metadata.domain}`} passHref>
							<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
							</ButtonLight>
						</Link>
					)}

					{data.metadata.twitter && (
						<Link href={`https://twitter.com/${data.metadata.twitter}`} passHref>
							<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>Twitter</span> <Icon name="arrow-up-right" height={14} width={14} />
							</ButtonLight>
						</Link>
					)}

					{data.metadata.github && (
						<Link href={`https://github.com/${data.metadata.github}`} passHref>
							<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>Github</span>
								<Icon name="arrow-up-right" height={14} width={14} />
							</ButtonLight>
						</Link>
					)}

					{data.metadata.coingecko && (
						<Link href={`https://www.coingecko.com/en/coins/${data.metadata.coingecko}`} passHref>
							<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>View on CoinGecko</span> <Icon name="arrow-up-right" height={14} width={14} />
							</ButtonLight>
						</Link>
					)}
				</div>
			</div>

			<GovernanceTable data={data} governanceType={governanceType} />
		</Layout>
	)
}

const stackedBarChartColors = {
	Total: '#4f8fea',
	Successful: '#E59421',
	'Max Votes': '#4f8fea'
}

const simpleStack = {
	Total: 'stackA',
	Successful: 'stackB'
}

const maxVotesStack = {
	'Max Votes': 'maxvotes'
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
