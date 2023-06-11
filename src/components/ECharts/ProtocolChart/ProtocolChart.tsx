import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { useDefiManager } from '~/contexts/LocalStorage'
import type { IChartProps } from '../types'
import { LazyChart } from '~/layout/ProtocolAndPool'
import { Denomination, Filters, FiltersWrapper, Toggle } from './Misc'
import { BAR_CHARTS } from './utils'
import { useFetchAndFormatChartData } from './useFetchAndFormatChartData'
import { EmbedChart } from '~/components/Popover'

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
}

const CHART_TYPES = [
	'tvl',
	'mcap',
	'tokenPrice',
	'tokenVolume',
	'tokenLiquidity',
	'fdv',
	'volume',
	'fees',
	'revenue',
	'unlocks',
	'activeUsers',
	'newUsers',
	'transactions',
	'gasUsed',
	'events',
	'staking',
	'borrowed',
	'medianApy',
	'usdInflows',
	'governance',
	'bridgeVolume'
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
	tokenSymbol,
	protocolId,
	chartDenominations
}: IProps) {
	const router = useRouter()

	const [extraTvlEnabled] = useDefiManager()

	const {
		denomination,
		groupBy,
		tvl,
		mcap,
		tokenPrice,
		fdv,
		volume,
		fees,
		revenue,
		unlocks,
		activeUsers,
		newUsers,
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
		tokenLiquidity
	} = router.query

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
			fees,
			revenue,
			unlocks,
			activeUsers,
			newUsers,
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
			usdInflowsData
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

	return (
		<Wrapper>
			{geckoId ||
			hallmarks?.length > 0 ||
			metrics.bridge ||
			metrics.fees ||
			metrics.dexs ||
			metrics.unlocks ||
			activeUsersId ||
			historicalChainTvls['borrowed']?.tvl?.length > 0 ||
			historicalChainTvls['staking']?.tvl?.length > 0 ||
			metrics.medianApy ||
			(metrics.inflows && !isHourlyChart ? true : false) ||
			(governanceApis && governanceApis.length > 0) ||
			metrics.treasury ? (
				<ToggleWrapper>
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
									value="activeUsers"
									checked={activeUsers === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, activeUsers: activeUsers === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Active Users</span>
								</span>
							</Toggle>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="newUsers"
									checked={newUsers === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, newUsers: newUsers === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>New Users</span>
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

				{!isHourlyChart && hasAtleasOneBarChart ? (
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
				isDarkMode={null}
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
	isDarkMode
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
					isDarkMode={isDarkMode}
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
