import { TokenLogo } from '~/components/TokenLogo'
import { IChainOverviewData } from './types'
import { capitalizeFirstLetter, chainIconUrl, formattedNum, slug } from '~/utils'
import { Tooltip } from '~/components/Tooltip'
import { useRouter } from 'next/router'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useFetchChainChartData } from './useFetchChainChartData'
import { formatRaisedAmount } from '~/containers/ProtocolOverview/utils'
import { Fragment, lazy, memo, Suspense, useMemo } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { EmbedChart } from '~/components/EmbedChart'
import { chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { chainOverviewChartColors, BAR_CHARTS, chainCharts, ChainChartLabels } from './constants'
import { Icon } from '~/components/Icon'
import dayjs from 'dayjs'
import * as Ariakit from '@ariakit/react'
import { downloadChart } from '~/components/ECharts/utils'

const ChainChart: any = lazy(() => import('~/containers/ChainOverview/Chart'))

const INTERVALS_LIST = ['daily', 'weekly', 'monthly', 'cumulative'] as const

export const Stats = memo(function Stats(props: IChainOverviewData) {
	const router = useRouter()
	const queryParamsString = useMemo(() => {
		return JSON.stringify(router.query ?? {})
	}, [router.query])

	const [darkMode] = useDarkModeManager()

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')

	const { toggledCharts, DENOMINATIONS, chainGeckoId, hasAtleasOneBarChart, groupBy, denomination } = useMemo(() => {
		const queryParams = JSON.parse(queryParamsString)

		let CHAIN_SYMBOL = props.chainTokenInfo?.token_symbol ?? null
		let chainGeckoId = props.chainTokenInfo?.gecko_id ?? null

		if (props.metadata.name !== 'All') {
			if (!chainGeckoId) {
				chainGeckoId = chainCoingeckoIdsForGasNotMcap[props.metadata.name]?.geckoId ?? null
			}

			if (!CHAIN_SYMBOL) {
				CHAIN_SYMBOL = chainCoingeckoIdsForGasNotMcap[props.metadata.name]?.symbol ?? null
			}
		}

		const DENOMINATIONS = CHAIN_SYMBOL ? ['USD', CHAIN_SYMBOL] : ['USD']

		const toggledCharts = props.charts.filter((tchart) =>
			tchart === 'TVL' ? queryParams[chainCharts[tchart]] !== 'false' : queryParams[chainCharts[tchart]] === 'true'
		) as ChainChartLabels[]

		const hasAtleasOneBarChart = toggledCharts.some((chart) => BAR_CHARTS.includes(chart))

		const groupBy =
			hasAtleasOneBarChart && queryParams?.groupBy
				? INTERVALS_LIST.includes(queryParams.groupBy as any)
					? (queryParams.groupBy as any)
					: 'daily'
				: 'daily'

		const denomination = typeof queryParams.currency === 'string' ? queryParams.currency : 'USD'

		return {
			DENOMINATIONS,
			chainGeckoId,
			hasAtleasOneBarChart,
			toggledCharts,
			groupBy,
			denomination
		}
	}, [props, queryParamsString])

	const { totalValueUSD, change24h, valueChange24hUSD, finalCharts, valueSymbol, isFetchingChartData } =
		useFetchChainChartData({
			denomination,
			selectedChain: props.metadata.name,
			tvlChart: props.tvlChart,
			extraTvlCharts: props.extraTvlCharts,
			tvlSettings,
			chainGeckoId,
			toggledCharts,
			groupBy
		})

	const updateGroupBy = (newGroupBy) => {
		router.push(
			{
				pathname: router.pathname,
				query: { ...router.query, groupBy: newGroupBy }
			},
			undefined,
			{ shallow: true }
		)
	}

	const metricsDialogStore = Ariakit.useDialogStore()

	return (
		<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-2">
			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-6 p-2 col-span-2 w-full xl:col-span-1 overflow-x-auto">
				{props.metadata.name !== 'All' && (
					<h1 className="flex items-center flex-nowrap gap-2">
						<TokenLogo logo={chainIconUrl(props.metadata.name)} size={24} />
						<span className="text-xl font-semibold">{props.metadata.name}</span>
					</h1>
				)}
				<div className="flex items-end flex-nowrap justify-between gap-8">
					<h2 className="flex flex-col">
						<Tooltip
							content={
								props.metadata.name === 'All'
									? 'Sum of value of all coins held in smart contracts of all the protocols on all chains'
									: 'Sum of value of all coins held in smart contracts of all the protocols on the chain'
							}
							className="!inline underline decoration-dotted text-[#545757] dark:text-[#cccccc]"
						>
							Total Value Locked in DeFi
						</Tooltip>
						<span className="font-semibold text-2xl font-jetbrains min-h-8 overflow-hidden whitespace-nowrap text-ellipsis">
							{formattedNum(totalValueUSD, true)}
						</span>
					</h2>
					{change24h != null ? (
						<Tooltip
							content={`${formattedNum(valueChange24hUSD, true)}`}
							render={<p />}
							className="flex items-center flex-nowrap gap-2 relative bottom-[2px]"
						>
							<span
								className={`font-jetbrains overflow-hidden whitespace-nowrap text-ellipsis underline decoration-dotted ${
									change24h >= 0 ? 'text-(--pct-green)' : 'text-(--pct-red)'
								}`}
							>
								{`${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%`}
							</span>
							<span className="text-[#545757] dark:text-[#cccccc]">24h</span>
						</Tooltip>
					) : null}
				</div>
				<div className="flex flex-col flex-1 gap-2">
					<h2 className="text-base xl:text-sm font-semibold">Key Metrics</h2>
					<div className="flex flex-col">
						{props.stablecoins?.mcap ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) group-open:font-semibold group-open:border-none group-last:border-none py-1">
									<Tooltip
										content={
											props.metadata.name === 'All'
												? 'Sum of market cap of all stablecoins circulating on all chains'
												: 'Sum of market cap of all stablecoins circulating on the chain'
										}
										className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
									>
										Stablecoins Mcap
									</Tooltip>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
									/>
									<span className="font-jetbrains ml-auto">{formattedNum(props.stablecoins.mcap, true)}</span>
								</summary>
								<div className="flex flex-col mb-3">
									{props.stablecoins.change7d != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">Change (7d)</span>
											<Tooltip
												content={`${formattedNum(props.stablecoins.change7dUsd, true)}`}
												className={`ml-auto justify-end font-jetbrains overflow-hidden whitespace-nowrap text-ellipsis underline decoration-dotted ${
													+props.stablecoins.change7d >= 0 ? 'text-(--pct-green)' : 'text-(--pct-red)'
												}`}
											>
												{`${+props.stablecoins.change7d > 0 ? '+' : ''}${props.stablecoins.change7d}%`}
											</Tooltip>
										</p>
									) : null}
									{props.stablecoins.dominance != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">
												{props.stablecoins.topToken.symbol} Dominance
											</span>
											<span className="font-jetbrains ml-auto">{props.stablecoins.dominance}%</span>
										</p>
									) : null}
								</div>
							</details>
						) : null}
						{props.chainFees?.total24h != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) last:border-none py-1">
								<Tooltip
									content="Total fees paid by users when using the chain"
									className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
								>
									Chain Fees (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.chainFees?.total24h, true)}</span>
							</p>
						) : null}
						{props.chainRevenue?.total24h != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) last:border-none py-1">
								<Tooltip
									content="Subset of fees that the chain collects for itself"
									className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
								>
									Chain Revenue (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.chainRevenue?.total24h, true)}</span>
							</p>
						) : null}
						{props.chainFees?.totalREV24h != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) last:border-none py-1">
								<Tooltip
									content="REV is the sum of chain fees and MEV tips"
									className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
								>
									Chain REV (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.chainFees?.totalREV24h, true)}</span>
							</p>
						) : null}
						{props.chainIncentives?.emissions24h != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) last:border-none py-1">
								<Tooltip
									content="Tokens allocated to users through liquidity mining or incentive schemes, typically as part of governance or reward mechanisms."
									className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
								>
									Token Incentives (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">
									{formattedNum(props.chainIncentives?.emissions24h, true)}
								</span>
							</p>
						) : null}
						{props.appRevenue?.total24h != null && props.appRevenue?.total24h > 1e3 ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) last:border-none py-1">
								<Tooltip
									content={
										'Total revenue earned by the apps on the chain. Excludes stablecoins, liquid staking apps, and gas fees.'
									}
									className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
								>
									App Revenue (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.appRevenue?.total24h, true)}</span>
							</p>
						) : null}
						{props.appFees?.total24h != null && props.appFees?.total24h > 1e3 ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) last:border-none py-1">
								<Tooltip
									content={
										'Total fees paid by users when using the apps on the chain. Excludes stablecoins, liquid staking apps, and gas fees.'
									}
									className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
								>
									App Fees (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.appFees?.total24h, true)}</span>
							</p>
						) : null}
						{props.dexs?.total24h != null ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) group-open:font-semibold group-open:border-none group-last:border-none py-1">
									<Tooltip
										content={
											props.metadata.name === 'All'
												? 'Sum of volume on all DEXs on all chains'
												: 'Sum of volume on all DEXs on the chain'
										}
										className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
									>
										DEXs Volume (24h)
									</Tooltip>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
									/>
									<span className="font-jetbrains ml-auto">{formattedNum(props.dexs.total24h, true)}</span>
								</summary>
								<div className="flex flex-col mb-3">
									{props.dexs.total7d != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">Volume (7d)</span>
											<span className="font-jetbrains ml-auto">{formattedNum(props.dexs.total7d, true)}</span>
										</p>
									) : null}
									{props.dexs.change_7dover7d != null && (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">Weekly Change</span>
											<span
												className={`font-jetbrains ml-auto ${
													props.dexs.change_7dover7d >= 0 ? 'text-(--pct-green)' : 'text-(--pct-red)'
												}`}
											>
												{`${props.dexs.change_7dover7d >= 0 ? '+' : ''}${props.dexs.change_7dover7d}%`}
											</span>
										</p>
									)}
									{props.dexs.dexsDominance != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">DEX vs CEX dominance</span>
											<span className="font-jetbrains ml-auto">{props.dexs.dexsDominance}%</span>
										</p>
									) : null}
								</div>
							</details>
						) : null}
						{props.perps?.total24h != null ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) group-open:font-semibold group-open:border-none group-last:border-none py-1">
									<Tooltip
										content="Sum of volume on all perpetual exchanges on the chain"
										className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
									>
										Perps Volume (24h)
									</Tooltip>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
									/>
									<span className="font-jetbrains ml-auto">{formattedNum(props.perps.total24h, true)}</span>
								</summary>
								<div className="flex flex-col mb-3">
									{props.perps.total7d != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">Perps Volume (7d)</span>
											<span className="font-jetbrains ml-auto">{formattedNum(props.perps.total7d, true)}</span>
										</p>
									) : null}
									{props.perps.change_7dover7d != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">Weekly Change</span>
											<span
												className={`font-jetbrains ml-auto ${
													props.perps.change_7dover7d >= 0 ? 'text-(--pct-green)' : 'text-(--pct-red)'
												}`}
											>
												{`${props.perps.change_7dover7d >= 0 ? '+' : ''}${props.perps.change_7dover7d}%`}
											</span>
										</p>
									) : null}
								</div>
							</details>
						) : null}
						{props.inflows?.netInflows != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) last:border-none py-1">
								<Tooltip
									content="Net money bridged to the chain within the last 24h"
									className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
								>
									Inflows (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.inflows.netInflows, true)}</span>
							</p>
						) : null}
						{props.users.activeUsers != null ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) group-open:font-semibold group-open:border-none group-last:border-none py-1">
									<Tooltip
										content={
											<p>
												Number of unique addresses that have interacted with the protocol directly in the last 24 hours.
												Interactions are counted as transactions sent directly against the protocol, thus transactions
												that go through an aggregator or some other middleman contract are not counted here.
												<br />
												<br />
												The reasoning for this is that this is meant to help measure stickiness/loyalty of users, and
												users that are interacting with the protocol through another product aren't likely to be sticky.
											</p>
										}
										className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
									>
										Active Addresses (24h)
									</Tooltip>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
									/>
									<span className="font-jetbrains ml-auto">{formattedNum(props.users.activeUsers, false)}</span>
								</summary>
								<div className="flex flex-col mb-3">
									{props.users.newUsers != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">New Addresses (24h)</span>
											<span className="font-jetbrains ml-auto">{formattedNum(props.users.newUsers, false)}</span>
										</p>
									) : null}
									{props.users.transactions != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">Transactions (24h)</span>
											<span className="font-jetbrains ml-auto">{formattedNum(props.users.transactions, false)}</span>
										</p>
									) : null}
								</div>
							</details>
						) : null}
						{props.treasury ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) group-open:font-semibold group-open:border-none group-last:border-none py-1">
									<span className="text-[#545757] dark:text-[#cccccc]">Treasury</span>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
									/>
									<span className="font-jetbrains ml-auto">{formattedNum(props.treasury.tvl, true)}</span>
								</summary>
								<div className="flex flex-col mb-3">
									{props.treasury.tokenBreakdowns?.stablecoins != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">Stablecoins</span>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.treasury.tokenBreakdowns?.stablecoins, true)}
											</span>
										</p>
									) : null}
									{props.treasury.tokenBreakdowns?.majors != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">Major Tokens (ETH, BTC)</span>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.treasury.tokenBreakdowns?.majors, true)}
											</span>
										</p>
									) : null}
									{props.treasury.tokenBreakdowns?.others != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">Other Tokens</span>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.treasury.tokenBreakdowns?.others, true)}
											</span>
										</p>
									) : null}
									{props.treasury.tokenBreakdowns?.ownTokens != null ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<span className="text-[#545757] dark:text-[#cccccc]">Own Tokens</span>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.treasury.tokenBreakdowns?.ownTokens, true)}
											</span>
										</p>
									) : null}
								</div>
							</details>
						) : null}
						{props.chainRaises && props.chainRaises.length > 0 && (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) group-open:font-semibold group-open:border-none group-last:border-none py-1">
									<Tooltip
										content="Sum of all money raised by the chain, including VC funding rounds, public sales and ICOs."
										className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
									>
										Total Raised
									</Tooltip>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
									/>
									<span className="font-jetbrains ml-auto">
										{formatRaisedAmount(props.chainRaises.reduce((sum, r) => sum + Number(r.amount), 0))}
									</span>
								</summary>
								<div className="flex flex-col mb-3">
									{props.chainRaises
										.sort((a, b) => a.date - b.date)
										.map((raise) => (
											<p
												className="flex flex-col gap-1 border-b border-dashed border-(--cards-border) group-last:border-none py-1"
												key={`${raise.date}-${raise.amount}-${raise.source}-${raise.round}`}
											>
												<span className="flex flex-wrap justify-between">
													<span className="text-[#545757] dark:text-[#cccccc]">
														{dayjs(raise.date * 1000).format('MMM D, YYYY')}
													</span>
													<span className="font-jetbrains">{formattedNum(raise.amount * 1_000_000, true)}</span>
												</span>
												<span className="flex gap-1 flex-wrap justify-between text-[#545757] dark:text-[#cccccc]">
													<span>Round: {raise.round}</span>
													{(raise as any).leadInvestors?.length || (raise as any).otherInvestors?.length ? (
														<span>
															Investors:{' '}
															{(raise as any).leadInvestors
																.concat((raise as any).otherInvestors)
																.map((i, index, arr) => (
																	<Fragment key={'raised from ' + i}>
																		<a href={`/raises/${slug(i)}`}>{i}</a>
																		{index < arr.length - 1 ? ', ' : ''}
																	</Fragment>
																))}
														</span>
													) : null}
												</span>
											</p>
										))}
								</div>
							</details>
						)}
						{props.chainAssets ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) group-open:font-semibold group-open:border-none group-last:border-none py-1">
									<span className="text-[#545757] dark:text-[#cccccc]">Bridged TVL</span>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
									/>
									<span className="font-jetbrains ml-auto">
										{formattedNum(
											props.chainAssets.total.total +
												(tvlSettings.govtokens ? +(props.chainAssets?.ownTokens?.total ?? 0) : 0),
											true
										)}
									</span>
								</summary>
								<div className="flex flex-col mb-3">
									{props.chainAssets.native?.total ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<Tooltip
												content="Sum of marketcaps of all tokens that were issued on the chain (excluding the chain's own token)"
												className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
											>
												Native
											</Tooltip>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.chainAssets.native.total, true)}
											</span>
										</p>
									) : null}
									{props.chainAssets.ownTokens?.total ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<Tooltip
												content="Marketcap of the governance token of the chain"
												className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
											>
												Own Tokens
											</Tooltip>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.chainAssets.ownTokens.total, true)}
											</span>
										</p>
									) : null}
									{props.chainAssets.canonical?.total ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<Tooltip
												content="Tokens that were bridged to the chain through the canonical bridge"
												className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
											>
												Canonical
											</Tooltip>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.chainAssets.canonical.total, true)}
											</span>
										</p>
									) : null}
									{props.chainAssets.thirdParty?.total ? (
										<p className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-(--cards-border) last:border-none py-1">
											<Tooltip
												content="Tokens that were bridged to the chain through third party bridges"
												className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
											>
												Third Party
											</Tooltip>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.chainAssets.thirdParty.total, true)}
											</span>
										</p>
									) : null}
								</div>
							</details>
						) : null}
						{props.nfts ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) last:border-none py-1">
								<Tooltip
									content="Volume of Non Fungible Tokens traded in the last 24 hours"
									className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
								>
									NFT Volume (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.nfts.total24h, true)}</span>
							</p>
						) : null}
						{props.chainTokenInfo?.token_symbol ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) last:border-none py-1">
								<span className="text-[#545757] dark:text-[#cccccc]">${props.chainTokenInfo.token_symbol} Price</span>
								<span className="font-jetbrains ml-auto">
									{formattedNum(props.chainTokenInfo?.current_price, true)}
								</span>
							</p>
						) : null}
						{props.chainTokenInfo?.token_symbol ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) last:border-none py-1">
								<span className="text-[#545757] dark:text-[#cccccc]">
									${props.chainTokenInfo.token_symbol} Market Cap
								</span>
								<span className="font-jetbrains ml-auto">
									{formattedNum(props.chainTokenInfo?.market_cap ?? 0, true)}
								</span>
							</p>
						) : null}
						{props.chainTokenInfo?.token_symbol ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) last:border-none py-1">
								<span className="text-[#545757] dark:text-[#cccccc]">${props.chainTokenInfo.token_symbol} FDV</span>
								<span className="font-jetbrains ml-auto">
									{formattedNum(props.chainTokenInfo?.fully_diluted_valuation ?? 0, true)}
								</span>
							</p>
						) : null}
					</div>
				</div>
				<CSVDownloadButton
					onClick={() => {
						window.open(
							`https://api.llama.fi/simpleChainDataset/${
								chainsNamesMap[props.metadata.name] || props.metadata.name
							}?${Object.entries(tvlSettings)
								.filter((t) => t[1] === true)
								.map((t) => `${t[0]}=true`)
								.join('&')}`.replaceAll(' ', '%20')
						)
					}}
					smol
					className="h-[30px] bg-transparent! border border-(--form-control-border) text-[#666]! dark:text-[#919296]! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)! ml-auto"
				/>
			</div>
			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col col-span-2">
				<div className="flex flex-wrap items-center justify-end gap-2 p-2">
					<div className="flex items-center flex-wrap gap-2 mr-auto">
						{props.charts.length > 0 ? (
							<Ariakit.DialogProvider store={metricsDialogStore}>
								<Ariakit.DialogDisclosure className="flex shrink-0 items-center justify-between gap-2 py-1 px-2 font-normal rounded-md cursor-pointer bg-white dark:bg-[#181A1C] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) border border-(--cards-border)">
									<span>Add Metrics</span>
									<Icon name="plus" className="h-[14px] w-[14px]" />
								</Ariakit.DialogDisclosure>
								<Ariakit.Dialog className="dialog gap-3 sm:w-full max-sm:drawer" unmountOnHide>
									<Ariakit.DialogHeading className="text-2xl font-bold">Add metrics to chart</Ariakit.DialogHeading>
									<div className="flex flex-wrap gap-2">
										{props.charts.map((tchart) => (
											<button
												key={`add-chain-metric-${chainCharts[tchart]}`}
												onClick={() => {
													updateRoute(
														chainCharts[tchart],
														chainCharts[tchart] === 'tvl'
															? router.query[chainCharts[tchart]] !== 'false'
																? 'false'
																: 'true'
															: router.query[chainCharts[tchart]] === 'true'
															? 'false'
															: 'true',
														router
													)
													metricsDialogStore.toggle()
												}}
												data-active={
													chainCharts[tchart] === 'tvl'
														? router.query[chainCharts[tchart]] !== 'false'
														: router.query[chainCharts[tchart]] === 'true'
												}
												className="flex items-center gap-1 border border-(--old-blue) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) rounded-full px-2 py-1 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
											>
												<span>
													{tchart.includes('Token')
														? tchart.replace(
																'Token',
																props.chainTokenInfo?.token_symbol ? `$${props.chainTokenInfo?.token_symbol}` : 'Token'
														  )
														: tchart}
												</span>
												{chainCharts[tchart] === 'tvl' ? (
													router.query[chainCharts[tchart]] === 'false' ? (
														<Icon name="plus" className="h-[14px] w-[14px]" />
													) : (
														<Icon name="x" className="h-[14px] w-[14px]" />
													)
												) : router.query[chainCharts[tchart]] === 'true' ? (
													<Icon name="x" className="h-[14px] w-[14px]" />
												) : (
													<Icon name="plus" className="h-[14px] w-[14px]" />
												)}
											</button>
										))}
									</div>
								</Ariakit.Dialog>
							</Ariakit.DialogProvider>
						) : null}
						{toggledCharts.map((tchart) => (
							<label
								className="relative text-sm cursor-pointer flex items-center gap-1 flex-nowrap last-of-type:mr-auto"
								key={`add-or-remove-metric-${chainCharts[tchart]}`}
							>
								<input
									type="checkbox"
									value={tchart}
									checked={true}
									onChange={() => {
										updateRoute(
											chainCharts[tchart],
											chainCharts[tchart] === 'tvl'
												? router.query[chainCharts[tchart]] !== 'false'
													? 'false'
													: 'true'
												: router.query[chainCharts[tchart]] === 'true'
												? 'false'
												: 'true',
											router
										)
									}}
									className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
								/>
								<span
									className="text-xs flex items-center gap-1 border-2 border-(--old-blue) rounded-full px-2 py-1"
									style={{
										borderColor: chainOverviewChartColors[tchart]
									}}
								>
									<span>
										{tchart.includes('Token')
											? tchart.replace(
													'Token',
													props.chainTokenInfo?.token_symbol ? `$${props.chainTokenInfo?.token_symbol}` : 'Token'
											  )
											: tchart}
									</span>
									<Icon name="x" className="h-[14px] w-[14px]" />
								</span>
							</label>
						))}
					</div>

					{DENOMINATIONS.length > 1 ? (
						<div className="flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-[#666] dark:text-[#919296]">
							{DENOMINATIONS.map((denom) => (
								<button
									key={`denom-${denom}`}
									className="shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--old-blue)"
									data-active={denomination === denom}
									onClick={() => updateRoute('currency', denom, router)}
								>
									{denom}
								</button>
							))}
						</div>
					) : null}

					{hasAtleasOneBarChart ? (
						<div className="flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-[#666] dark:text-[#919296]">
							{INTERVALS_LIST.map((dataInterval) => (
								<Tooltip
									content={capitalizeFirstLetter(dataInterval)}
									render={<button />}
									className="shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--link-text)"
									data-active={groupBy === dataInterval}
									onClick={() => updateGroupBy(dataInterval)}
								>
									{dataInterval.slice(0, 1).toUpperCase()}
								</Tooltip>
							))}
						</div>
					) : null}
					<EmbedChart />
					<CSVDownloadButton
						onClick={() => {
							try {
								downloadChart(finalCharts, `${props.chain}.csv`)
							} catch (error) {
								console.error('Error generating CSV:', error)
							}
						}}
						smol
						className="h-[30px] bg-transparent! border border-(--form-control-border) text-[#666]! dark:text-[#919296]! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)!"
					/>
				</div>

				{isFetchingChartData ? (
					<div className="flex items-center justify-center m-auto min-h-[360px]">
						<p>Loading...</p>
					</div>
				) : (
					<Suspense fallback={<div className="flex items-center justify-center m-auto min-h-[360px]" />}>
						<ChainChart chartData={finalCharts} valueSymbol={valueSymbol} isThemeDark={darkMode} groupBy={groupBy} />
					</Suspense>
				)}
			</div>
		</div>
	)
})

const updateRoute = (key, val, router) => {
	router.push(
		{
			query: {
				...router.query,
				[key]: val
			}
		},
		undefined,
		{ shallow: true }
	)
}

const chainsNamesMap = {
	'OP Mainnet': 'Optimism'
}
