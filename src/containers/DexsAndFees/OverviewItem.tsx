import * as React from 'react'
import Link from 'next/link'

import Layout from '~/layout'
import { Button, FlexRow, InfoWrapper, Section, SectionHeader, ChartsWrapper } from '~/layout/ProtocolAndPool'
import CopyHelper from '~/components/Copy'
import { AdaptorsSearch } from '~/components/Search/Adaptors'
import { AuditInfo } from '~/components/AuditInfo'
import { useScrollToTop } from '~/hooks'
import { capitalizeFirstLetter, formattedNum, getBlockExplorer } from '~/utils'
import { IJoin2ReturnType } from '~/api/categories/adaptors'
import { ChartByType } from './charts'

import { chartBreakdownByChain } from '~/api/categories/adaptors/utils'
import { Announcement } from '~/components/Announcement'
import { volumeTypes } from '~/utils/adaptorsPages/utils'
import SEO from '~/components/SEO'
import type { IProtocolContainerProps } from './types'
import { ProtocolChart } from './charts/ProtocolChart'
import useEmissions from './hooks/useEmissions'
import { sluggify } from '~/utils/cache-client'
import { useFeesManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'

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
	const [enabledSettings] = useFeesManager()
	const emissionsChart = useEmissions(sluggify(props.protocolSummary.name))

	const enableVersionsChart = props.protocolSummary.childProtocols?.length > 0
	const enableTokensChart = props.protocolSummary.type === 'incentives'
	const enableChainsChart = props.protocolSummary.type !== 'dexs'
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

		if (emissionsChart) {
			chartData = chartData.map((val) => ({ ...val, Incentives: emissionsChart[val.date] ?? 0 }))
			legend = legend.concat('Incentives')
		}
		if (props.protocolSummary.type === 'fees') {
			chartData = chartData.map((val) => ({
				...val,
				Revenue: +val.Revenue + +(enabledSettings.bribes ? val.Bribes || 0 : 0),
				Bribes: undefined
			}))
			legend = legend.filter((r) => r !== 'Bribes')
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
		typeSimple,
		emissionsChart,
		enabledSettings,
		props.protocolSummary.type
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
				childProtocols={props.protocolSummary.childProtocols}
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
							<span>Category:</span>
							<Link href={`/${props.protocolSummary.type}?category=${props.protocolSummary.category}`}>
								{props.protocolSummary.category}
							</Link>
						</FlexRow>
					)}

					{props.protocolSummary.forkedFrom && props.protocolSummary.forkedFrom.length > 0 && (
						<FlexRow>
							<span>Forked from:</span>
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

					<div className="flex items-center gap-4 flex-wrap">
						{props.protocolSummary.url && (
							<Link href={props.protocolSummary.url} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
									<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
								</Button>
							</Link>
						)}

						{props.protocolSummary.twitter && (
							<Link href={`https://twitter.com/${props.protocolSummary.twitter}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
									<span>Twitter</span> <Icon name="arrow-up-right" height={14} width={14} />
								</Button>
							</Link>
						)}
					</div>
				</Section>

				{(blockExplorers.length > 0 || props.protocolSummary.gecko_id) && (
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
												<span>View on {blockExplorer.blockExplorerName}</span>{' '}
												<Icon name="arrow-up-right" height={14} width={14} />
											</Button>
										</Link>
									</FlexRow>
								))}
							</>
						)}

						{props.protocolSummary.gecko_id && (
							<div className="flex items-center gap-4 flex-wrap">
								<Link href={`https://www.coingecko.com/en/coins/${props.protocolSummary.gecko_id}`} passHref>
									<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
										<span>View on CoinGecko</span> <Icon name="arrow-up-right" height={14} width={14} />
									</Button>
								</Link>
							</div>
						)}
					</Section>
				)}
				{props.protocolSummary.methodologyURL && (
					<Section>
						<h3>Methodology</h3>
						{props.protocolSummary.methodology?.['Fees'] ? (
							<p>{`Fees: ${props.protocolSummary.methodology['Fees']}`}</p>
						) : null}

						{props.protocolSummary.methodology?.['Revenue'] ? (
							<p>{`Revenue: ${props.protocolSummary.methodology['Revenue']}`}</p>
						) : null}

						<div className="flex items-center gap-4 flex-wrap">
							<Link href={props.protocolSummary.methodologyURL} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
									<span>Check the code</span>
									<Icon name="arrow-up-right" height={14} width={14} />
								</Button>
							</Link>
						</div>
					</Section>
				)}
			</InfoWrapper>
			{(enableVersionsChart || enableTokensChart || enableChainsChart) && (
				<>
					<SectionHeader>Charts</SectionHeader>
					<ChartsWrapper>
						{enableVersionsChart && (
							<ChartByType
								type={props.protocolSummary.type}
								protocolName={props.protocolSummary.name}
								chartType="version"
							/>
						)}
						{enableTokensChart && (
							<ChartByType
								type={props.protocolSummary.type}
								protocolName={props.protocolSummary.name}
								chartType="tokens"
							/>
						)}
						{enableChainsChart && (
							<ChartByType
								type={props.protocolSummary.type}
								protocolName={props.protocolSummary.module}
								chartType="chain"
							/>
						)}
					</ChartsWrapper>
				</>
			)}
		</Layout>
	)
}

export default ProtocolContainer
