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
	ChartsWrapper,
	LazyChart,
	ChartWrapper
} from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import CopyHelper from '~/components/Copy'
import FormattedName from '~/components/FormattedName'
import TokenLogo from '~/components/TokenLogo'
import SEO from '~/components/SEO'
import { DexsSearch } from '~/components/Search'
import AuditInfo from '~/components/AuditInfo'
import { useScrollToTop } from '~/hooks'
import { formattedNum, getBlockExplorer } from '~/utils'
import { formatVolumeHistoryToChartDataByChain, formatVolumeHistoryToChartDataByProtocol } from '~/utils/dexs'
import { IDexResponse } from '~/api/categories/dexs/types'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { formatTimestampAsDate } from '~/api/categories/dexs/utils'

// TODO remove duplicate bar chart component and use '~/components/ECharts/BarChart'
const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

interface IProtocolContainerProps {
	title: string
	dex: string
	dexData: IDexResponse
	backgroundColor: string
}

interface IDexChartsProps {
	data: IDexResponse
	chartData: {
		name: string
		data: [Date, number][]
	}[]
	name: string
	logo?: string
	isProtocolPage?: boolean
	chainsChart?: IDexChartsProps['chartData']
}

export const DexCharts = ({ logo, data, chartData, name, chainsChart, isProtocolPage = false }: IDexChartsProps) => {
	return (
		<StatsSection>
			<DetailsWrapper>
				{isProtocolPage ? (
					<Name>Trading Volume</Name>
				) : (
					<Name>
						<TokenLogo logo={logo} size={24} />
						<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
					</Name>
				)}

				<Stat>
					<span>
						{data.disabled === true
							? `Last day volume (${formatTimestampAsDate(
									data.volumeHistory[data.volumeHistory.length - 1].timestamp
							  )})`
							: '24h volume'}
					</span>
					<span>{formattedNum(data.total1dVolume || '0', true)}</span>
				</Stat>

				<Stat>
					<span>
						{data.disabled === true
							? `Last day change (${formatTimestampAsDate(
									data.volumeHistory[data.volumeHistory.length - 1].timestamp
							  )})`
							: '24 change'}
					</span>
					<span>{data.change1dVolume || 0}%</span>
				</Stat>
			</DetailsWrapper>

			<ChartWrapper>
				{chartData && chartData.length > 0 && !isProtocolPage && (
					<StackedBarChart title="Total volume" chartData={chartData} />
				)}
				{chainsChart && <StackedBarChart title="Volume by chain" chartData={chainsChart} />}
			</ChartWrapper>
		</StatsSection>
	)
}

function ProtocolContainer({ title, dexData, backgroundColor }: IProtocolContainerProps) {
	useScrollToTop()

	const {
		address = '',
		name,
		url,
		description,
		logo,
		audits,
		category,
		twitter,
		audit_links,
		volumeAdapter,
		forkedFrom
	} = dexData

	const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

	// TODO format data based on BarChart Props
	const { mainChartData, allChainsChartData } = React.useMemo(() => {
		const volumeHistory = !!dexData.volumeHistory ? dexData.volumeHistory : []

		return {
			mainChartData: formatVolumeHistoryToChartDataByProtocol(volumeHistory, dexData.name, dexData.volumeAdapter),
			allChainsChartData: formatVolumeHistoryToChartDataByChain(volumeHistory)
		}
	}, [dexData])

	return (
		<Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} style={{ gap: '36px' }}>
			<SEO
				cardName={dexData.name}
				token={dexData.name}
				tvl={formattedNum(dexData.total1dVolume)?.toString()}
				volumeChange={`${dexData.change1dVolume}`}
				dexsPage
			/>

			<DexsSearch
				step={{
					category: 'DEXs',
					name: dexData.name
				}}
			/>
			<DexCharts logo={logo} data={dexData} chartData={mainChartData} name={name} />

			<SectionHeader>Information</SectionHeader>
			<InfoWrapper>
				<Section>
					<h3>DEX Information</h3>
					{description && <p>{description}</p>}

					{category && (
						<FlexRow>
							<span>Category</span>
							<span>:</span>
							<Link href={`/dexs`}>{category}</Link>
						</FlexRow>
					)}

					{forkedFrom && (
						<FlexRow>
							<span>Forked from</span>
							<span>:</span>
							<>
								{forkedFrom.map((p, index) => (
									<Link href={`/protocol/${p}`} key={p}>
										{forkedFrom[index + 1] ? p + ', ' : p}
									</Link>
								))}
							</>
						</FlexRow>
					)}

					{audits && audit_links && <AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} />}

					<LinksWrapper>
						<Link href={url} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Website</span> <ArrowUpRight size={14} />
							</Button>
						</Link>

						{twitter && (
							<Link href={`https://twitter.com/${twitter}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>Twitter</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>

				<Section>
					<h3>Token Information</h3>

					{address && (
						<FlexRow>
							<span>Address</span>
							<span>:</span>
							<span>{address.slice(0, 8) + '...' + address?.slice(36, 42)}</span>
							<CopyHelper toCopy={address} disabled={!address} />
						</FlexRow>
					)}

					<LinksWrapper>
						{dexData.gecko_id && (
							<Link href={`https://www.coingecko.com/en/coins/${dexData.gecko_id}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>View on CoinGecko</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}

						{blockExplorerLink && (
							<Link href={blockExplorerLink} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>View on {blockExplorerName}</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>

				<Section>
					<h3>Methodology</h3>
					<LinksWrapper>
						{volumeAdapter && (
							<Link
								href={`https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/volumes/adapters/${volumeAdapter}`}
								passHref
							>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>Check the code</span>
									<ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>
			</InfoWrapper>

			<SectionHeader>Charts</SectionHeader>

			<ChartsWrapper>
				<LazyChart>
					{allChainsChartData && allChainsChartData.length && (
						<StackedBarChart title="By chain all versions" chartData={allChainsChartData} />
					)}
				</LazyChart>
			</ChartsWrapper>
		</Layout>
	)
}

export default ProtocolContainer
