import { Fragment, lazy, memo, Suspense, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { Bookmark } from '~/components/Bookmark'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { downloadChart } from '~/components/ECharts/utils'
import { EmbedChart } from '~/components/EmbedChart'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { formatRaisedAmount } from '~/containers/ProtocolOverview/utils'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { capitalizeFirstLetter, chainIconUrl, downloadCSV, formattedNum, slug } from '~/utils'
import { BAR_CHARTS, ChainChartLabels, chainCharts, chainOverviewChartColors } from './constants'
import { IChainOverviewData } from './types'
import { useFetchChainChartData } from './useFetchChainChartData'

const ChainChart: any = lazy(() => import('~/containers/ChainOverview/Chart'))

const INTERVALS_LIST = ['daily', 'weekly', 'monthly', 'cumulative'] as const

interface IStatsProps extends IChainOverviewData {
	hideChart?: boolean
}

export const Stats = memo(function Stats(props: IStatsProps) {
	const router = useRouter()
	const queryParamsString = useMemo(() => {
		const { tvl, ...rest } = router.query ?? {}
		return JSON.stringify(
			router.query
				? tvl === 'true'
					? rest
					: router.query
				: props.metadata.id !== 'all'
					? { chain: [props.metadata.id] }
					: {}
		)
	}, [router.query, props.metadata.id])

	const [darkMode] = useDarkModeManager()

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')

	const { isAuthenticated } = useAuthContext()

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

	const prepateCsv = useCallback(() => {
		try {
			downloadChart(finalCharts, `${props.chain}.csv`)
		} catch (error) {
			console.error('Error generating CSV:', error)
		}
	}, [finalCharts, props.chain])

	return (
		<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
			<div
				className={`col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 ${
					props.hideChart ? 'xl:col-span-full' : 'xl:col-span-1'
				}`}
			>
				{props.metadata.name !== 'All' && (
					<h1 className="flex flex-nowrap items-center gap-2 *:last:ml-auto">
						<TokenLogo logo={chainIconUrl(props.metadata.name)} size={24} />
						<span className="text-xl font-semibold">{props.metadata.name}</span>
						<Bookmark readableName={props.metadata.name} isChain />
					</h1>
				)}
				<div className="flex flex-nowrap items-end justify-between gap-8">
					<h2 className="flex flex-col">
						<Tooltip
							content={
								props.metadata.name === 'All'
									? 'Sum of value of all coins held in smart contracts of all the protocols on all chains'
									: 'Sum of value of all coins held in smart contracts of all the protocols on the chain'
							}
							className="!inline text-(--text-label) underline decoration-dotted"
						>
							Total Value Locked in DeFi
						</Tooltip>
						<span className="font-jetbrains min-h-8 overflow-hidden text-2xl font-semibold text-ellipsis whitespace-nowrap">
							{formattedNum(totalValueUSD, true)}
						</span>
					</h2>
					{change24h != null ? (
						<Tooltip
							content={`${formattedNum(valueChange24hUSD, true)}`}
							render={<p />}
							className="relative bottom-[2px] flex flex-nowrap items-center gap-2"
						>
							<span
								className={`font-jetbrains overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
									change24h >= 0 ? 'text-(--success)' : 'text-(--error)'
								}`}
							>
								{`${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%`}
							</span>
							<span className="text-(--text-label)">24h</span>
						</Tooltip>
					) : null}
				</div>
				<div className="flex flex-1 flex-col gap-2">
					<h2 className="text-base font-semibold xl:text-sm">Key Metrics</h2>
					<div className="flex flex-col">
						{props.stablecoins?.mcap ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
									<Tooltip
										content={
											props.metadata.name === 'All'
												? 'Sum of market cap of all stablecoins circulating on all chains'
												: 'Sum of market cap of all stablecoins circulating on the chain'
										}
										className="text-(--text-label) underline decoration-dotted"
									>
										Stablecoins Mcap
									</Tooltip>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="relative top-[2px] -ml-3 transition-transform duration-100 group-open:rotate-180"
									/>
									<span className="font-jetbrains ml-auto">{formattedNum(props.stablecoins.mcap, true)}</span>
								</summary>
								<div className="mb-3 flex flex-col">
									{props.stablecoins.change7d != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">Change (7d)</span>
											<Tooltip
												content={`${formattedNum(props.stablecoins.change7dUsd, true)}`}
												className={`font-jetbrains ml-auto justify-end overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
													+props.stablecoins.change7d >= 0 ? 'text-(--success)' : 'text-(--error)'
												}`}
											>
												{`${+props.stablecoins.change7d > 0 ? '+' : ''}${props.stablecoins.change7d}%`}
											</Tooltip>
										</p>
									) : null}
									{props.stablecoins.dominance != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">{props.stablecoins.topToken.symbol} Dominance</span>
											<span className="font-jetbrains ml-auto">{props.stablecoins.dominance}%</span>
										</p>
									) : null}
								</div>
							</details>
						) : null}
						{props.chainFees?.total24h != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content="Total fees paid by users when using the chain"
									className="text-(--text-label) underline decoration-dotted"
								>
									Chain Fees (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.chainFees?.total24h, true)}</span>
							</p>
						) : null}
						{props.chainRevenue?.total24h != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content="Subset of fees that the chain collects for itself"
									className="text-(--text-label) underline decoration-dotted"
								>
									Chain Revenue (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.chainRevenue?.total24h, true)}</span>
							</p>
						) : null}
						{props.chainFees?.totalREV24h != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content="REV is the sum of chain fees and MEV tips"
									className="text-(--text-label) underline decoration-dotted"
								>
									Chain REV (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.chainFees?.totalREV24h, true)}</span>
							</p>
						) : null}
						{props.chainIncentives?.emissions24h != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content="Tokens allocated to users through liquidity mining or incentive schemes, typically as part of governance or reward mechanisms."
									className="text-(--text-label) underline decoration-dotted"
								>
									Token Incentives (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">
									{formattedNum(props.chainIncentives?.emissions24h, true)}
								</span>
							</p>
						) : null}
						{props.appRevenue?.total24h != null && props.appRevenue?.total24h > 1e3 ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content={
										'Total revenue earned by the apps on the chain. Excludes stablecoins, liquid staking apps, and gas fees.'
									}
									className="text-(--text-label) underline decoration-dotted"
								>
									App Revenue (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.appRevenue?.total24h, true)}</span>
							</p>
						) : null}
						{props.appFees?.total24h != null && props.appFees?.total24h > 1e3 ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content={
										'Total fees paid by users when using the apps on the chain. Excludes stablecoins, liquid staking apps, and gas fees.'
									}
									className="text-(--text-label) underline decoration-dotted"
								>
									App Fees (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.appFees?.total24h, true)}</span>
							</p>
						) : null}
						{props.dexs?.total24h != null ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
									<Tooltip
										content={
											props.metadata.name === 'All'
												? 'Sum of volume on all DEXs on all chains'
												: 'Sum of volume on all DEXs on the chain'
										}
										className="text-(--text-label) underline decoration-dotted"
									>
										DEXs Volume (24h)
									</Tooltip>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="relative top-[2px] -ml-3 transition-transform duration-100 group-open:rotate-180"
									/>
									<span className="font-jetbrains ml-auto">{formattedNum(props.dexs.total24h, true)}</span>
								</summary>
								<div className="mb-3 flex flex-col">
									{props.dexs.total7d != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">Volume (7d)</span>
											<span className="font-jetbrains ml-auto">{formattedNum(props.dexs.total7d, true)}</span>
										</p>
									) : null}
									{props.dexs.change_7dover7d != null && (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">Weekly Change</span>
											<span
												className={`font-jetbrains ml-auto ${
													props.dexs.change_7dover7d >= 0 ? 'text-(--success)' : 'text-(--error)'
												}`}
											>
												{`${props.dexs.change_7dover7d >= 0 ? '+' : ''}${props.dexs.change_7dover7d}%`}
											</span>
										</p>
									)}
									{props.dexs.dexsDominance != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">DEX vs CEX dominance</span>
											<span className="font-jetbrains ml-auto">{props.dexs.dexsDominance}%</span>
										</p>
									) : null}
								</div>
							</details>
						) : null}
						{props.perps?.total24h != null ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
									<Tooltip
										content="Sum of volume on all perpetual exchanges on the chain"
										className="text-(--text-label) underline decoration-dotted"
									>
										Perps Volume (24h)
									</Tooltip>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="relative top-[2px] -ml-3 transition-transform duration-100 group-open:rotate-180"
									/>
									<span className="font-jetbrains ml-auto">{formattedNum(props.perps.total24h, true)}</span>
								</summary>
								<div className="mb-3 flex flex-col">
									{props.perps.total7d != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">Perps Volume (7d)</span>
											<span className="font-jetbrains ml-auto">{formattedNum(props.perps.total7d, true)}</span>
										</p>
									) : null}
									{props.perps.change_7dover7d != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">Weekly Change</span>
											<span
												className={`font-jetbrains ml-auto ${
													props.perps.change_7dover7d >= 0 ? 'text-(--success)' : 'text-(--error)'
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
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content="Net money bridged to the chain within the last 24h"
									className="text-(--text-label) underline decoration-dotted"
								>
									Inflows (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.inflows.netInflows, true)}</span>
							</p>
						) : null}
						{props.users.activeUsers != null ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
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
										className="text-(--text-label) underline decoration-dotted"
									>
										Active Addresses (24h)
									</Tooltip>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="relative top-[2px] -ml-3 transition-transform duration-100 group-open:rotate-180"
									/>
									<span className="font-jetbrains ml-auto">{formattedNum(props.users.activeUsers, false)}</span>
								</summary>
								<div className="mb-3 flex flex-col">
									{props.users.newUsers != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">New Addresses (24h)</span>
											<span className="font-jetbrains ml-auto">{formattedNum(props.users.newUsers, false)}</span>
										</p>
									) : null}
									{props.users.transactions != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">Transactions (24h)</span>
											<span className="font-jetbrains ml-auto">{formattedNum(props.users.transactions, false)}</span>
										</p>
									) : null}
								</div>
							</details>
						) : null}
						{props.treasury ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
									<span className="text-(--text-label)">Treasury</span>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="relative top-[2px] -ml-3 transition-transform duration-100 group-open:rotate-180"
									/>
									<span className="font-jetbrains ml-auto">{formattedNum(props.treasury.tvl, true)}</span>
								</summary>
								<div className="mb-3 flex flex-col">
									{props.treasury.tokenBreakdowns?.stablecoins != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">Stablecoins</span>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.treasury.tokenBreakdowns?.stablecoins, true)}
											</span>
										</p>
									) : null}
									{props.treasury.tokenBreakdowns?.majors != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">Major Tokens (ETH, BTC)</span>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.treasury.tokenBreakdowns?.majors, true)}
											</span>
										</p>
									) : null}
									{props.treasury.tokenBreakdowns?.others != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">Other Tokens</span>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.treasury.tokenBreakdowns?.others, true)}
											</span>
										</p>
									) : null}
									{props.treasury.tokenBreakdowns?.ownTokens != null ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<span className="text-(--text-label)">Own Tokens</span>
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
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
									<Tooltip
										content="Sum of all money raised by the chain, including VC funding rounds, public sales and ICOs."
										className="text-(--text-label) underline decoration-dotted"
									>
										Total Raised
									</Tooltip>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="relative top-[2px] -ml-3 transition-transform duration-100 group-open:rotate-180"
									/>
									<span className="font-jetbrains ml-auto">
										{formatRaisedAmount(props.chainRaises.reduce((sum, r) => sum + Number(r.amount), 0))}
									</span>
								</summary>
								<div className="mb-3 flex flex-col">
									{props.chainRaises
										.sort((a, b) => a.date - b.date)
										.map((raise) => (
											<p
												className="flex flex-col gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none"
												key={`${raise.date}-${raise.amount}-${raise.source}-${raise.round}`}
											>
												<span className="flex flex-wrap justify-between">
													<span className="text-(--text-label)">{dayjs(raise.date * 1000).format('MMM D, YYYY')}</span>
													<span className="font-jetbrains">{formattedNum(raise.amount * 1_000_000, true)}</span>
												</span>
												<span className="flex flex-wrap justify-between gap-1 text-(--text-label)">
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
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
									<span className="text-(--text-label)">Bridged TVL</span>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="relative top-[2px] -ml-3 transition-transform duration-100 group-open:rotate-180"
									/>
									<span className="font-jetbrains ml-auto">
										{formattedNum(
											props.chainAssets.total.total +
												(tvlSettings.govtokens ? +(props.chainAssets?.ownTokens?.total ?? 0) : 0),
											true
										)}
									</span>
								</summary>
								<div className="mb-3 flex flex-col">
									{props.chainAssets.native?.total ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<Tooltip
												content="Sum of marketcaps of all tokens that were issued on the chain (excluding the chain's own token)"
												className="text-(--text-label) underline decoration-dotted"
											>
												Native
											</Tooltip>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.chainAssets.native.total, true)}
											</span>
										</p>
									) : null}
									{props.chainAssets.ownTokens?.total ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<Tooltip
												content="Marketcap of the governance token of the chain"
												className="text-(--text-label) underline decoration-dotted"
											>
												Own Tokens
											</Tooltip>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.chainAssets.ownTokens.total, true)}
											</span>
										</p>
									) : null}
									{props.chainAssets.canonical?.total ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<Tooltip
												content="Tokens that were bridged to the chain through the canonical bridge"
												className="text-(--text-label) underline decoration-dotted"
											>
												Canonical
											</Tooltip>
											<span className="font-jetbrains ml-auto">
												{formattedNum(props.chainAssets.canonical.total, true)}
											</span>
										</p>
									) : null}
									{props.chainAssets.thirdParty?.total ? (
										<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
											<Tooltip
												content="Tokens that were bridged to the chain through third party bridges"
												className="text-(--text-label) underline decoration-dotted"
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
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content="Volume of Non Fungible Tokens traded in the last 24 hours"
									className="text-(--text-label) underline decoration-dotted"
								>
									NFT Volume (24h)
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.nfts.total24h, true)}</span>
							</p>
						) : null}
						{props.chainTokenInfo?.token_symbol ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<span className="text-(--text-label)">${props.chainTokenInfo.token_symbol} Price</span>
								<span className="font-jetbrains ml-auto">
									{formattedNum(props.chainTokenInfo?.current_price, true)}
								</span>
							</p>
						) : null}
						{props.chainTokenInfo?.token_symbol ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<span className="text-(--text-label)">${props.chainTokenInfo.token_symbol} Market Cap</span>
								<span className="font-jetbrains ml-auto">
									{formattedNum(props.chainTokenInfo?.market_cap ?? 0, true)}
								</span>
							</p>
						) : null}
						{props.chainTokenInfo?.token_symbol ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<span className="text-(--text-label)">${props.chainTokenInfo.token_symbol} FDV</span>
								<span className="font-jetbrains ml-auto">
									{formattedNum(props.chainTokenInfo?.fully_diluted_valuation ?? 0, true)}
								</span>
							</p>
						) : null}
					</div>
				</div>
				<CSVDownloadButton
					onClick={async () => {
						// TODO csv
						if (!isAuthenticated) {
							toast.error('Please sign in to download CSV data')
							return
						}

						try {
							const url = `https://api.llama.fi/simpleChainDataset/${
								chainsNamesMap[props.metadata.name] || props.metadata.name
							}?${Object.entries(tvlSettings)
								.filter((t) => t[1] === true)
								.map((t) => `${t[0]}=true`)
								.join('&')}`.replaceAll(' ', '%20')

							const response = await fetch(url)

							if (!response || !response.ok) {
								toast.error('Failed to download CSV data')
								return
							}

							const csvData = await response.text()

							downloadCSV(`${props.metadata.name}.csv`, csvData)
						} catch (error) {
							console.error('CSV download error:', error)
							toast.error('Failed to download CSV data')
						}
					}}
					smol
					className="ml-auto"
				/>
			</div>
			{!props.hideChart ? (
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap items-center justify-end gap-2 p-2">
						<div className="mr-auto flex flex-wrap items-center gap-2">
							{props.charts.length > 0 ? (
								<Ariakit.DialogProvider store={metricsDialogStore}>
									<Ariakit.DialogDisclosure className="flex shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-white px-2 py-1 font-normal hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) dark:bg-[#181A1C]">
										<span>Add Metrics</span>
										<Icon name="plus" className="h-[14px] w-[14px]" />
									</Ariakit.DialogDisclosure>
									<Ariakit.Dialog className="dialog max-sm:drawer gap-3 sm:w-full" unmountOnHide>
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
													className="flex items-center gap-1 rounded-full border border-(--old-blue) px-2 py-1 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
												>
													<span>
														{tchart.includes('Token')
															? tchart.replace(
																	'Token',
																	props.chainTokenInfo?.token_symbol
																		? `$${props.chainTokenInfo?.token_symbol}`
																		: 'Token'
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
									className="relative flex cursor-pointer flex-nowrap items-center gap-1 text-sm last-of-type:mr-auto"
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
										className="peer absolute h-[1em] w-[1em] opacity-[0.00001]"
									/>
									<span
										className="flex items-center gap-1 rounded-full border-2 border-(--old-blue) px-2 py-1 text-xs hover:bg-(--bg-input) focus-visible:bg-(--bg-input)"
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
							<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
								{DENOMINATIONS.map((denom) => (
									<button
										key={`denom-${denom}`}
										className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--old-blue)"
										data-active={denomination === denom}
										onClick={() => updateRoute('currency', denom, router)}
									>
										{denom}
									</button>
								))}
							</div>
						) : null}

						{hasAtleasOneBarChart ? (
							<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
								{INTERVALS_LIST.map((dataInterval) => (
									<Tooltip
										content={capitalizeFirstLetter(dataInterval)}
										render={<button />}
										className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
										data-active={groupBy === dataInterval}
										onClick={() => updateGroupBy(dataInterval)}
										key={`${props.chain}-overview-groupBy-${dataInterval}`}
									>
										{dataInterval.slice(0, 1).toUpperCase()}
									</Tooltip>
								))}
							</div>
						) : null}
						<EmbedChart />
						<CSVDownloadButton onClick={prepateCsv} smol />
					</div>

					{isFetchingChartData ? (
						<div className="m-auto flex min-h-[360px] items-center justify-center">
							<p>Loading...</p>
						</div>
					) : (
						<Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
							<ChainChart chartData={finalCharts} valueSymbol={valueSymbol} isThemeDark={darkMode} groupBy={groupBy} />
						</Suspense>
					)}
				</div>
			) : null}
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
