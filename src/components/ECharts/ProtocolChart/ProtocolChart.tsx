import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { useDefiManager, useDarkModeManager } from '~/contexts/LocalStorage'
import type { IChartProps } from '../types'
import { LazyChart } from '~/layout/ProtocolAndPool'
import { Denomination, Filters, FiltersWrapper, Toggle } from './Misc'
import { BAR_CHARTS } from './utils'
import { useFetchAndFormatChartData } from './useFetchAndFormatChartData'
import { EmbedChart } from '~/components/Popover'
import { IFusedProtocolData, NftVolumeData } from '~/api/types'

const AreaChart = dynamic(() => import('.'), {
	ssr: false
}) as React.FC<IChartProps>

interface IProps {
	protocol: string
	color: string
	historicalChainTvls: {}
	chartDenominations: Array<{ symbol: string; geckoId?: string | null }>
	bobo?: boolean
	hallmarks?: Array<[number, string]> | null
	geckoId?: string | null
	chartColors: { [type: string]: string }
	metrics: { [metric: string]: boolean }
	activeUsersId: number | string | null
	usdInflowsData: Array<[string, number]> | null
	governanceApis: Array<string> | null
	isHourlyChart?: boolean
	isCEX?: boolean
	tokenSymbol?: string
	protocolId: string
	twitterHandle?: string
	nftVolumeData: NftVolumeData
	protocolData?: IFusedProtocolData
	enabled?: Record<string, boolean>
}

const CHART_TYPES = [
	'tvl',
	'mcap',
	'tokenPrice',
	'tokenVolume',
	'tokenLiquidity',
	'fdv',
	'volume',
	'derivativesVolume',
	'premiumVolume',
	'fees',
	'revenue',
	'unlocks',
	'activeAddresses',
	'newAddresses',
	'transactions',
	'gasUsed',
	'events',
	'staking',
	'borrowed',
	'medianApy',
	'usdInflows',
	'governance',
	'bridgeVolume',
	'twitter',
	'devMetrics',
	'contributersMetrics',
	'contributersCommits',
	'devCommits',
	'nftVolume',
	'derivativesAggregators'
]

export default function ProtocolChart({
	protocol,
	color,
	historicalChainTvls,
	bobo = false,
	hallmarks,
	geckoId,
	chartColors,
	metrics,
	activeUsersId,
	usdInflowsData,
	governanceApis,
	isHourlyChart,
	isCEX,
	tokenSymbol = 'Token',
	protocolId,
	chartDenominations,
	twitterHandle,
	nftVolumeData,
	protocolData,
	enabled = null
}: IProps) {
	const router = useRouter()

	const [extraTvlEnabled] = useDefiManager()
	const [isThemeDark] = useDarkModeManager()

	const {
		denomination,
		groupBy,
		tvl,
		mcap,
		tokenPrice,
		fdv,
		volume,
		derivativesVolume,
		fees,
		revenue,
		unlocks,
		activeAddresses,
		newAddresses,
		events,
		transactions,
		gasUsed,
		staking,
		borrowed,
		medianApy,
		usdInflows,
		governance,
		treasury,
		bridgeVolume,
		tokenVolume,
		tokenLiquidity,
		twitter,
		devMetrics,
		contributersMetrics,
		contributersCommits,
		devCommits,
		nftVolume,
		aggregators,
		premiumVolume,
		derivativesAggregators
	} = enabled || router.query

	const { fetchingTypes, isLoading, chartData, chartsUnique, unlockTokenSymbol, valueSymbol } =
		useFetchAndFormatChartData({
			isRouterReady: router.isReady,
			denomination,
			groupBy,
			tvl,
			mcap,
			tokenPrice,
			fdv,
			volume,
			derivativesVolume,
			premiumVolume,
			fees,
			revenue,
			unlocks,
			activeAddresses,
			newAddresses,
			events,
			transactions,
			gasUsed,
			staking,
			borrowed,
			medianApy,
			usdInflows,
			governance,
			treasury,
			bridgeVolume,
			tokenVolume,
			tokenLiquidity,
			protocol,
			chartDenominations,
			geckoId,
			metrics,
			activeUsersId,
			governanceApis,
			protocolId,
			historicalChainTvls,
			extraTvlEnabled,
			isHourlyChart,
			usdInflowsData,
			twitter,
			twitterHandle,
			devMetrics,
			contributersMetrics,
			contributersCommits,
			devCommits,
			nftVolume,
			nftVolumeData,
			aggregators,
			derivativesAggregators
		})

	const realPathname =
		`/${isCEX ? 'cex' : 'protocol'}/${protocol}?` +
		CHART_TYPES.reduce((acc, curr) => {
			if (router.query[curr]) {
				acc += `${curr}=${router.query[curr]}&`
			}
			return acc
		}, '')

	const hasAtleasOneBarChart = chartsUnique.reduce((acc, curr) => {
		if (BAR_CHARTS.includes(curr)) {
			acc = true
		}

		return acc
	}, false)

	if (enabled)
		return (
			<ProtocolChartOnly
				isRouterReady={router.isReady}
				isLoading={isLoading}
				fetchingTypes={fetchingTypes}
				chartData={chartData}
				color={color}
				valueSymbol={valueSymbol}
				chartsUnique={chartsUnique}
				events={events}
				hallmarks={hallmarks}
				chartColors={chartColors}
				bobo={bobo}
				unlockTokenSymbol={unlockTokenSymbol}
				isThemeDark={isThemeDark}
				isMonthly={groupBy === 'monthly'}
			/>
		)

	return (
		<Wrapper>
			{geckoId ||
			hallmarks?.length > 0 ||
			metrics.bridge ||
			metrics.fees ||
			metrics.dexs ||
			metrics.derivatives ||
			metrics.options ||
			metrics.unlocks ||
			metrics.aggregators ||
			metrics.derivativesAggregators ||
			activeUsersId ||
			historicalChainTvls['borrowed']?.tvl?.length > 0 ||
			historicalChainTvls['staking']?.tvl?.length > 0 ||
			metrics.medianApy ||
			(metrics.inflows && !isHourlyChart ? true : false) ||
			(governanceApis && governanceApis.length > 0) ||
			metrics.treasury ? (
				<ToggleWrapper>
					{protocolData?.tvlByChain?.length > 0 ? (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="tvl"
								checked={tvl !== 'false'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, tvl: tvl === 'false' ? true : false }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>{isCEX ? 'Total Assets' : 'TVL'}</span>
							</span>
						</Toggle>
					) : null}

					{geckoId && (
						<>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="mcap"
									checked={mcap === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, mcap: mcap === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Mcap</span>
								</span>
							</Toggle>

							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="tokenPrice"
									checked={tokenPrice === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, tokenPrice: tokenPrice === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>{tokenSymbol} Price</span>
								</span>
							</Toggle>

							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="tokenVolume"
									checked={tokenVolume === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, tokenVolume: tokenVolume === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>{tokenSymbol} Volume</span>
								</span>
							</Toggle>

							{metrics.tokenLiquidity && (
								<Toggle backgroundColor={color}>
									<input
										type="checkbox"
										value="tokenLiquidity"
										checked={tokenLiquidity === 'true'}
										onChange={() =>
											router.push(
												{
													pathname: router.pathname,
													query: { ...router.query, tokenLiquidity: tokenLiquidity === 'true' ? false : true }
												},
												undefined,
												{ shallow: true }
											)
										}
									/>
									<span data-wrapper="true">
										<span>{tokenSymbol} Liquidity</span>
									</span>
								</Toggle>
							)}

							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="fdv"
									checked={fdv === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, fdv: fdv === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>FDV</span>
								</span>
							</Toggle>
						</>
					)}

					{metrics.bridge && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="bridgeVolume"
								checked={bridgeVolume === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, bridgeVolume: bridgeVolume === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Bridge Volume</span>
							</span>
						</Toggle>
					)}

					{metrics.dexs && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="volume"
								checked={volume === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, volume: volume === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Volume</span>
							</span>
						</Toggle>
					)}

					{metrics.derivatives && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="derivativesVolume"
								checked={derivativesVolume === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, derivativesVolume: derivativesVolume === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Derivatives Volume</span>
							</span>
						</Toggle>
					)}
					{metrics.derivativesAggregators && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="derivativesAggregators"
								checked={derivativesAggregators === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: {
												...router.query,
												derivativesAggregators: derivativesAggregators === 'true' ? false : true
											}
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Derivatives Aggregators</span>
							</span>
						</Toggle>
					)}

					{metrics.options && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="premiumVolume"
								checked={premiumVolume === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, premiumVolume: premiumVolume === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Options Volume</span>
							</span>
						</Toggle>
					)}

					{metrics.fees && (
						<>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="fees"
									checked={fees === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, fees: fees === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Fees</span>
								</span>
							</Toggle>

							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="revenue"
									checked={revenue === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, revenue: revenue === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Revenue</span>
								</span>
							</Toggle>
						</>
					)}

					{metrics.unlocks && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="unlocks"
								checked={unlocks === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, unlocks: unlocks === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Unlocks</span>
							</span>
						</Toggle>
					)}

					{activeUsersId && (
						<>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="activeAddresses"
									checked={activeAddresses === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, activeAddresses: activeAddresses === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Active Addresses</span>
								</span>
							</Toggle>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="newAddresses"
									checked={newAddresses === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, newAddresses: newAddresses === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>New Addresses</span>
								</span>
							</Toggle>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="transactions"
									checked={transactions === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, transactions: transactions === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Transactions</span>
								</span>
							</Toggle>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="gasUsed"
									checked={gasUsed === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, gasUsed: gasUsed === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Gas Used</span>
								</span>
							</Toggle>
						</>
					)}

					{historicalChainTvls['staking']?.tvl?.length > 0 && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="staking"
								checked={staking === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, staking: staking === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Staking</span>
							</span>
						</Toggle>
					)}

					{historicalChainTvls['borrowed']?.tvl?.length > 0 && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="borrowed"
								checked={borrowed === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, borrowed: borrowed === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Borrowed</span>
							</span>
						</Toggle>
					)}

					{metrics.medianApy && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="medianApy"
								checked={medianApy === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, medianApy: medianApy === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Median APY</span>
							</span>
						</Toggle>
					)}

					{!isHourlyChart && metrics.inflows && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="usdInflows"
								checked={usdInflows === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, usdInflows: usdInflows === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>USD Inflows</span>
							</span>
						</Toggle>
					)}

					{governanceApis?.length > 0 && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="governance"
								checked={governance === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, governance: governance === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Governance</span>
							</span>
						</Toggle>
					)}

					{metrics.treasury && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="treasury"
								checked={treasury === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, treasury: treasury === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Treasury</span>
							</span>
						</Toggle>
					)}

					{hallmarks?.length > 0 && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="events"
								checked={events !== 'false'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, events: events === 'false' ? true : false }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Events</span>
							</span>
						</Toggle>
					)}
					{twitterHandle && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="twitter"
								checked={twitter === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, twitter: twitter === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Tweets</span>
							</span>
						</Toggle>
					)}

					{metrics.devMetrics && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="devMetrics"
								checked={devMetrics === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, devMetrics: devMetrics === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Developers</span>
							</span>
						</Toggle>
					)}

					{metrics.devMetrics && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="devCommits"
								checked={devCommits === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, devCommits: devCommits === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Developer Commits</span>
							</span>
						</Toggle>
					)}

					{metrics.nftVolume && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="nftVolume"
								checked={nftVolume === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, nftVolume: nftVolume === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>NFT Volume</span>
							</span>
						</Toggle>
					)}

					{metrics.aggregators && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="aggregators"
								checked={aggregators === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, aggregators: aggregators === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Aggregators Volume</span>
							</span>
						</Toggle>
					)}
				</ToggleWrapper>
			) : null}

			<FiltersWrapper>
				{chartDenominations.length > 0 && (
					<Filters color={color} style={{ marginRight: 'auto' }}>
						{chartDenominations.map((D) => (
							<Link
								href={realPathname + `denomination=${D.symbol}` + (groupBy ? `&groupBy=${groupBy}` : '')}
								key={D.symbol}
								shallow
								passHref
							>
								<Denomination active={denomination === D.symbol || (D.symbol === 'USD' && !denomination)}>
									{D.symbol}
								</Denomination>
							</Link>
						))}
					</Filters>
				)}

				{hasAtleasOneBarChart ? (
					<>
						<Filters color={color}>
							<Link
								href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=daily'}
								shallow
								passHref
							>
								<Denomination active={groupBy === 'daily' || !groupBy}>Daily</Denomination>
							</Link>
							<Link
								href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=weekly'}
								shallow
								passHref
							>
								<Denomination active={groupBy === 'weekly'}>Weekly</Denomination>
							</Link>
							<Link
								href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=monthly'}
								shallow
								passHref
							>
								<Denomination active={groupBy === 'monthly'}>Monthly</Denomination>
							</Link>
							<Link
								href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=cumulative'}
								shallow
								passHref
							>
								<Denomination active={groupBy === 'cumulative'}>Cumulative</Denomination>
							</Link>
						</Filters>
					</>
				) : null}

				<EmbedChart color={color} />
			</FiltersWrapper>

			<ProtocolChartOnly
				isRouterReady={router.isReady}
				isLoading={isLoading}
				fetchingTypes={fetchingTypes}
				chartData={chartData}
				color={color}
				valueSymbol={valueSymbol}
				chartsUnique={chartsUnique}
				events={events}
				hallmarks={hallmarks}
				chartColors={chartColors}
				bobo={bobo}
				unlockTokenSymbol={unlockTokenSymbol}
				isThemeDark={isThemeDark}
				isMonthly={groupBy === 'monthly'}
			/>
		</Wrapper>
	)
}

export const ProtocolChartOnly = ({
	isRouterReady,
	isLoading,
	fetchingTypes,
	chartData,
	color,
	valueSymbol,
	chartsUnique,
	events,
	hallmarks,
	chartColors,
	bobo,
	unlockTokenSymbol,
	isThemeDark,
	isMonthly
}) => {
	return (
		<LazyChart style={{ padding: 0, minHeight: '360px' }}>
			{!isRouterReady ? null : isLoading ? (
				<p style={{ position: 'relative', top: '180px', textAlign: 'center' }}>{`Fetching ${fetchingTypes.join(
					', '
				)} ...`}</p>
			) : (
				<AreaChart
					chartData={chartData}
					color={color}
					title=""
					valueSymbol={valueSymbol}
					stacks={chartsUnique}
					hallmarks={!(events === 'false') && hallmarks}
					tooltipSort={false}
					stackColors={chartColors}
					style={{
						...(bobo && {
							backgroundImage: 'url("/bobo.png")',
							backgroundSize: '100% 360px',
							backgroundRepeat: 'no-repeat',
							backgroundPosition: 'bottom'
						})
					}}
					unlockTokenSymbol={unlockTokenSymbol}
					isThemeDark={isThemeDark}
					isMonthly={isMonthly}
				/>
			)}
		</LazyChart>
	)
}

export const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 16px 0;
	grid-column: span 1;
`

const ToggleWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin: 0 16px;
`

export { Denomination, Filters, Toggle }
