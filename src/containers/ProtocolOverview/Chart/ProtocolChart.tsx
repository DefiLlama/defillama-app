import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useLocalStorageSettingsManager, useDarkModeManager } from '~/contexts/LocalStorage'
import type { IChartProps } from '~/components/ECharts/types'
import { LazyChart } from '~/components/LazyChart'
import { BAR_CHARTS } from './utils'
import { useFetchAndFormatChartData } from './useFetchAndFormatChartData'
import { EmbedChart } from '~/components/EmbedChart'
import { IFusedProtocolData, NftVolumeData } from '~/api/types'
import { transparentize } from 'polished'

const AreaChart = dynamic(() => import('./Chart'), {
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
	'dexVolume',
	'perpsVolume',
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
	'perpsAggregators',
	'bridgeAggregators',
	'dexAggregators'
]

const ProtocolChart = React.memo(function ProtocolChart({
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
	const [extraTvlEnabled] = useLocalStorageSettingsManager('tvl')
	const [isThemeDark] = useDarkModeManager()

	const toggledMetrics = React.useMemo(() => {
		const toggled = enabled || {
			...router.query,
			...((!metrics.tvl
				? metrics.dexs
					? { dexVolume: router.query.dexVolume ?? 'true' }
					: metrics.perps
					? { perpsVolume: router.query.perpsVolume ?? 'true' }
					: metrics.options
					? { premiumVolume: router.query.premiumVolume ?? 'true' }
					: metrics.dexAggregators
					? { dexAggregators: router.query.dexAggregators ?? 'true' }
					: metrics.bridgeAggregators
					? { bridgeAggregators: router.query.bridgeAggregators ?? 'true' }
					: metrics.perpsAggregators
					? { perpsAggregators: router.query.perpsAggregators ?? 'true' }
					: metrics.bridge
					? { bridgeVolume: router.query.bridgeVolume ?? 'true' }
					: metrics.fees
					? {
							fees: router.query.fees ?? 'true',
							...(metrics.revenue ? { revenue: router.query.revenue ?? 'true' } : {})
					  }
					: metrics.unlocks
					? { unlocks: router.query.unlocks ?? 'true' }
					: metrics.treasury
					? { treasury: router.query.treasury ?? 'true' }
					: {}
				: {}) as Record<string, string>)
		}

		return {
			...toggled,
			tvl: router.query.tvl === 'false' ? 'false' : 'true',
			events: router.query.events === 'false' ? 'false' : 'true'
		} as any
	}, [enabled, router, metrics])

	const { fetchingTypes, isLoading, chartData, chartsUnique, unlockTokenSymbol, valueSymbol } =
		useFetchAndFormatChartData({
			isRouterReady: router.isReady,
			denomination: toggledMetrics.denomination,
			groupBy: toggledMetrics.groupBy,
			tvl: toggledMetrics.tvl,
			mcap: toggledMetrics.mcap,
			tokenPrice: toggledMetrics.tokenPrice,
			fdv: toggledMetrics.fdv,
			volume: toggledMetrics.dexVolume,
			perpsVolume: toggledMetrics.perpsVolume,
			premiumVolume: toggledMetrics.premiumVolume,
			fees: toggledMetrics.fees,
			revenue: toggledMetrics.revenue,
			unlocks: toggledMetrics.unlocks,
			activeAddresses: toggledMetrics.activeAddresses,
			newAddresses: toggledMetrics.newAddresses,
			events: toggledMetrics.events,
			transactions: toggledMetrics.transactions,
			gasUsed: toggledMetrics.gasUsed,
			staking: toggledMetrics.staking,
			borrowed: toggledMetrics.borrowed,
			medianApy: toggledMetrics.medianApy,
			usdInflows: toggledMetrics.usdInflows,
			governance: toggledMetrics.governance,
			treasury: toggledMetrics.treasury,
			bridgeVolume: toggledMetrics.bridgeVolume,
			tokenVolume: toggledMetrics.tokenVolume,
			tokenLiquidity: toggledMetrics.tokenLiquidity,
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
			twitter: toggledMetrics.twitter,
			twitterHandle,
			devMetrics: toggledMetrics.devMetrics,
			contributersMetrics: toggledMetrics.contributersMetrics,
			contributersCommits: toggledMetrics.contributersCommits,
			devCommits: toggledMetrics.devCommits,
			nftVolume: toggledMetrics.nftVolume,
			nftVolumeData,
			aggregators: toggledMetrics.dexAggregators,
			perpsAggregators: toggledMetrics.perpsAggregators,
			bridgeAggregators: toggledMetrics.bridgeAggregators
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

	const { chartOptions } = React.useMemo(() => {
		const options: Array<{ label: string; key: string; colors?: Record<string, string> }> = []
		if (protocolData?.tvlByChain?.length > 0) {
			options.push({ label: isCEX ? 'Total Assets' : 'TVL', key: 'tvl' })
		}
		if (geckoId) {
			options.push({ label: 'Mcap', key: 'mcap' })
			options.push({ label: `${tokenSymbol} Price`, key: 'tokenPrice' })
			options.push({ label: `${tokenSymbol} Volume`, key: 'tokenVolume' })
			options.push({ label: `${tokenSymbol} Liquidity`, key: 'tokenLiquidity' })
			options.push({ label: 'FDV', key: 'fdv' })
		}
		if (metrics?.bridge) {
			options.push({ label: 'Bridge Volume', key: 'bridgeVolume' })
		}
		if (metrics?.dexs) {
			options.push({ label: 'DEX Volume', key: 'dexVolume' })
		}
		if (metrics?.perps) {
			options.push({ label: 'Perps Volume', key: 'perpsVolume' })
		}
		if (metrics?.perpsAggregators) {
			options.push({ label: 'Perps Aggregators Volume', key: 'perpsAggregators' })
		}
		if (metrics?.options) {
			options.push({ label: 'Options Volume', key: 'premiumVolume' })
		}
		if (metrics?.fees) {
			options.push({ label: 'Fees', key: 'fees' })
		}
		if (metrics?.revenue) {
			options.push({ label: 'Revenue', key: 'revenue' })
		}
		if (metrics?.unlocks) {
			options.push({ label: 'Unlocks', key: 'unlocks' })
		}
		if (activeUsersId) {
			options.push({ label: 'Active Addresses', key: 'activeAddresses' })
			options.push({ label: 'New Addresses', key: 'newAddresses' })
			options.push({ label: 'Transactions', key: 'transactions' })
		}
		if (historicalChainTvls['staking']?.tvl?.length > 0) {
			options.push({ label: 'Staking', key: 'staking' })
		}
		if (historicalChainTvls['borrowed']?.tvl?.length > 0) {
			options.push({ label: 'Borrowed', key: 'borrowed' })
		}
		if (metrics?.medianApy) {
			options.push({ label: 'Median APY', key: 'medianApy' })
		}
		if (!isHourlyChart && metrics.inflows) {
			options.push({ label: 'USD Inflows', key: 'usdInflows' })
		}
		if (governanceApis?.length > 0) {
			options.push({ label: 'Governance', key: 'Governance' })
		}
		if (metrics?.treasury) {
			options.push({ label: 'Treasury', key: 'treasury' })
		}
		if (hallmarks?.length > 0) {
			options.push({ label: 'Events', key: 'events' })
		}
		if (metrics?.devMetrics) {
			options.push({ label: 'Developers', key: 'devMetrics' })
			options.push({ label: 'Developer Commits', key: 'devCommits' })
		}
		if (metrics?.nftVolume) {
			options.push({ label: 'NFT Volume', key: 'nftVolume' })
		}
		if (metrics?.dexAggregators) {
			options.push({ label: 'DEX Aggregators Volume', key: 'dexAggregators' })
		}
		if (metrics?.bridgeAggregators) {
			options.push({ label: 'Bridge Aggregators Volume', key: 'bridgeAggregators' })
		}

		return {
			chartOptions: options.map((option) => {
				const primaryColor =
					option.label === 'Total Assets'
						? chartColors['TVL']
						: option.label === 'Developer Commits'
						? chartColors['Devs Commits']
						: chartColors[option.label.startsWith('$') ? `Token ${option.label.split(' ')[1]}` : option.label]
				return {
					...option,
					colors: primaryColor
						? {
								'--primary-color': primaryColor,
								'--btn-bg': transparentize(0.9, primaryColor),
								'--btn-hover-bg': transparentize(0.8, primaryColor)
						  }
						: {}
				}
			})
		}
	}, [
		metrics,
		historicalChainTvls,
		governanceApis,
		isHourlyChart,
		geckoId,
		activeUsersId,
		hallmarks,
		tokenSymbol,
		isCEX,
		protocolData,
		chartColors
	])

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
				events={toggledMetrics.events}
				hallmarks={hallmarks}
				chartColors={chartColors}
				bobo={bobo}
				unlockTokenSymbol={unlockTokenSymbol}
				isThemeDark={isThemeDark}
				groupBy={toggledMetrics.groupBy}
			/>
		)

	return (
		<div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2">
			{chartOptions.length > 0 ? (
				<div className="flex items-center gap-2 flex-wrap m-3">
					{chartOptions.map((coption) => (
						<label
							className="text-sm cursor-pointer flex items-center gap-1 flex-nowrap"
							key={`${protocolData.name}-${coption.key}`}
							style={coption.colors as any}
						>
							<input
								type="checkbox"
								value={coption.key}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: {
												...router.query,
												[coption.key]: toggledMetrics[coption.key] === 'true' ? 'false' : 'true'
											}
										},
										undefined,
										{ shallow: true }
									)
								}
								checked={toggledMetrics[coption.key] === 'true'}
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>
							<span
								className={`border ${
									toggledMetrics[coption.key] === 'true'
										? 'border-[var(--btn-hover-bg)] bg-[var(--btn-bg)]'
										: 'border-[#E2E2E2] bg-[#E2E2E2] dark:bg-[#2A2C2E] dark:border-[#2A2C2E]'
								} rounded p-[2px] h-[18px] w-[34px]`}
							>
								{toggledMetrics[coption.key] !== 'true' ? (
									<span className="block h-3 w-3 bg-[#707A7A] rounded-[3px] flex-shrink-0 mr-auto"></span>
								) : (
									<span className="block h-3 w-3 bg-[var(--primary-color)] rounded-[3px] flex-shrink-0 ml-auto"></span>
								)}
							</span>
							<span>{coption.label}</span>
						</label>
					))}
				</div>
			) : null}

			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:justify-end mx-3 first:mt-3">
				{chartDenominations.length > 0 && (
					<div className="mr-auto text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-[var(--btn-hover-bg)]">
						{chartDenominations.map((D) => (
							<Link
								href={
									realPathname +
									`denomination=${D.symbol}` +
									(toggledMetrics.groupBy ? `&groupBy=${toggledMetrics.groupBy}` : '')
								}
								key={D.symbol}
								shallow
								passHref
							>
								<a
									className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--btn-bg)] focus-visible:bg-[var(--btn-bg)] data-[active=true]:bg-[var(--btn-hover-bg)]"
									data-active={
										toggledMetrics.denomination === D.symbol || (D.symbol === 'USD' && !toggledMetrics.denomination)
									}
								>
									{D.symbol}
								</a>
							</Link>
						))}
					</div>
				)}

				{hasAtleasOneBarChart ? (
					<>
						<div className="ml-auto text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-[var(--btn-hover-bg)]">
							<Link
								href={
									realPathname +
									(toggledMetrics.denomination ? `denomination=${toggledMetrics.denomination}&` : '') +
									'groupBy=daily'
								}
								shallow
								passHref
							>
								<a
									className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--btn-hover-bg)]"
									data-active={toggledMetrics.groupBy === 'daily' || !toggledMetrics.groupBy}
								>
									Daily
								</a>
							</Link>
							<Link
								href={
									realPathname +
									(toggledMetrics.denomination ? `denomination=${toggledMetrics.denomination}&` : '') +
									'groupBy=weekly'
								}
								shallow
								passHref
							>
								<a
									className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--btn-hover-bg)]"
									data-active={toggledMetrics.groupBy === 'weekly'}
								>
									Weekly
								</a>
							</Link>
							<Link
								href={
									realPathname +
									(toggledMetrics.denomination ? `denomination=${toggledMetrics.denomination}&` : '') +
									'groupBy=monthly'
								}
								shallow
								passHref
							>
								<a
									className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--btn-hover-bg)]"
									data-active={toggledMetrics.groupBy === 'monthly'}
								>
									Monthly
								</a>
							</Link>
							<Link
								href={
									realPathname +
									(toggledMetrics.denomination ? `denomination=${toggledMetrics.denomination}&` : '') +
									'groupBy=cumulative'
								}
								shallow
								passHref
							>
								<a
									className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--btn-hover-bg)]"
									data-active={toggledMetrics.groupBy === 'cumulative'}
								>
									Cumulative
								</a>
							</Link>
						</div>
					</>
				) : null}

				<EmbedChart color={color} />
			</div>

			<ProtocolChartOnly
				isRouterReady={router.isReady}
				isLoading={isLoading}
				fetchingTypes={fetchingTypes}
				chartData={chartData}
				color={color}
				valueSymbol={valueSymbol}
				chartsUnique={chartsUnique}
				events={toggledMetrics.events}
				hallmarks={hallmarks}
				chartColors={chartColors}
				bobo={bobo}
				unlockTokenSymbol={unlockTokenSymbol}
				isThemeDark={isThemeDark}
				groupBy={toggledMetrics.groupBy}
			/>
		</div>
	)
})

export default ProtocolChart

export const ProtocolChartOnly = React.memo(function ProtocolChartOnly({
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
	groupBy
}: any) {
	return (
		<LazyChart className="col-span-1 min-h-[360px]">
			{!isRouterReady ? null : isLoading ? (
				<p className="relative text-center top-[50%]">{`Fetching ${fetchingTypes.join(', ')} ...`}</p>
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
					style={
						bobo
							? {
									backgroundImage: 'url("/bobo.png")',
									backgroundSize: '100% 360px',
									backgroundRepeat: 'no-repeat',
									backgroundPosition: 'bottom'
							  }
							: undefined
					}
					unlockTokenSymbol={unlockTokenSymbol}
					isThemeDark={isThemeDark}
					groupBy={groupBy}
				/>
			)}
		</LazyChart>
	)
})
