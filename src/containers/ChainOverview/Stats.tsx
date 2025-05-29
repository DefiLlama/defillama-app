import { TokenLogo } from '~/components/TokenLogo'
import { IChainOverviewData } from './types'
import { chainIconUrl, formattedNum, slug } from '~/utils'
import { Tooltip } from '~/components/Tooltip'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useFetchChainChartData } from './useFetchChainChartData'
import { RowWithSubRows } from '~/containers/ProtocolOverview/RowWithSubRows'
import { formatRaise, formatRaisedAmount } from '~/containers/ProtocolOverview/utils'
import { Fragment, memo, useMemo } from 'react'
import { Switch } from '~/components/Switch'
import { BAR_CHARTS } from '~/containers/ProtocolOverview/Chart/utils'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { EmbedChart } from '~/components/EmbedChart'
import { chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { chainOverviewChartSwitchColors } from './colors'

const ChainChart: any = dynamic(() => import('~/containers/ChainOverview/Chart').then((m) => m.ChainChart), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]"></div>
})

export const Stats = memo(function Stats(props: IChainOverviewData) {
	const router = useRouter()

	const denomination = router.query?.currency ?? 'USD'
	const groupBy = router.query?.groupBy ?? 'daily'

	const [darkMode] = useDarkModeManager()

	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const { chartOptions, DENOMINATIONS, chainGeckoId, hasAtleasOneBarChart } = useMemo(() => {
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

		const chartOptions = [
			{
				id: 'tvl',
				name: 'TVL',
				isVisible: true
			},
			{
				id: 'dexs',
				name: 'DEXs Volume',
				isVisible: props.dexs?.total24h != null ? true : false
			},
			{
				id: 'chainFees',
				name: 'Chain Fees',
				isVisible: props.chainFees?.total24h != null ? true : false
			},
			{
				id: 'chainRevenue',
				name: 'Chain Revenue',
				isVisible: props.chainRevenue?.total24h != null ? true : false
			},
			{
				id: 'chainIncentives',
				name: 'Token Incentives',
				isVisible: props.chainIncentives?.emissions24h != null ? true : false
			},
			{
				id: 'appRevenue',
				name: 'App Revenue',
				isVisible: props.appRevenue?.total24h != null ? true : false
			},
			{ id: 'perps', name: 'Perps Volume', isVisible: props.perps?.total24h != null ? true : false },
			{ id: 'chainAssets', name: 'Bridged TVL', isVisible: props.chainAssets != null ? true : false },
			{
				id: 'addresses',
				name: 'Addresses',
				isVisible: props.users.activeUsers != null ? true : false
			},
			{
				id: 'txs',
				name: 'Transactions',
				isVisible: props.users.transactions != null ? true : false
			},
			{
				id: 'raises',
				name: 'Raises',
				isVisible: props.metadata.name === 'All'
			},
			{
				id: 'stables',
				name: 'Stablecoins',
				isVisible: props.stablecoins?.mcap != null ? true : false
			},
			{
				id: 'inflows',
				name: 'Inflows',
				isVisible: props.inflows?.netInflows != null ? true : false
			},
			{
				id: 'developers',
				name: 'Core Developers',
				isVisible: props.devMetrics ? true : false
			},
			{
				id: 'devsCommits',
				name: 'Commits',
				isVisible: props.devMetrics ? true : false
			},
			{
				id: 'chainTokenPrice',
				name: `${CHAIN_SYMBOL} Price`,
				isVisible: CHAIN_SYMBOL ? true : false
			},
			{
				id: 'chainTokenMcap',
				name: `${props.chainTokenInfo?.token_symbol} MCap`,
				isVisible: props.chainTokenInfo?.token_symbol ? true : false
			},
			{
				id: 'chainTokenVolume',
				name: `${props.chainTokenInfo?.token_symbol} Volume`,
				isVisible: props.chainTokenInfo?.token_symbol ? true : false
			}
		]

		const hasAtleasOneBarChart = chartOptions.reduce((acc, curr) => {
			if (curr.isVisible && BAR_CHARTS.includes(curr.name) && router.query[curr.id] === 'true') {
				acc = true
			}

			return acc
		}, false)

		return {
			chartOptions,
			DENOMINATIONS,
			chainGeckoId,
			hasAtleasOneBarChart
		}
	}, [props, router.query])

	const { totalValueUSD, change24h, valueChange24hUSD, chartDatasets, isFetchingChartData } = useFetchChainChartData({
		denomination,
		selectedChain: props.metadata.name,
		dexsData: props.dexs,
		feesData: props.chainFees,
		revenueData: props.chainRevenue,
		appRevenueData: props.appRevenue,
		stablecoinsData: props.stablecoins,
		inflowsData: props.inflows,
		userData: props.users,
		raisesChart: props.raises,
		chart: props.tvlChart,
		extraTvlCharts: props.extraTvlChart,
		extraTvlsEnabled,
		devMetricsData: props.devMetrics,
		chainGeckoId,
		perpsData: props.perps,
		chainAssets: props.chainAssets,
		chainIncentives: props.chainIncentives
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

	return (
		<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
			<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-3 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
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
							className="underline decoration-dotted text-[#545757] dark:text-[#cccccc]"
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
									change24h >= 0 ? 'text-[var(--pct-green)]' : 'text-[var(--pct-red)]'
								}`}
							>
								{`${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%`}
							</span>
							<span className="text-[#545757] dark:text-[#cccccc]">24h</span>
						</Tooltip>
					) : null}
				</div>
				<table className="text-base w-full border-collapse mt-4">
					<tbody>
						{props.stablecoins?.mcap ? (
							<RowWithSubRows
								rowHeader={
									<Tooltip
										content={
											props.metadata.name === 'All'
												? 'Sum of market cap of all stablecoins circulating on all chains'
												: 'Sum of market cap of all stablecoins circulating on the chain'
										}
										className="underline decoration-dotted"
									>
										Stablecoins Mcap
									</Tooltip>
								}
								rowValue={formattedNum(props.stablecoins.mcap, true)}
								helperText={null}
								protocolName={null}
								dataType={null}
								subRows={
									<>
										{props.stablecoins.change7d ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													Change (7d)
												</th>
												<td className="text-right">
													<Tooltip
														content={`${formattedNum(props.stablecoins.change7dUsd, true)}`}
														className={`justify-end font-jetbrains overflow-hidden whitespace-nowrap text-ellipsis underline decoration-dotted ${
															+props.stablecoins.change7d >= 0 ? 'text-[var(--pct-green)]' : 'text-[var(--pct-red)]'
														}`}
													>
														{`${+props.stablecoins.change7d > 0 ? '+' : ''}${props.stablecoins.change7d}%`}
													</Tooltip>
												</td>
											</tr>
										) : null}
										{props.stablecoins.dominance ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													{props.stablecoins.topToken.symbol} Dominance
												</th>
												<td className="text-right font-jetbrains">{props.stablecoins.dominance}%</td>
											</tr>
										) : null}
									</>
								}
							/>
						) : null}
						{props.chainFees?.total24h != null ? (
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									<Tooltip
										content="Total fees paid by users when using the chain"
										className="underline decoration-dotted"
									>
										Chain Fees (24h)
									</Tooltip>
								</th>
								<td className="font-jetbrains text-right">{formattedNum(props.chainFees?.total24h, true)}</td>
							</tr>
						) : null}
						{props.chainRevenue?.total24h != null ? (
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									<Tooltip
										content="Subset of fees that the chain collects for itself"
										className="underline decoration-dotted"
									>
										Chain Revenue (24h)
									</Tooltip>
								</th>
								<td className="font-jetbrains text-right">{formattedNum(props.chainRevenue?.total24h, true)}</td>
							</tr>
						) : null}
						{props.chainFees?.totalREV24h ? (
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									<Tooltip content="REV is the sum of chain fees and MEV tips" className="underline decoration-dotted">
										Chain REV (24h)
									</Tooltip>
								</th>
								<td className="font-jetbrains text-right">{formattedNum(props.chainFees?.totalREV24h, true)}</td>
							</tr>
						) : null}
						{props.chainIncentives?.emissions24h != null ? (
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									<Tooltip
										content="Tokens allocated to users through liquidity mining or incentive schemes, typically as part of governance or reward mechanisms."
										className="underline decoration-dotted"
									>
										Token Incentives (24h)
									</Tooltip>
								</th>
								<td className="font-jetbrains text-right">{formattedNum(props.chainIncentives?.emissions24h, true)}</td>
							</tr>
						) : null}
						{props.appRevenue?.total24h != null && props.appRevenue?.total24h > 1e3 ? (
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									<Tooltip
										content={
											'Total revenue earned by the apps on the chain. Excludes stablecoins, liquid staking apps, and gas fees.'
										}
										className="underline decoration-dotted"
									>
										App Revenue (24h)
									</Tooltip>
								</th>
								<td className="font-jetbrains text-right">{formattedNum(props.appRevenue?.total24h, true)}</td>
							</tr>
						) : null}
						{props.dexs?.total24h != null ? (
							<RowWithSubRows
								rowHeader={
									<Tooltip
										content={
											props.metadata.name === 'All'
												? 'Sum of volume on all DEXs on all chains'
												: 'Sum of volume on all DEXs on the chain'
										}
										className="underline decoration-dotted"
									>
										DEXs Volume (24h)
									</Tooltip>
								}
								rowValue={formattedNum(props.dexs.total24h, true)}
								helperText={null}
								protocolName={null}
								dataType={null}
								subRows={
									<>
										{props.dexs.total7d ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													Volume (7d)
												</th>
												<td className="text-right font-jetbrains">{formattedNum(props.dexs.total7d, true)}</td>
											</tr>
										) : null}
										<tr>
											<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
												Weekly Change
											</th>
											<td
												className={`text-right font-jetbrains pl-2 pb-1 text-ellipsis" ${
													props.dexs.change_7dover7d >= 0 ? 'text-[var(--pct-green)]' : 'text-[var(--pct-red)]'
												}`}
											>
												{`${props.dexs.change_7dover7d >= 0 ? '+' : ''}${props.dexs.change_7dover7d}%`}
											</td>
										</tr>
										<tr>
											<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
												DEX vs CEX dominance
											</th>
											<td className="text-right font-jetbrains">{props.dexs.dexsDominance}%</td>
										</tr>
									</>
								}
							/>
						) : null}
						{props.perps?.total24h != null ? (
							<RowWithSubRows
								rowHeader={
									<Tooltip
										content="Sum of volume on all perpetual exchanges on the chain"
										className="underline decoration-dotted"
									>
										Perps Volume (24h)
									</Tooltip>
								}
								rowValue={formattedNum(props.perps.total24h, true)}
								helperText={null}
								protocolName={null}
								dataType={null}
								subRows={
									<>
										{props.perps.total7d ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													Perps Volume (7d)
												</th>
												<td className="text-right font-jetbrains">{formattedNum(props.perps.total7d, true)}</td>
											</tr>
										) : null}
										<tr>
											<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
												Weekly Change
											</th>
											<td
												className={`text-right font-jetbrains pl-2 pb-1 text-ellipsis" ${
													props.perps.change_7dover7d >= 0 ? 'text-[var(--pct-green)]' : 'text-[var(--pct-red)]'
												}`}
											>
												{`${props.perps.change_7dover7d >= 0 ? '+' : ''}${props.perps.change_7dover7d}%`}
											</td>
										</tr>
									</>
								}
							/>
						) : null}
						{props.inflows?.netInflows != null ? (
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									<Tooltip
										content="Net money bridged to the chain within the last 24h"
										className="underline decoration-dotted"
									>
										Inflows (24h)
									</Tooltip>
								</th>
								<td className="font-jetbrains text-right">{formattedNum(props.inflows.netInflows, true)}</td>
							</tr>
						) : null}
						{props.users.activeUsers != null ? (
							<RowWithSubRows
								rowHeader={
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
										className="underline decoration-dotted"
									>
										Active Addresses (24h)
									</Tooltip>
								}
								rowValue={formattedNum(props.users.activeUsers, false)}
								helperText={null}
								protocolName={null}
								dataType={null}
								subRows={
									<>
										{props.users.newUsers ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													New Addresses (24h)
												</th>
												<td className="text-right font-jetbrains">{formattedNum(props.users.newUsers, false)}</td>
											</tr>
										) : null}
										{props.users.transactions ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													Transactions (24h)
												</th>
												<td className="text-right font-jetbrains">{formattedNum(props.users.transactions, false)}</td>
											</tr>
										) : null}
									</>
								}
							/>
						) : null}
						{props.treasury ? (
							<RowWithSubRows
								rowHeader={'Treasury'}
								rowValue={formattedNum(props.treasury.tvl, true)}
								helperText={null}
								protocolName={null}
								dataType={null}
								subRows={
									<>
										{props.treasury.tokenBreakdowns?.stablecoins ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													Stablecoins
												</th>
												<td className="text-right font-jetbrains">
													{formattedNum(props.treasury.tokenBreakdowns?.stablecoins, true)}
												</td>
											</tr>
										) : null}
										{props.treasury.tokenBreakdowns?.majors ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													Major Tokens (ETH, BTC)
												</th>
												<td className="text-right font-jetbrains">
													{formattedNum(props.treasury.tokenBreakdowns?.majors, true)}
												</td>
											</tr>
										) : null}
										{props.treasury.tokenBreakdowns?.others ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													Other Tokens
												</th>
												<td className="text-right font-jetbrains">
													{formattedNum(props.treasury.tokenBreakdowns?.others, true)}
												</td>
											</tr>
										) : null}
										{props.treasury.tokenBreakdowns?.ownTokens ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													Own Tokens
												</th>
												<td className="text-right font-jetbrains">
													{formattedNum(props.treasury.tokenBreakdowns?.ownTokens, true)}
												</td>
											</tr>
										) : null}
									</>
								}
							/>
						) : null}
						{props.chainRaises && props.chainRaises.length > 0 && (
							<RowWithSubRows
								protocolName={null}
								dataType={'Raises'}
								helperText={null}
								rowHeader={
									<Tooltip
										content="Sum of all money raised by the chain, including VC funding rounds, public sales and ICOs."
										className="underline decoration-dotted"
									>
										Total Raised
									</Tooltip>
								}
								rowValue={formatRaisedAmount(props.chainRaises.reduce((sum, r) => sum + Number(r.amount), 0))}
								subRows={
									<>
										{props.chainRaises
											.sort((a, b) => a.date - b.date)
											.map((raise) => (
												<Fragment key={raise.date + raise.amount}>
													<tr>
														<th className="text-left mb-auto font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
															{new Date(raise.date * 1000).toISOString().split('T')[0]}
														</th>
														<td className="text-right">
															{raise.source ? (
																<a target="_blank" rel="noopener noreferrer" href={raise.source}>
																	{formatRaise(raise)}
																</a>
															) : (
																formatRaise(raise)
															)}
														</td>
													</tr>
													<tr key={raise.source}>
														<td colSpan={2} className="text-right">
															<b>Investors</b>:{' '}
															{(raise as any).leadInvestors
																.concat((raise as any).otherInvestors)
																.map((i, index, arr) => (
																	<Fragment key={'raised from ' + i}>
																		<a href={`/raises/${slug(i)}`}>{i}</a>
																		{index < arr.length - 1 ? ', ' : ''}
																	</Fragment>
																))}
														</td>
													</tr>
												</Fragment>
											))}
									</>
								}
							/>
						)}
						{props.chainAssets ? (
							<RowWithSubRows
								rowHeader="Bridged TVL"
								rowValue={formattedNum(
									props.chainAssets.total.total +
										(extraTvlsEnabled.govtokens ? +(props.chainAssets?.ownTokens?.total ?? 0) : 0),
									true
								)}
								helperText={null}
								protocolName={null}
								dataType={null}
								subRows={
									<>
										{props.chainAssets.native?.total ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													<span className="flex items-center gap-1">
														<Tooltip
															content="Sum of marketcaps of all tokens that were issued on the chain (excluding the chain's own token)"
															className="underline decoration-dotted"
														>
															Native
														</Tooltip>
													</span>
												</th>
												<td className="text-right font-jetbrains">
													{formattedNum(props.chainAssets.native.total, true)}
												</td>
											</tr>
										) : null}
										{props.chainAssets.ownTokens?.total ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													<span className="flex items-center gap-1">
														<Tooltip
															content="Marketcap of the governance token of the chain"
															className="underline decoration-dotted"
														>
															Own Tokens
														</Tooltip>
													</span>
												</th>
												<td className="text-right font-jetbrains">
													{formattedNum(props.chainAssets.ownTokens.total, true)}
												</td>
											</tr>
										) : null}

										{props.chainAssets.canonical?.total ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													<span className="flex items-center gap-1">
														<Tooltip
															content="Tokens that were bridged to the chain through the canonical bridge"
															className="underline decoration-dotted"
														>
															Canonical
														</Tooltip>
													</span>
												</th>
												<td className="text-right font-jetbrains">
													{formattedNum(props.chainAssets.canonical.total, true)}
												</td>
											</tr>
										) : null}

										{props.chainAssets.thirdParty?.total ? (
											<tr>
												<th className="text-left font-normal pl-2 pb-1 text-[#545757] dark:text-[#cccccc]">
													<span className="flex items-center gap-1">
														<Tooltip
															content="Tokens that were bridged to the chain through third party bridges"
															className="underline decoration-dotted"
														>
															Third Party
														</Tooltip>
													</span>
												</th>
												<td className="text-right font-jetbrains">
													{formattedNum(props.chainAssets.thirdParty.total, true)}
												</td>
											</tr>
										) : null}
									</>
								}
							/>
						) : null}
						{props.nfts ? (
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									<Tooltip
										content="Volume of Non Fungible Tokens traded in the last 24 hours"
										className="underline decoration-dotted"
									>
										NFT Volume (24h)
									</Tooltip>
								</th>
								<td className="font-jetbrains text-right">{formattedNum(props.nfts.total24h, true)}</td>
							</tr>
						) : null}
						{props.chainTokenInfo?.token_symbol ? (
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									{props.chainTokenInfo?.token_symbol} Price
								</th>
								<td className="font-jetbrains text-right">{formattedNum(props.chainTokenInfo?.current_price, true)}</td>
							</tr>
						) : null}
						{props.chainTokenInfo?.token_symbol ? (
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									{props.chainTokenInfo?.token_symbol} Market Cap
								</th>
								<td className="font-jetbrains text-right">
									{formattedNum(props.chainTokenInfo?.market_cap ?? 0, true)}
								</td>
							</tr>
						) : null}
						{props.chainTokenInfo?.token_symbol ? (
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									{props.chainTokenInfo?.token_symbol} FDV
								</th>
								<td className="font-jetbrains text-right">
									{formattedNum(props.chainTokenInfo?.fully_diluted_valuation ?? 0, true)}
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
				<CSVDownloadButton
					onClick={() => {
						window.open(
							`https://api.llama.fi/simpleChainDataset/${
								chainsNamesMap[props.metadata.name] || props.metadata.name
							}?${Object.entries(extraTvlsEnabled)
								.filter((t) => t[1] === true)
								.map((t) => `${t[0]}=true`)
								.join('&')}`.replaceAll(' ', '%20')
						)
					}}
					className="mt-auto mr-auto"
				/>
			</div>
			<div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2">
				<div className="flex flex-wrap items-center justify-end gap-2 p-3">
					<div className="flex items-center flex-wrap gap-2 mr-auto">
						{chartOptions
							.filter((o) => o.isVisible)
							.map(({ id, name }) => (
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
									switchColors={chainOverviewChartSwitchColors[id]}
								/>
							))}
					</div>

					{DENOMINATIONS.length > 1 ? (
						<div className="flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
							{DENOMINATIONS.map((denom) => (
								<button
									key={`denom-${denom}`}
									className="flex-shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:text-[var(--old-blue)]"
									data-active={denomination === denom}
									onClick={() => updateRoute('currency', denom, router)}
								>
									{denom}
								</button>
							))}
						</div>
					) : null}

					{hasAtleasOneBarChart ? (
						<div className="flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
							<Tooltip
								content="Daily"
								render={<button />}
								className="flex-shrink-0 py-1 px-2 whitespace-nowrap font-medium text-sm hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:text-[var(--link-text)]"
								data-active={groupBy === 'daily' || !groupBy}
								onClick={() => updateGroupBy('daily')}
							>
								D
							</Tooltip>
							<Tooltip
								content="Weekly"
								render={<button />}
								className="flex-shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:text-[var(--link-text)]"
								data-active={groupBy === 'weekly'}
								onClick={() => updateGroupBy('weekly')}
							>
								W
							</Tooltip>
							<Tooltip
								content="Monthly"
								render={<button />}
								className="flex-shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:text-[var(--link-text)]"
								data-active={groupBy === 'monthly'}
								onClick={() => updateGroupBy('monthly')}
							>
								M
							</Tooltip>
							<button
								className="flex-shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:text-[var(--link-text)]"
								data-active={groupBy === 'cumulative'}
								onClick={() => updateGroupBy('cumulative')}
							>
								Cumulative
							</button>
						</div>
					) : null}
					<EmbedChart />
				</div>

				{isFetchingChartData ? (
					<div className="flex items-center justify-center m-auto min-h-[360px]">
						<p>Loading...</p>
					</div>
				) : (
					<ChainChart datasets={chartDatasets} title="" denomination={denomination} isThemeDark={darkMode} />
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
