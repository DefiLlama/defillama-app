import { maxAgeForNext } from '~/api'
import { Button, ChartsWrapper, LazyChart, Name } from '~/layout/ProtocolAndPool'
import * as React from 'react'
import Layout from '~/layout'
import styled from 'styled-components'
import { StatsSection } from '~/layout/Stats/Medium'
import TokenLogo from '~/components/TokenLogo'
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
import { ArrowUpRight } from 'react-feather'
import dynamic from 'next/dynamic'
import { IBarChartProps } from '~/components/ECharts/types'
import { AutoRow } from '~/components/Row'
import { formatGovernanceData } from '~/api/categories/protocols'
import { GovernanceTable } from '~/containers/Defi/Protocol/Governance'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'

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

		const api = snapshotProjectId
			? PROTOCOL_GOVERNANCE_SNAPSHOT_API + '/' + snapshotProjectId.replaceAll(':', '/') + '.json'
			: compoundProjectId
			? PROTOCOL_GOVERNANCE_COMPOUND_API + '/' + compoundProjectId.replaceAll(':', '/') + '.json'
			: tallyProjectId
			? PROTOCOL_GOVERNANCE_TALLY_API + '/' + tallyProjectId.replaceAll(':', '/') + '.json'
			: null

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
			<Wrapper>
				<Name>
					<TokenLogo logo={tokenIconUrl(data.metadata.name)} />
					<span>{data.metadata.name}</span>
				</Name>

				<LinksWrapper>
					{data.stats.chainName ? (
						<p>
							<span>Chain</span>
							<AutoRow gap="4px">
								<TokenLogo logo={chainIconUrl(data.stats.chainName)} size={32} />
								<span>{data.stats.chainName}</span>
							</AutoRow>
						</p>
					) : null}

					{data.stats.proposalsCount ? (
						<p>
							<span>Total Proposals</span>
							<span>{data.stats.proposalsCount}</span>
						</p>
					) : null}

					{data.stats.successfulProposal ? (
						<p>
							<span>Successful Proposals</span>
							<span>{data.stats.successfulProposals}</span>
						</p>
					) : null}

					{data.stats.propsalsInLast30Days ? (
						<p>
							<span>Successful Proposals in last 30 days</span>
							<span>{data.stats.propsalsInLast30Days}</span>
						</p>
					) : null}

					{data.stats.highestTotalScore ? (
						<p>
							<span>Max Total Votes</span>
							<span>{toK(data.stats.highestTotalScore)}</span>
						</p>
					) : null}

					{data.metadata.followersCount ? (
						<p>
							<span>Followers</span>
							<span>{toK(data.metadata.followersCount)}</span>
						</p>
					) : null}
				</LinksWrapper>

				<ChartsWrapper>
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
				</ChartsWrapper>

				<LinksWrapper>
					{data.metadata.domain && (
						<Link href={`https://${data.metadata.domain}`} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>Website</span> <ArrowUpRight size={14} />
							</Button>
						</Link>
					)}

					{data.metadata.twitter && (
						<Link href={`https://twitter.com/${data.metadata.twitter}`} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>Twitter</span> <ArrowUpRight size={14} />
							</Button>
						</Link>
					)}

					{data.metadata.github && (
						<Link href={`https://github.com/${data.metadata.github}`} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>Github</span>
								<ArrowUpRight size={14} />
							</Button>
						</Link>
					)}

					{data.metadata.coingecko && (
						<Link href={`https://www.coingecko.com/en/coins/${data.metadata.coingecko}`} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>View on CoinGecko</span> <ArrowUpRight size={14} />
							</Button>
						</Link>
					)}
				</LinksWrapper>
			</Wrapper>

			<GovernanceTable data={data} governanceType={governanceType} />
		</Layout>
	)
}

const Wrapper = styled(StatsSection)`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg7};
`

const LinksWrapper = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 36px;

	p {
		display: flex;
		flex-direction: column;
		gap: 16px;

		& > *:nth-child(1) {
			font-family: var(--font-inter);
			font-weight: 600;
			font-size: 0.875rem;
			text-align: left;
			color: ${({ theme }) => (theme.mode === 'dark' ? '#a9a9a9' : '#737373')};
			margin: -2px 0;
		}

		& > *:nth-child(2) {
			font-family: var(--font-jetbrains);
			font-weight: 800;
			font-size: 2.25rem;
			margin: -10px 0;
		}
	}
`

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
