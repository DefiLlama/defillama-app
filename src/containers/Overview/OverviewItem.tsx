import * as React from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { transparentize } from 'polished'
import { ArrowUpRight } from 'react-feather'
import Layout from '~/layout'
import {
	Button,
	FlexRow,
	InfoWrapper,
	LinksWrapper,
	DetailsWrapper,
	Name,
	Section,
	SectionHeader,
	ChartWrapper,
	ChartsWrapper,
	LazyChart
} from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import CopyHelper from '~/components/Copy'
import FormattedName from '~/components/FormattedName'
import TokenLogo from '~/components/TokenLogo'
import { AdaptorsSearch } from '~/components/Search'
import AuditInfo from '~/components/AuditInfo'
import { useScrollToTop } from '~/hooks'
import { capitalizeFirstLetter, formattedNum, getBlockExplorer } from '~/utils'
import { formatTimestampAsDate } from '~/api/categories/dexs/utils'
import { upperCaseFirst } from './utils'
import { IBarChartProps } from '~/components/ECharts/types'
import { IJoin2ReturnType } from '~/api/categories/adaptors'
import { ProtocolAdaptorSummaryResponse } from '~/api/categories/adaptors/types'

interface ProtocolAdaptorSummaryProps extends Omit<ProtocolAdaptorSummaryResponse, 'totalDataChart'> {
	type: string
	totalDataChart: IJoin2ReturnType
	revenue24h: number | null
}

interface PageParams {
	protocolSummary: ProtocolAdaptorSummaryProps
	backgroundColor: string
}
import { chartBreakdownByChain, chartBreakdownByTokens, chartBreakdownByVersion } from '~/api/categories/adaptors/utils'

const StackedChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

interface IProtocolContainerProps extends PageParams {
	title: string
}

interface IDexChartsProps {
	data: IProtocolContainerProps['protocolSummary']
	chartData: [IJoin2ReturnType, string[]]
	name: string
	logo?: string
	isProtocolPage?: boolean
	chainsChart?: IDexChartsProps['chartData']
	type?: string
	title?: string
	fullChart?: boolean
}

export const ProtocolChart = ({ logo, data, chartData, name, type, title, fullChart = false }: IDexChartsProps) => {
	const typeString = type === 'volumes' ? 'Volumes' : upperCaseFirst(type)
	return (
		<StatsSection>
			{!fullChart && (
				<DetailsWrapper>
					<Name>
						<TokenLogo logo={logo} size={24} />
						<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
					</Name>
					<Stat>
						<span>
							{data.disabled === true
								? `Last day ${typeString.toLowerCase()} (${formatTimestampAsDate(
										+data.totalDataChart[data.totalDataChart.length - 1][0]
								  )})`
								: `${typeString} (24h)`}
						</span>
						<span>{formattedNum(data.total24h || '0', true)}</span>
					</Stat>

					{typeString === 'Fees' && (
						<Stat>
							<span>
								{data.disabled === true
									? `Last day ${typeString.toLowerCase()} (${formatTimestampAsDate(
											+data.totalDataChart[data.totalDataChart.length - 1][0]
									  )})`
									: `Revenue (24h)`}
							</span>
							<span>{formattedNum(data.revenue24h || '0', true)}</span>
						</Stat>
					)}

					<Stat>
						<span>
							{data.disabled === true
								? `Last day change (${formatTimestampAsDate(+data.totalDataChart[data.totalDataChart.length - 1][0])})`
								: 'Change (24h)'}
						</span>
						<span>{data.change_1d || 0}%</span>
					</Stat>
				</DetailsWrapper>
			)}
			<ChartWrapper>
				<StackedChart title={title ?? ''} chartData={chartData[0]} customLegendOptions={chartData[1]} />
			</ChartWrapper>
		</StatsSection>
	)
}

function ProtocolContainer(props: IProtocolContainerProps) {
	useScrollToTop()
	const { blockExplorerLink, blockExplorerName } = getBlockExplorer(props.protocolSummary.address)
	const enableVersionsChart = Object.keys(props.protocolSummary.protocolsData).length > 1
	const enableTokensChart = props.protocolSummary.type === 'incentives'
	return (
		<Layout title={props.title} backgroundColor={transparentize(0.6, props.backgroundColor)} style={{ gap: '36px' }}>
			<AdaptorsSearch
				type={props.protocolSummary.type}
				step={{
					category: upperCaseFirst(props.protocolSummary.type),
					name: props.protocolSummary.name
				}}
				/* onToggleClick={
					charts.totalDataChartBreakdown && charts.totalDataChartBreakdown.length > 0
					? (enabled) => setEnableBreakdownChart(enabled)
					: undefined
				} */
			/>
			<ProtocolChart
				logo={props.protocolSummary.logo}
				data={props.protocolSummary}
				chartData={chartBreakdownByChain(props.protocolSummary.totalDataChartBreakdown)}
				name={props.protocolSummary.name}
				type={props.protocolSummary.type}
				title={`${capitalizeFirstLetter(props.protocolSummary.type)} by chain`}
			/>

			<SectionHeader>Information</SectionHeader>
			<InfoWrapper>
				<Section>
					<h3>Protocol information</h3>
					{props.protocolSummary.description && <p>{props.protocolSummary.description}</p>}

					{props.protocolSummary.category && (
						<FlexRow>
							<span>Category</span>
							<span>:</span>
							<Link href={`/overview/${props.protocolSummary.type}`}>{props.protocolSummary.category}</Link>
						</FlexRow>
					)}

					{props.protocolSummary.forkedFrom && (
						<FlexRow>
							<span>Forked from</span>
							<span>:</span>
							<>
								{props.protocolSummary.forkedFrom.map((p, index) => (
									<Link href={`/protocol/${p}`} key={p}>
										{props.protocolSummary.forkedFrom[index + 1] ? p + ', ' : p}
									</Link>
								))}
							</>
						</FlexRow>
					)}

					{props.protocolSummary.audits && props.protocolSummary.audit_links && (
						<AuditInfo
							audits={props.protocolSummary.audits}
							auditLinks={props.protocolSummary.audit_links}
							color={props.backgroundColor}
						/>
					)}

					<LinksWrapper>
						{props.protocolSummary.url && (
							<Link href={props.protocolSummary.url} passHref>
								<Button
									as="a"
									target="_blank"
									rel="noopener noreferrer"
									useTextColor={true}
									color={props.backgroundColor}
								>
									<span>Website</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}

						{props.protocolSummary.twitter && (
							<Link href={`https://twitter.com/${props.protocolSummary.twitter}`} passHref>
								<Button
									as="a"
									target="_blank"
									rel="noopener noreferrer"
									useTextColor={true}
									color={props.backgroundColor}
								>
									<span>Twitter</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>

				<Section>
					<h3>Token Information</h3>

					{props.protocolSummary.address && (
						<FlexRow>
							<span>Address</span>
							<span>:</span>
							<span>
								{props.protocolSummary.address.slice(0, 8) + '...' + props.protocolSummary.address?.slice(36, 42)}
							</span>
							<CopyHelper toCopy={props.protocolSummary.address} disabled={!props.protocolSummary.address} />
						</FlexRow>
					)}

					<LinksWrapper>
						{props.protocolSummary.gecko_id && (
							<Link href={`https://www.coingecko.com/en/coins/${props.protocolSummary.gecko_id}`} passHref>
								<Button
									as="a"
									target="_blank"
									rel="noopener noreferrer"
									useTextColor={true}
									color={props.backgroundColor}
								>
									<span>View on CoinGecko</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}

						{blockExplorerLink && (
							<Link href={blockExplorerLink} passHref>
								<Button
									as="a"
									target="_blank"
									rel="noopener noreferrer"
									useTextColor={true}
									color={props.backgroundColor}
								>
									<span>View on {blockExplorerName}</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>

				<Section>
					<h3>Methodology</h3>
					<LinksWrapper>
						{props.protocolSummary.module && (
							<Link
								href={`https://github.com/DefiLlama/adapters/tree/master/${props.protocolSummary.type}/${props.protocolSummary.module}`}
								passHref
							>
								<Button
									as="a"
									target="_blank"
									rel="noopener noreferrer"
									useTextColor={true}
									color={props.backgroundColor}
								>
									<span>Check the code</span>
									<ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>
				<Section></Section>
			</InfoWrapper>
			{(enableVersionsChart || enableTokensChart) && (
				<>
					<SectionHeader>Charts</SectionHeader>
					<ChartsWrapper>
						{enableVersionsChart && (
							<LazyChart>
								<ProtocolChart
									logo={props.protocolSummary.logo}
									data={props.protocolSummary}
									chartData={chartBreakdownByVersion(props.protocolSummary.totalDataChartBreakdown)}
									name={props.protocolSummary.name}
									type={props.protocolSummary.type}
									title={`${capitalizeFirstLetter(props.protocolSummary.type)} by protocol version`}
									fullChart
								/>
							</LazyChart>
						)}
						{enableTokensChart && (
							<LazyChart>
								<ProtocolChart
									logo={props.protocolSummary.logo}
									data={props.protocolSummary}
									chartData={chartBreakdownByTokens(props.protocolSummary.totalDataChartBreakdown)}
									name={props.protocolSummary.name}
									type={props.protocolSummary.type}
									title={`${capitalizeFirstLetter(props.protocolSummary.type)} by token`}
									fullChart
								/>
							</LazyChart>
						)}
					</ChartsWrapper>
				</>
			)}
			{/* 			<SEO
				cardName={dexData.name}
				token={dexData.name}
				tvl={formattedNum(dexData.total1dVolume)?.toString()}
				volumeChange={`${dexData.change1dVolume}`}
				dexsPage
			/>

			 */}
		</Layout>
	)
}

export default ProtocolContainer
