import * as React from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'react-feather'
import Layout from '~/layout'
import {
	Button,
	FlexRow,
	InfoWrapper,
	LinksWrapper,
	Section,
	SectionHeader,
	ChartsWrapper
} from '~/layout/ProtocolAndPool'
import CopyHelper from '~/components/Copy'
import { AdaptorsSearch } from '~/components/Search'
import AuditInfo from '~/components/AuditInfo'
import { useScrollToTop } from '~/hooks'
import { capitalizeFirstLetter, formattedNum, getBlockExplorer } from '~/utils'
import { IJoin2ReturnType } from '~/api/categories/adaptors'
import { ChartByType } from './charts'
import { chartBreakdownByChain } from '~/api/categories/adaptors/utils'
import Announcement from '~/components/Announcement'
import { volumeTypes } from '~/utils/adaptorsPages/utils'
import SEO from '~/components/SEO'

import type { IProtocolContainerProps } from './types'
import { ProtocolChart } from './charts/ProtocolChart'

function ProtocolContainer(props: IProtocolContainerProps) {
	useScrollToTop()
	const blockExplorers = (
		props.protocolSummary.allAddresses ?? (props.protocolSummary.address ? [props.protocolSummary.address] : [])
	).map((address) => {
		const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

		const splittedAddress = address.split(':')
		return {
			blockExplorerLink,
			blockExplorerName,
			chain: splittedAddress.length > 1 ? splittedAddress[0] : undefined,
			address: splittedAddress.length > 1 ? splittedAddress[1] : splittedAddress[0]
		}
	})

	const enableVersionsChart = Object.keys(props.protocolSummary.protocolsData ?? {}).length > 1
	const enableTokensChart = props.protocolSummary.type === 'incentives'
	const typeSimple = volumeTypes.includes(props.protocolSummary.type) ? 'volume' : props.protocolSummary.type
	const useTotalDataChart = props.protocolSummary.type === 'fees' || props.protocolSummary.type === 'options'
	const mainChart = React.useMemo(() => {
		let chartData: IJoin2ReturnType
		let title: string
		let legend: string[]
		if (useTotalDataChart) {
			chartData = props.protocolSummary.totalDataChart[0]
			legend = props.protocolSummary.totalDataChart[1]
		} else {
			const [cd, lgnd] = chartBreakdownByChain(props.protocolSummary.totalDataChartBreakdown)
			chartData = cd
			legend = lgnd
		}
		title = Object.keys(legend).length <= 1 ? `${capitalizeFirstLetter(typeSimple)} by chain` : ''
		return {
			dataChart: [chartData, legend] as [IJoin2ReturnType, string[]],
			title: title
		}
	}, [
		props.protocolSummary.totalDataChart,
		props.protocolSummary.totalDataChartBreakdown,
		useTotalDataChart,
		typeSimple
	])

	return (
		<Layout title={props.title} style={{ gap: '36px' }}>
			<SEO
				cardName={props.protocolSummary.displayName}
				tvl={formattedNum(props.protocolSummary.total24h)?.toString()}
				volumeChange={props.protocolSummary.change_1d?.toString()}
				pageType={props.protocolSummary.type}
			/>

			<AdaptorsSearch
				type={props.protocolSummary.type}
				step={{
					category: capitalizeFirstLetter(props.protocolSummary.type),
					name: props.protocolSummary.displayName
				}}
				/* onToggleClick={
					charts.totalDataChartBreakdown && charts.totalDataChartBreakdown.length > 0
					? (enabled) => setEnableBreakdownChart(enabled)
					: undefined
				} */
			/>
			{!props.protocolSummary.latestFetchIsOk && (
				<Announcement notCancellable>
					Looks like {props.protocolSummary.displayName} latest {props.protocolSummary.type} data might not be accurate
					or up-to-date, 🦙🦙🦙 are working on it.
				</Announcement>
			)}

			<ProtocolChart
				logo={props.protocolSummary.logo}
				data={props.protocolSummary}
				chartData={mainChart.dataChart}
				name={props.protocolSummary.displayName}
				type={props.protocolSummary.type}
				title={mainChart.title}
				totalAllTime={props.protocolSummary.totalAllTime}
			/>

			{/* Above component should be replaced by the one below but for some reason it makes the chartByVersion not to load to test use dexs/uniswap*/}
			{/* 			<ChartByType
				fullChart={false}
				type={props.protocolSummary.type}
				protocolName={props.protocolSummary.module}
				chartType="chain"
				protocolSummary={props.protocolSummary}
			/> */}
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

					{props.protocolSummary.forkedFrom && props.protocolSummary.forkedFrom.length > 0 && (
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
						<AuditInfo audits={props.protocolSummary.audits} auditLinks={props.protocolSummary.audit_links} />
					)}

					<LinksWrapper>
						{props.protocolSummary.url && (
							<Link href={props.protocolSummary.url} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
									<span>Website</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}

						{props.protocolSummary.twitter && (
							<Link href={`https://twitter.com/${props.protocolSummary.twitter}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
									<span>Twitter</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>

				<Section>
					<h3>Token Information</h3>

					{blockExplorers && (
						<>
							{blockExplorers.map((blockExplorer) => (
								<FlexRow key={blockExplorer.address}>
									<span>{`${capitalizeFirstLetter(
										blockExplorer.chain ? `${blockExplorer.chain} address:` : 'address:'
									)}`}</span>
									<span>{blockExplorer.address.slice(0, 8) + '...' + blockExplorer.address?.slice(36, 42)}</span>
									<CopyHelper toCopy={blockExplorer.address} disabled={!blockExplorer.address} />
									<Link href={blockExplorer.blockExplorerLink} passHref>
										<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
											<span>View on {blockExplorer.blockExplorerName}</span> <ArrowUpRight size={14} />
										</Button>
									</Link>
								</FlexRow>
							))}
						</>
					)}

					<LinksWrapper>
						{props.protocolSummary.gecko_id && (
							<Link href={`https://www.coingecko.com/en/coins/${props.protocolSummary.gecko_id}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
									<span>View on CoinGecko</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>

				<Section>
					<h3>Methodology</h3>
					<LinksWrapper>
						{props.protocolSummary.methodologyURL && (
							<Link href={props.protocolSummary.methodologyURL} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
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
							<ChartByType
								type={props.protocolSummary.type}
								protocolName={props.protocolSummary.module}
								chartType="version"
							/>
						)}
						{enableTokensChart && (
							<ChartByType
								type={props.protocolSummary.type}
								protocolName={props.protocolSummary.module}
								chartType="tokens"
							/>
						)}
					</ChartsWrapper>
				</>
			)}
		</Layout>
	)
}

export default ProtocolContainer
