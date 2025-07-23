import * as React from 'react'
import { useQueries } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { LocalLoader } from '~/components/LocalLoader'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { fetchJson } from '~/utils/async'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, getPercentChange, getPrevTvlFromChart, getRandomColor, slug } from '~/utils'
import { Icon } from '~/components/Icon'
import { Switch } from '~/components/Switch'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { IChainOverviewData } from '../ChainOverview/types'
import { IAdapterOverview, IAdapterSummary } from '../DimensionAdapters/queries'
import dayjs from 'dayjs'
import { formatRaisedAmount } from '../ProtocolOverview/utils'
import { Tooltip } from '~/components/Tooltip'

const LineAndBarChart: any = React.lazy(() => import('~/components/ECharts/LineAndBarChart'))

const CustomOption = ({ innerProps, label, data }) => (
	<div {...innerProps} className="flex items-center gap-2 p-2 cursor-pointer">
		<img
			src={`https://icons.llamao.fi/icons/chains/rsz_${label}?w=48&h=48`}
			alt={label}
			style={{ width: '20px', marginRight: '10px', borderRadius: '50%' }}
			className="w-5 h-5 rounded-full shrink-0"
		/>
		{label}
	</div>
)

export const getChainData = async (chain: string) => {
	const { chain: chainData } = (await fetchJson(`/api/cache/chain/${chain}`)) as {
		chain: {
			chainOverviewData: IChainOverviewData
			dexVolumeChart: IAdapterOverview['totalDataChart']
			chainFeesChart: IAdapterSummary['totalDataChart']
			chainRevenueChart: IAdapterSummary['totalDataChart']
		}
	}

	return {
		chainFeesChart: chainData.chainFeesChart ?? null,
		chainRevenueChart: chainData.chainRevenueChart ?? null,
		dexVolumeChart: chainData.dexVolumeChart ?? null,
		chain,
		chainOverviewData: chainData.chainOverviewData
	}
}

export const useCompare = ({ chains = [] }: { chains?: string[] }) => {
	const data = useQueries({
		queries: chains.map((chain) => ({
			queryKey: ['compare', chain],
			queryFn: () => getChainData(chain),
			staleTime: 60 * 60 * 1000
		}))
	})

	return {
		data: data.map((r) => r?.data ?? null),
		isLoading: (chains.length > 0 && data.every((r) => r.isLoading)) || data.some((r) => r.isRefetching)
	}
}

const getSelectedCharts = (query: any) => {
	const selectedCharts = []

	if (query.tvl !== 'false') {
		selectedCharts.push('tvl')
	}

	for (const key of Object.keys(query)) {
		if (key !== 'tvl' && query[key] === 'true' && supportedCharts.find((chart) => chart.id === key)) {
			selectedCharts.push(key)
		}
	}

	return selectedCharts
}

const formatChartData = (chainsData: any, query: any) => {
	if (!chainsData || !chainsData.length || !chainsData.every(Boolean)) return []

	const finalCharts = {}

	const selectedCharts = getSelectedCharts(query)

	for (const chart of selectedCharts) {
		const targetChart = supportedCharts.find((c) => c.id === chart)
		const dateInMs = chart === 'tvl'
		for (const chainData of chainsData) {
			const name = `${chainData.chain} - ${targetChart.name}`
			finalCharts[name] = {
				name,
				stack: name,
				data: chainData[targetChart.key].map((data) => [!dateInMs ? Number(data[0]) * 1e3 : data[0], data[1]]),
				type: chart === 'tvl' ? 'line' : 'bar',
				color: getRandomColor()
			}
		}
	}

	return finalCharts
}

const updateRoute = (key, val, router: NextRouter) => {
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

export function CompareChains({ chains }) {
	const [tvlSettings] = useLocalStorageSettingsManager('tvl')

	const router = useRouter()

	const { data, isLoading } = useCompare({ chains: router.query?.chains ? [router.query?.chains].flat() : [] })

	const components = React.useMemo(
		() => ({
			Option: CustomOption
		}),
		[]
	)

	const selectedChains = React.useMemo(() => {
		return [router?.query?.chains]
			.flat()
			.filter(Boolean)
			.map((chain) => ({ value: chain, label: chain }))
	}, [router.query])

	const onChainSelect = (chains: Array<Record<string, string>>) => {
		const selectedChains = chains.map((val) => val.value)

		updateRoute('chains', selectedChains, router)
	}

	const tvlCharts = React.useMemo(() => {
		const charts = {}
		for (const chainData of data) {
			if (!chainData || !chainData.chainOverviewData || !chainData.chainOverviewData.tvlChart?.length) continue
			charts[chainData.chain] = formatTvlChart({
				tvlChart: chainData.chainOverviewData.tvlChart,
				tvlSettings,
				extraTvlCharts: chainData.chainOverviewData.extraTvlCharts
			})
		}
		return charts
	}, [data])

	const chartData = React.useMemo(() => {
		return formatChartData(
			data
				.filter(Boolean)
				.map((chainData) => ({ ...chainData, tvlChart: tvlCharts[chainData.chain]?.finalTvlChart ?? null })),
			router.query
		)
	}, [data, router.query, tvlCharts])

	return (
		<>
			<ProtocolsChainsSearch />

			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex items-center gap-3 p-3 *:last:-my-3">
				<h2 className="font-semibold text-base">Compare chains: </h2>

				<ReactSelect
					defaultValue={router?.query?.chains || chains?.[0]}
					isMulti
					value={selectedChains}
					name="colors"
					options={chains as any}
					className="basic-multi-select"
					classNamePrefix="select"
					onChange={onChainSelect}
					components={components}
					placeholder="Select Chains..."
				/>
			</div>

			<div className="flex flex-col gap-1 relative">
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md min-h-[404px]">
					<div className="flex items-center flex-wrap gap-2 p-3">
						{supportedCharts.map(({ id, name, key }) => (
							<Switch
								key={id + 'chart-option'}
								label={name}
								value={id}
								onChange={() => {
									updateRoute(
										id,
										id === 'tvl'
											? router.query[id] !== 'false'
												? 'false'
												: 'true'
											: router.query[id] === 'true'
											? 'false'
											: 'true',
										router
									)
								}}
								checked={id === 'tvl' ? router.query[id] !== 'false' : router.query[id] === 'true'}
							/>
						))}
					</div>
					{isLoading || !router.isReady ? (
						<div className="flex items-center justify-center m-auto min-h-[360px]">
							<LocalLoader />
						</div>
					) : (
						<React.Suspense fallback={<></>}>
							<LineAndBarChart title="" charts={chartData} />
						</React.Suspense>
					)}
				</div>
				<div className="grid grid-cols-1 xl:grid-cols-2 grow gap-1">
					{data?.filter(Boolean)?.map((chainData, i) => {
						return (
							<div
								className="flex flex-col justify-between relative isolate xl:grid-cols-[auto_1fr] gap-1"
								key={`${chainData?.chain || i}`}
							>
								<ChainContainer
									{...chainData.chainOverviewData}
									totalValueUSD={tvlCharts[chainData.chain]?.totalValueUSD}
									change24h={tvlCharts[chainData.chain]?.change24h}
									valueChange24hUSD={tvlCharts[chainData.chain]?.valueChange24hUSD}
								/>
							</div>
						)
					})}
				</div>
			</div>
		</>
	)
}

const ChainContainer = (
	props: IChainOverviewData & {
		totalValueUSD: number
		change24h: number
		valueChange24hUSD: number
	}
) => {
	const [tvlSettings] = useLocalStorageSettingsManager('tvl_fees')
	return (
		<div className="flex-1 flex flex-col gap-8 p-5 col-span-1 w-full bg-(--cards-bg) border border-(--cards-border) rounded-md overflow-x-auto">
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
						{formattedNum(props.totalValueUSD, true)}
					</span>
				</h2>
				{props.change24h != null ? (
					<Tooltip
						content={`${formattedNum(props.valueChange24hUSD, true)}`}
						render={<p />}
						className="flex items-center flex-nowrap gap-2 relative bottom-[2px]"
					>
						<span
							className={`font-jetbrains overflow-hidden whitespace-nowrap text-ellipsis underline decoration-dotted ${
								props.change24h >= 0 ? 'text-(--pct-green)' : 'text-(--pct-red)'
							}`}
						>
							{`${props.change24h > 0 ? '+' : ''}${props.change24h.toFixed(2)}%`}
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
							<span className="font-jetbrains ml-auto">{formattedNum(props.chainIncentives?.emissions24h, true)}</span>
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
														{(raise as any).leadInvestors.concat((raise as any).otherInvestors).map((i, index, arr) => (
															<React.Fragment key={'raised from ' + i}>
																<a href={`/raises/${slug(i)}`}>{i}</a>
																{index < arr.length - 1 ? ', ' : ''}
															</React.Fragment>
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
										<span className="font-jetbrains ml-auto">{formattedNum(props.chainAssets.native.total, true)}</span>
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
							<span className="font-jetbrains ml-auto">{formattedNum(props.chainTokenInfo?.current_price, true)}</span>
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
		</div>
	)
}
// TODO fix bar charts not showing up
const supportedCharts = [
	{
		id: 'tvl',
		name: 'TVL',
		isVisible: true,
		key: 'tvlChart'
	}
	// {
	// 	id: 'volume',
	// 	name: 'DEXs Volume',
	// 	key: 'dexVolumeChart'
	// },
	// {
	// 	id: 'chainFees',
	// 	name: 'Chain Fees',
	// 	key: 'chainFeesChart'
	// },
	// {
	// 	id: 'chainRevenue',
	// 	name: 'Chain Revenue',
	// 	key: 'chainRevenueChart'
	// }
	// {
	// 	id: 'appRevenue',
	// 	name: 'App Revenue',
	// 	key: 'appRevenueChart'
	// },
	// {
	// 	id: 'appFees',
	// 	name: 'App Fees',
	// 	key: 'appFeesChart'
	// },
	// {
	// 	id: 'addresses',
	// 	name: 'Active Addresses',
	// 	key: 'activeAddressesChart'
	// },
	// {
	// 	id: 'txs',
	// 	name: 'Transactions',
	// 	key: 'txsChart'
	// }
]

const formatTvlChart = ({
	tvlChart,
	tvlSettings,
	extraTvlCharts
}: {
	tvlChart: IChainOverviewData['tvlChart']
	tvlSettings: Record<string, boolean>
	extraTvlCharts: IChainOverviewData['extraTvlCharts']
}) => {
	const toggledTvlSettings = Object.entries(tvlSettings)
		.filter(([key, value]) => value)
		.map(([key]) => key)

	if (toggledTvlSettings.length === 0) {
		const totalValueUSD = getPrevTvlFromChart(tvlChart, 0)
		const tvlPrevDay = getPrevTvlFromChart(tvlChart, 1)
		const valueChange24hUSD = totalValueUSD - tvlPrevDay
		const change24h = getPercentChange(totalValueUSD, tvlPrevDay)
		return { finalTvlChart: tvlChart, totalValueUSD, valueChange24hUSD, change24h }
	}

	const store: Record<string, number> = {}
	for (const [date, tvl] of tvlChart) {
		let sum = tvl
		for (const toggledTvlSetting of toggledTvlSettings) {
			sum += extraTvlCharts[toggledTvlSetting]?.[date] ?? 0
		}
		store[date] = sum
	}

	// if liquidstaking and doublecounted are toggled, we need to subtract the overlapping tvl so you dont add twice
	if (toggledTvlSettings.includes('liquidstaking') && toggledTvlSettings.includes('doublecounted')) {
		for (const date in store) {
			store[date] -= extraTvlCharts['dcAndLsOverlap']?.[date] ?? 0
		}
	}

	const finalTvlChart = []
	for (const date in store) {
		finalTvlChart.push([+date, store[date]])
	}

	const totalValueUSD = getPrevTvlFromChart(finalTvlChart, 0)
	const tvlPrevDay = getPrevTvlFromChart(finalTvlChart, 1)
	const valueChange24hUSD = totalValueUSD - tvlPrevDay
	const change24h = getPercentChange(totalValueUSD, tvlPrevDay)
	const isGovTokensEnabled = tvlSettings?.govtokens ? true : false
	return { finalTvlChart, totalValueUSD, valueChange24hUSD, change24h, isGovTokensEnabled }
}
