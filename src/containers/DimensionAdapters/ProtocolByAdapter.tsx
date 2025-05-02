import * as React from 'react'
import Link from 'next/link'

import Layout from '~/layout'
import { CopyHelper } from '~/components/Copy'
import { AdaptorsSearch } from '~/components/Search/Adaptors'
import { AuditInfo } from '~/components/AuditInfo'
import { useScrollToTop } from '~/hooks'
import { capitalizeFirstLetter, formattedNum, getBlockExplorer } from '~/utils'
import { IJoin2ReturnType, VOLUME_TYPE_ADAPTORS } from '~/api/categories/adaptors'
import { ChartByType } from './charts'

import { chartBreakdownByChain } from '~/api/categories/adaptors/utils'
import { Announcement } from '~/components/Announcement'
import { SEO } from '~/components/SEO'
import type { IProtocolContainerProps } from './types'
import { ProtocolChart } from './charts/ProtocolChart'
import { useEmissions } from './hooks/useEmissions'
import { sluggify } from '~/utils/cache-client'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'
import { ButtonLight } from '~/components/ButtonStyled'

export function ProtocolByAdapter(props: IProtocolContainerProps) {
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
	const [enabledSettings] = useLocalStorageSettingsManager('fees')
	const emissionsChart = useEmissions(sluggify(props.protocolSummary.name))

	const enableVersionsChart = props.protocolSummary.linkedProtocols?.length > 0
	const enableTokensChart = props.protocolSummary.type === 'incentives'
	const enableChainsChart = props.protocolSummary.type !== 'dexs'
	const typeSimple = VOLUME_TYPE_ADAPTORS.includes(props.protocolSummary.type) ? 'volume' : props.protocolSummary.type
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
				date: val.date,
				Fees:
					+val.Fees +
					+(enabledSettings.bribes ? val.Bribes || 0 : 0) +
					+(enabledSettings.tokentax ? val.TokenTax || 0 : 0),
				Revenue:
					+val.Revenue +
					+(enabledSettings.bribes ? val.Bribes || 0 : 0) +
					+(enabledSettings.tokentax ? val.TokenTax || 0 : 0)
			}))
			legend = legend.filter((r) => r !== 'Bribes' && r !== 'TokenTax')
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
		<Layout title={props.title}>
			<SEO
				cardName={props.protocolSummary.displayName}
				tvl={formattedNum(props.protocolSummary.total24h)?.toString()}
				volumeChange={props.protocolSummary.change_1d?.toString()}
				pageType={props.protocolSummary.type}
			/>

			<AdaptorsSearch
				type={props.protocolSummary.type}
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
				linkedProtocols={props.protocolSummary.linkedProtocols}
			/>

			{/* Above component should be replaced by the one below but for some reason it makes the chartByVersion not to load to test use dexs/uniswap*/}
			{/* 			<ChartByType
				fullChart={false}
				type={props.protocolSummary.type}
				protocolName={props.protocolSummary.module}
				chartType="chain"
				protocolSummary={props.protocolSummary}
			/> */}

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-1 only:*:col-span-full odd:last:*:col-span-full">
				<div className="bg-[var(--cards-bg)] rounded-md p-3 flex flex-col gap-4">
					<h3 className="font-semibold text-lg">Protocol information</h3>
					{props.protocolSummary.description && <p>{props.protocolSummary.description}</p>}

					{props.protocolSummary.category && (
						<p className="flex items-center gap-2">
							<span>Category:</span>
							<Link href={`/${props.protocolSummary.type}?category=${props.protocolSummary.category}`}>
								{props.protocolSummary.category}
							</Link>
						</p>
					)}

					{props.protocolSummary.forkedFrom && props.protocolSummary.forkedFrom.length > 0 && (
						<p className="flex items-center gap-2">
							<span>Forked from:</span>
							<>
								{props.protocolSummary.forkedFrom.map((p, index) => (
									<Link href={`/protocol/${p}`} key={p}>
										{props.protocolSummary.forkedFrom[index + 1] ? p + ', ' : p}
									</Link>
								))}
							</>
						</p>
					)}

					{props.protocolSummary.audits && props.protocolSummary.audit_links && (
						<AuditInfo audits={props.protocolSummary.audits} auditLinks={props.protocolSummary.audit_links} />
					)}

					<div className="flex items-center gap-4 flex-wrap">
						{props.protocolSummary.url && (
							<Link href={props.protocolSummary.url} passHref>
								<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
									<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
								</ButtonLight>
							</Link>
						)}

						{props.protocolSummary.twitter && (
							<Link href={`https://twitter.com/${props.protocolSummary.twitter}`} passHref>
								<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
									<span>Twitter</span> <Icon name="arrow-up-right" height={14} width={14} />
								</ButtonLight>
							</Link>
						)}
					</div>
				</div>

				{(blockExplorers.length > 0 || props.protocolSummary.gecko_id) && (
					<div className="bg-[var(--cards-bg)] rounded-md p-3 flex flex-col gap-4">
						<h3 className="font-semibold text-lg">Token Information</h3>

						{blockExplorers && (
							<>
								{blockExplorers.map((blockExplorer) => (
									<p className="flex items-center gap-2" key={blockExplorer.address}>
										<span>{`${capitalizeFirstLetter(
											blockExplorer.chain ? `${blockExplorer.chain} address:` : 'address:'
										)}`}</span>
										<span>{blockExplorer.address.slice(0, 8) + '...' + blockExplorer.address?.slice(36, 42)}</span>
										<CopyHelper toCopy={blockExplorer.address} disabled={!blockExplorer.address} />
										<Link href={blockExplorer.blockExplorerLink} passHref>
											<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
												<span>View on {blockExplorer.blockExplorerName}</span>{' '}
												<Icon name="arrow-up-right" height={14} width={14} />
											</ButtonLight>
										</Link>
									</p>
								))}
							</>
						)}

						{props.protocolSummary.gecko_id && (
							<div className="flex items-center gap-4 flex-wrap">
								<Link href={`https://www.coingecko.com/en/coins/${props.protocolSummary.gecko_id}`} passHref>
									<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
										<span>View on CoinGecko</span> <Icon name="arrow-up-right" height={14} width={14} />
									</ButtonLight>
								</Link>
							</div>
						)}
					</div>
				)}
				{props.protocolSummary.methodologyURL && (
					<div className="bg-[var(--cards-bg)] rounded-md p-3 flex flex-col gap-4">
						<h3 className="font-semibold text-lg">Methodology</h3>
						{props.protocolSummary.methodology?.['Fees'] ? (
							<p>{`Fees: ${props.protocolSummary.methodology['Fees']}`}</p>
						) : null}

						{props.protocolSummary.methodology?.['Revenue'] ? (
							<p>{`Revenue: ${props.protocolSummary.methodology['Revenue']}`}</p>
						) : null}

						<div className="flex items-center gap-4 flex-wrap">
							<Link href={props.protocolSummary.methodologyURL} passHref>
								<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
									<span>Check the code</span>
									<Icon name="arrow-up-right" height={14} width={14} />
								</ButtonLight>
							</Link>
						</div>
					</div>
				)}
			</div>
			{(enableVersionsChart || enableTokensChart || enableChainsChart) && (
				<>
					<div className="grid grid-cols-2 gap-1">
						{enableVersionsChart && (
							<ChartByType
								type={props.protocolSummary.type}
								protocolName={props.protocolSummary.slug}
								chartType="version"
							/>
						)}
						{enableTokensChart && (
							<ChartByType
								type={props.protocolSummary.type}
								protocolName={props.protocolSummary.slug}
								chartType="tokens"
							/>
						)}
						{enableChainsChart && (
							<ChartByType
								type={props.protocolSummary.type}
								protocolName={props.protocolSummary.slug}
								chartType="chain"
							/>
						)}
					</div>
				</>
			)}
		</Layout>
	)
}
