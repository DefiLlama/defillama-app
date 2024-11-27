import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

import dynamic from 'next/dynamic'
import { useDefiManager, useDarkModeManager } from '~/contexts/LocalStorage'
import type { IChartProps } from '../types'
import { LazyChart } from '~/components/LazyChart'
import { BAR_CHARTS } from './utils'
import { useFetchAndFormatChartData } from './useFetchAndFormatChartData'
import { EmbedChart } from '~/components/Popover'
import { IFusedProtocolData, NftVolumeData } from '~/api/types'
import { transparentize } from 'polished'

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
	} = enabled || {
		...router.query,
		...((!metrics.tvl
			? metrics.fees
				? { fees: router.query.fees ?? 'true', ...(metrics.revenue ? { revenue: router.query.revenue ?? 'true' } : {}) }
				: metrics.dexs
				? { dexs: router.query.dexs ?? 'true' }
				: metrics.derivatives
				? { derivativesVolume: router.query.derivativesVolume ?? 'true' }
				: metrics.options
				? { premiumVolume: router.query.premiumVolume ?? 'true' }
				: metrics.aggregators
				? { aggregators: router.query.aggregators ?? 'true' }
				: metrics.derivativesAggregators
				? { derivativesAggregators: router.query.derivativesAggregators ?? 'true' }
				: metrics.bridge
				? { bridgeVolume: router.query.bridgeVolume ?? 'true' }
				: metrics.unlocks
				? { unlocks: router.query.unlocks ?? 'true' }
				: {}
			: {}) as Record<string, string>)
	}

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
		<div className="flex flex-col gap-4 py-3 col-span-1">
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
				<div
					className="flex items-center gap-2 flex-wrap mx-4"
					style={{ '--bg': transparentize(0.8, color), '--active-bg': transparentize(0.4, color) } as any}
				>
					{protocolData?.tvlByChain?.length > 0 ? (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								{isCEX ? 'Total Assets' : 'TVL'}
							</span>
						</label>
					) : null}

					{geckoId && (
						<>
							<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
									className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
								/>

								<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
									Mcap
								</span>
							</label>

							<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
									className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
								/>

								<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
									{tokenSymbol} Price
								</span>
							</label>

							<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
									className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
								/>

								<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
									{tokenSymbol} Volume
								</span>
							</label>

							{metrics.tokenLiquidity && (
								<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
										className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
									/>

									<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
										{tokenSymbol} Liquidity
									</span>
								</label>
							)}

							<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
									className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
								/>

								<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
									FDV
								</span>
							</label>
						</>
					)}

					{metrics.bridge && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Bridge Volume
							</span>
						</label>
					)}

					{metrics.dexs && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Volume
							</span>
						</label>
					)}

					{metrics.derivatives && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Derivatives Volume
							</span>
						</label>
					)}
					{metrics.derivativesAggregators && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Derivatives Aggregators
							</span>
						</label>
					)}

					{metrics.options && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Options Volume
							</span>
						</label>
					)}

					{metrics.fees && (
						<>
							<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
									className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
								/>

								<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
									Fees
								</span>
							</label>

							{metrics?.revenue && (
								<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
										className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
									/>

									<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
										Revenue
									</span>
								</label>
							)}
						</>
					)}

					{metrics.unlocks && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Unlocks
							</span>
						</label>
					)}

					{activeUsersId && (
						<>
							<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
									className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
								/>

								<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
									Active Addresses
								</span>
							</label>
							<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
									className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
								/>

								<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
									New Addresses
								</span>
							</label>
							<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
									className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
								/>

								<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
									Transactions
								</span>
							</label>
							<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
									className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
								/>

								<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
									Gas Used
								</span>
							</label>
						</>
					)}

					{historicalChainTvls['staking']?.tvl?.length > 0 && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Staking
							</span>
						</label>
					)}

					{historicalChainTvls['borrowed']?.tvl?.length > 0 && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Borrowed
							</span>
						</label>
					)}

					{metrics.medianApy && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Median APY
							</span>
						</label>
					)}

					{!isHourlyChart && metrics.inflows && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								USD Inflows
							</span>
						</label>
					)}

					{governanceApis?.length > 0 && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Governance
							</span>
						</label>
					)}

					{metrics.treasury && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Treasury
							</span>
						</label>
					)}

					{hallmarks?.length > 0 && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Events
							</span>
						</label>
					)}
					{twitterHandle && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Tweets
							</span>
						</label>
					)}

					{metrics.devMetrics && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Developers
							</span>
						</label>
					)}

					{metrics.devMetrics && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Developer Commits
							</span>
						</label>
					)}

					{metrics.nftVolume && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								NFT Volume
							</span>
						</label>
					)}

					{metrics.aggregators && (
						<label className="text-sm font-medium cursor-pointer rounded-xl hover:bg-[var(--bg)]">
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
								className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
							/>

							<span className="flex items-center relative z-[1] py-2 px-3 rounded-xl bg-[var(--bg)] peer-checked:bg-[var(--active-bg)] peer-focus-visible:outline">
								Aggregators Volume
							</span>
						</label>
					)}
				</div>
			) : null}

			<div className="flex flex-col gap-2 mx-4 sm:flex-row sm:items-center sm:flex-wrap sm:justify-between">
				{chartDenominations.length > 0 && (
					<div
						style={{ backgroundColor: transparentize(0.8, color) }}
						className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full max-w-fit bg-[rgba(33,114,229,0.2)] mr-auto"
					>
						{chartDenominations.map((D) => (
							<Link
								href={realPathname + `denomination=${D.symbol}` + (groupBy ? `&groupBy=${groupBy}` : '')}
								key={D.symbol}
								shallow
								passHref
							>
								<a
									className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
									data-active={denomination === D.symbol || (D.symbol === 'USD' && !denomination)}
								>
									{D.symbol}
								</a>
							</Link>
						))}
					</div>
				)}

				{hasAtleasOneBarChart ? (
					<>
						<div
							style={{ backgroundColor: transparentize(0.8, color) }}
							className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full max-w-fit ml-auto"
						>
							<Link
								href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=daily'}
								shallow
								passHref
							>
								<a
									className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
									data-active={groupBy === 'daily' || !groupBy}
								>
									Daily
								</a>
							</Link>
							<Link
								href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=weekly'}
								shallow
								passHref
							>
								<a
									className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
									data-active={groupBy === 'weekly'}
								>
									Weekly
								</a>
							</Link>
							<Link
								href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=monthly'}
								shallow
								passHref
							>
								<a
									className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
									data-active={groupBy === 'monthly'}
								>
									Monthly
								</a>
							</Link>
							<Link
								href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=cumulative'}
								shallow
								passHref
							>
								<a
									className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
									data-active={groupBy === 'cumulative'}
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
				events={events}
				hallmarks={hallmarks}
				chartColors={chartColors}
				bobo={bobo}
				unlockTokenSymbol={unlockTokenSymbol}
				isThemeDark={isThemeDark}
				isMonthly={groupBy === 'monthly'}
			/>
		</div>
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
