import * as React from 'react'
import { Announcement } from '~/components/Announcement'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { RowLinksWithDropdown } from '~/components/Filters/common/RowLinksWithDropdown'
import { useRouter } from 'next/router'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { formatProtocolsList } from '~/hooks/data/defi'
import { LocalLoader } from '~/components/LocalLoader'
import dynamic from 'next/dynamic'
import { chainCoingeckoIds, chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { chainIconUrl, formattedNum } from '~/utils'
import llamaLogo from '~/assets/peeking-llama.png'
import { useGetProtocolsFeesAndRevenueByChain, useGetProtocolsVolumeByChain } from '~/api/categories/chains/client'
import { RowWithSubRows } from '~/containers/Defi/Protocol/RowWithSubRows'
import { SEO } from '~/components/SEO'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols'
import { TokenLogo } from '~/components/TokenLogo'
import { EmbedChart } from '~/components/Popover'
import { primaryColor } from '~/constants/colors'
import { useFetchChainChartData } from './useFetchChainChartData'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { formatRaise, formatRaisedAmount } from '~/containers/Defi/Protocol/utils'
import { sluggify } from '~/utils/cache-client'
import { QuestionHelper } from '~/components/QuestionHelper'
import { BAR_CHARTS } from '~/components/ECharts/ProtocolChart/utils'
import { Icon } from '~/components/Icon'
import { chainsNamesMap } from './constants'
import { Tooltip } from '~/components/Tooltip'

const ChainChart: any = dynamic(() => import('~/components/ECharts/ChainChart'), {
	ssr: false
})

const Game: any = dynamic(() => import('~/game'))

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

export function ChainContainer({
	selectedChain = 'All',
	chainOptions,
	protocolsList,
	chart,
	extraTvlCharts = {},
	raisesChart,
	totalFundingAmount,
	volumeData,
	feesAndRevenueData,
	perpsData,
	stablecoinsData,
	inflowsData,
	userData,
	devMetricsData,
	chainTokenInfo,
	chainTreasury,
	chainRaises,
	chainAssets,
	nftVolumesData
}) {
	const {
		fullProtocolsList,
		parentProtocols,
		isLoading: fetchingProtocolsList
	} = useGetProtocolsList({ chain: selectedChain })

	const [extraTvlsEnabled] = useDefiManager()
	const router = useRouter()

	const denomination = router.query?.currency ?? 'USD'
	const groupBy = router.query?.groupBy ?? 'daily'

	const { minTvl, maxTvl } = router.query

	const [easterEgg, setEasterEgg] = React.useState(false)
	const [darkMode, toggleDarkMode] = useDarkModeManager()
	const activateEasterEgg = () => {
		if (easterEgg) {
			if (!darkMode) {
				toggleDarkMode()
			}
			window.location.reload()
		} else {
			if (darkMode) {
				toggleDarkMode()
			}
			setEasterEgg(true)
		}
	}

	let CHAIN_SYMBOL = chainTokenInfo?.tokenSymbol ?? null
	let chainGeckoId = chainTokenInfo?.gecko_id ?? null

	if (selectedChain !== 'All') {
		if (!chainGeckoId) {
			chainGeckoId =
				chainCoingeckoIds[selectedChain]?.geckoId ?? chainCoingeckoIdsForGasNotMcap[selectedChain]?.geckoId ?? null
		}

		if (!CHAIN_SYMBOL) {
			CHAIN_SYMBOL =
				chainCoingeckoIds[selectedChain]?.symbol ?? chainCoingeckoIdsForGasNotMcap[selectedChain]?.symbol ?? null
		}
	}

	const { data: chainProtocolsVolumes, isLoading: fetchingProtocolsVolumeByChain } =
		useGetProtocolsVolumeByChain(selectedChain)

	const { data: chainProtocolsFees, isLoading: fetchingProtocolsFeesAndRevenueByChain } =
		useGetProtocolsFeesAndRevenueByChain(selectedChain)

	const DENOMINATIONS = CHAIN_SYMBOL ? ['USD', CHAIN_SYMBOL] : ['USD']

	const { totalValueUSD, valueChangeUSD, chartDatasets, isFetchingChartData } = useFetchChainChartData({
		denomination,
		selectedChain,
		volumeData,
		feesAndRevenueData,
		stablecoinsData,
		inflowsData,
		userData,
		raisesChart,
		chart,
		extraTvlCharts,
		extraTvlsEnabled,
		devMetricsData,
		chainGeckoId,
		perpsData,
		chainAssets
	})

	const chartOptions = [
		{
			id: 'tvl',
			name: 'TVL',
			isVisible: true
		},
		{
			id: 'volume',
			name: 'DEXs Volume',
			isVisible: volumeData?.totalVolume24h ? true : false
		},
		{
			id: 'chainFees',
			name: 'Chain Fees',
			isVisible: feesAndRevenueData?.totalFees24h ? true : false
		},
		{
			id: 'chainRevenue',
			name: 'Chain Revenue',
			isVisible: feesAndRevenueData?.totalRevenue24h ? true : false
		},
		{
			id: 'appRevenue',
			name: 'App Revenue',
			isVisible: feesAndRevenueData?.totalAppRevenue24h ? true : false
		},
		{ id: 'perps', name: 'Perps Volume', isVisible: perpsData?.totalVolume24h ? true : false },
		{ id: 'chainAssets', name: 'Bridged TVL', isVisible: chainAssets ? true : false },
		{
			id: 'addresses',
			name: 'Addresses',
			isVisible: userData.activeUsers ? true : false
		},
		{
			id: 'txs',
			name: 'Transactions',
			isVisible: userData.transactions ? true : false
		},
		{
			id: 'raises',
			name: 'Raises',
			isVisible: selectedChain === 'All'
		},
		{
			id: 'stables',
			name: 'Stablecoins',
			isVisible: stablecoinsData?.totalMcapCurrent ? true : false
		},
		{
			id: 'inflows',
			name: 'Inflows',
			isVisible: inflowsData?.netInflows ? true : false
		},
		{
			id: 'developers',
			name: 'Core Developers',
			isVisible: devMetricsData ? true : false
		},
		{
			id: 'devsCommits',
			name: 'Commits',
			isVisible: devMetricsData ? true : false
		},
		{
			id: 'chainTokenPrice',
			name: `${CHAIN_SYMBOL} Price`,
			isVisible: CHAIN_SYMBOL ? true : false
		},
		{
			id: 'chainTokenMcap',
			name: `${chainTokenInfo?.tokenSymbol} MCap`,
			isVisible: chainTokenInfo?.tokenSymbol ? true : false
		},
		{
			id: 'chainTokenVolume',
			name: `${chainTokenInfo?.tokenSymbol} Volume`,
			isVisible: chainTokenInfo?.tokenSymbol ? true : false
		}
	]

	const hasAtleasOneBarChart = chartOptions.reduce((acc, curr) => {
		if (BAR_CHARTS.includes(curr.name)) {
			acc = true
		}

		return acc
	}, false)

	const finalProtocolsList = React.useMemo(() => {
		const list =
			!fetchingProtocolsList &&
			fullProtocolsList &&
			!fetchingProtocolsVolumeByChain &&
			!fetchingProtocolsFeesAndRevenueByChain
				? formatProtocolsList({
						extraTvlsEnabled,
						protocols: fullProtocolsList,
						parentProtocols,
						volumeData: chainProtocolsVolumes,
						feesData: chainProtocolsFees
				  })
				: protocolsList

		const isValidTvlRange =
			(minTvl !== undefined && !Number.isNaN(Number(minTvl))) || (maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

		return isValidTvlRange
			? list.filter((p) => (minTvl ? p.tvl >= minTvl : true) && (maxTvl ? p.tvl <= maxTvl : true))
			: list
	}, [
		extraTvlsEnabled,
		fetchingProtocolsList,
		fullProtocolsList,
		parentProtocols,
		protocolsList,
		chainProtocolsVolumes,
		chainProtocolsFees,
		minTvl,
		maxTvl,
		fetchingProtocolsVolumeByChain,
		fetchingProtocolsFeesAndRevenueByChain
	])

	const topToken = { name: 'Uniswap', tvl: 0 }
	if (finalProtocolsList.length > 0) {
		topToken.name = finalProtocolsList[0]?.name
		topToken.tvl = finalProtocolsList[0]?.tvl
		if (topToken.name === 'AnySwap') {
			topToken.name = finalProtocolsList[1]?.name
			topToken.tvl = finalProtocolsList[1]?.tvl
		}
	}

	const tvl = formattedNum(totalValueUSD, true)
	const percentChange = valueChangeUSD?.toFixed(2)

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
		<>
			<SEO cardName={selectedChain} chain={selectedChain} tvl={tvl as string} volumeChange={percentChange} />

			<Announcement>
				<img
					src="https://icons.llamao.fi/icons/memes/gib.png?w=36&h=36"
					alt="Cute"
					width={18}
					height={18}
					className="inline relative -top-[2px]"
				/>
				{'  '}We've released{' '}
				<a
					className="text-[var(--blue)] hover:underline"
					target="_blank"
					rel="noopener noreferrer"
					href={`https://feed.defillama.com`}
				>
					LlamaFeed, a real-time feed <Icon name="arrow-up-right" height={14} width={14} className="inline" />{' '}
				</a>
				{' !'}
			</Announcement>

			<ProtocolsChainsSearch />

			<div className="flex flex-col gap-5 p-3 rounded-lg shadow bg-white dark:bg-[#090a0b]">
				<nav className="flex">
					<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} alternativeOthersText="Chains" />
				</nav>

				<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl">
					<div className="flex flex-col gap-2 p-6 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
						{selectedChain !== 'All' && (
							<h1 className="flex items-center flex-nowrap gap-2 mb-4">
								<TokenLogo logo={chainIconUrl(selectedChain)} size={24} />
								<span className="text-xl">{selectedChain}</span>
							</h1>
						)}
						<details className="group text-base">
							<summary className="flex items-center">
								<Icon
									name="chevron-right"
									height={20}
									width={20}
									className="-ml-5 -mb-5 group-open:rotate-90 transition-transform duration-100"
								/>
								<span className="flex flex-col">
									<Tooltip
										content="Sum of TVL of the protocols on the chain"
										className="underline decoration-dotted text-[#545757] dark:text-[#cccccc]"
									>
										<span>Total Value Locked (DeFi)</span>
									</Tooltip>
									<span className="font-semibold text-2xl font-jetbrains min-h-8">{tvl}</span>
								</span>
							</summary>

							<p className="flex items-center flex-wrap justify-between gap-2 mt-3 mb-1">
								<span className="text-[#545757] dark:text-[#cccccc]">Change (24h)</span>
								<span className="font-jetbrains">{percentChange || 0}%</span>
							</p>
						</details>

						<table className="text-base w-full border-collapse mt-4">
							<tbody>
								{stablecoinsData?.totalMcapCurrent ? (
									<RowWithSubRows
										rowHeader={
											<Tooltip
												content="Sum of market cap of all stablecoins circulating on the chain"
												className="underline decoration-dotted"
											>
												Stablecoins Mcap
											</Tooltip>
										}
										rowValue={formattedNum(stablecoinsData.totalMcapCurrent, true)}
										helperText={null}
										protocolName={null}
										dataType={null}
										subRows={
											<>
												{stablecoinsData.change7d ? (
													<tr>
														<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															Change (7d)
														</th>
														<td className="text-right font-jetbrains">{stablecoinsData.change7d}%</td>
													</tr>
												) : null}
												{stablecoinsData.dominance ? (
													<tr>
														<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															{stablecoinsData.topToken.symbol} Dominance
														</th>
														<td className="text-right font-jetbrains">{stablecoinsData.dominance}%</td>
													</tr>
												) : null}
											</>
										}
									/>
								) : null}

								{feesAndRevenueData?.totalFees24h ? (
									<tr>
										<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
											<Tooltip
												content="Total fees paid by users when using the chain"
												className="underline decoration-dotted"
											>
												Chain Fees (24h)
											</Tooltip>
										</th>
										<td className="font-jetbrains text-right">
											{formattedNum(feesAndRevenueData?.totalFees24h, true)}
										</td>
									</tr>
								) : null}

								{feesAndRevenueData?.totalRevenue24h ? (
									<tr>
										<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
											<Tooltip
												content="Subset of fees that the chain collects for itself"
												className="underline decoration-dotted"
											>
												Chain Revenue (24h)
											</Tooltip>
										</th>
										<td className="font-jetbrains text-right">
											{formattedNum(feesAndRevenueData?.totalRevenue24h, true)}
										</td>
									</tr>
								) : null}

								{feesAndRevenueData?.totalAppRevenue24h ? (
									<tr>
										<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
											<Tooltip
												content="Total revenue earned by the apps on the chain"
												className="underline decoration-dotted"
											>
												App Revenue (24h)
											</Tooltip>
										</th>
										<td className="font-jetbrains text-right">
											{formattedNum(feesAndRevenueData?.totalAppRevenue24h, true)}
										</td>
									</tr>
								) : null}

								{volumeData?.totalVolume24h ? (
									<RowWithSubRows
										rowHeader={
											<Tooltip content="Sum of volume on all DEXs on the chain" className="underline decoration-dotted">
												DEXs Volume (24h)
											</Tooltip>
										}
										rowValue={formattedNum(volumeData.totalVolume24h, true)}
										helperText={null}
										protocolName={null}
										dataType={null}
										subRows={
											<>
												{volumeData.totalVolume7d ? (
													<tr>
														<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															Volume (7d)
														</th>
														<td className="text-right font-jetbrains">
															{formattedNum(volumeData.totalVolume7d, true)}
														</td>
													</tr>
												) : null}
												<tr>
													<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
														Weekly Change
													</th>
													<td className="text-right font-jetbrains">{volumeData.weeklyChange}%</td>
												</tr>
												<tr>
													<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
														DEX vs CEX dominance
													</th>
													<td className="text-right font-jetbrains">{volumeData.dexsDominance}%</td>
												</tr>
											</>
										}
									/>
								) : null}

								{perpsData?.totalVolume24h ? (
									<RowWithSubRows
										rowHeader={
											<Tooltip
												content="Sum of volume on all perpetual exchanges on the chain"
												className="underline decoration-dotted"
											>
												Perps Volume (24h)
											</Tooltip>
										}
										rowValue={formattedNum(perpsData.totalVolume24h, true)}
										helperText={null}
										protocolName={null}
										dataType={null}
										subRows={
											<>
												{perpsData.totalVolume7d ? (
													<tr>
														<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															Perps Volume (7d)
														</th>
														<td className="text-right font-jetbrains">{formattedNum(perpsData.totalVolume7d, true)}</td>
													</tr>
												) : null}
												<tr>
													<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
														Weekly Change
													</th>
													<td className="text-right font-jetbrains">{perpsData.weeklyChange}%</td>
												</tr>
											</>
										}
									/>
								) : null}

								{totalFundingAmount ? (
									<tr>
										<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
											Total Funding Amount
										</th>
										<td className="font-jetbrains text-right">{formattedNum(totalFundingAmount, true)}</td>
									</tr>
								) : null}

								{inflowsData?.netInflows ? (
									<tr>
										<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
											<Tooltip
												content="Net money bridged to the chain within the last 24h"
												className="underline decoration-dotted"
											>
												Inflows (24h)
											</Tooltip>
										</th>
										<td className="font-jetbrains text-right">{formattedNum(inflowsData.netInflows, true)}</td>
									</tr>
								) : null}

								{userData.activeUsers ? (
									<RowWithSubRows
										rowHeader={
											<Tooltip
												content={
													<p>
														Number of unique addresses that have interacted with the protocol directly in the last 24
														hours. Interactions are counted as transactions sent directly against the protocol, thus
														transactions that go through an aggregator or some other middleman contract are not counted
														here.
														<br />
														<br />
														The reasoning for this is that this is meant to help measure stickiness/loyalty of users,
														and users that are interacting with the protocol through another product aren't likely to be
														sticky.
													</p>
												}
												className="underline decoration-dotted"
											>
												Active Addresses (24h)
											</Tooltip>
										}
										rowValue={formattedNum(userData.activeUsers, false)}
										helperText={null}
										protocolName={null}
										dataType={null}
										subRows={
											<>
												{userData.newUsers ? (
													<tr>
														<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															New Addresses (24h)
														</th>
														<td className="text-right font-jetbrains">{formattedNum(userData.newUsers, false)}</td>
													</tr>
												) : null}
												{userData.transactions ? (
													<tr>
														<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															Transactions (24h)
														</th>
														<td className="text-right font-jetbrains">{formattedNum(userData.transactions, false)}</td>
													</tr>
												) : null}
											</>
										}
									/>
								) : null}
								{chainTreasury ? (
									<RowWithSubRows
										rowHeader={'Treasury'}
										rowValue={formattedNum(chainTreasury?.tvl, true)}
										helperText={null}
										protocolName={null}
										dataType={null}
										subRows={
											<>
												{chainTreasury.tokenBreakdowns?.stablecoins ? (
													<tr>
														<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															Stablecoins
														</th>
														<td className="text-right font-jetbrains">
															{formattedNum(chainTreasury.tokenBreakdowns?.stablecoins, true)}
														</td>
													</tr>
												) : null}
												{chainTreasury.tokenBreakdowns?.majors ? (
													<tr>
														<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															Major Tokens (ETH, BTC)
														</th>
														<td className="text-right font-jetbrains">
															{formattedNum(chainTreasury.tokenBreakdowns?.majors, true)}
														</td>
													</tr>
												) : null}
												{chainTreasury.tokenBreakdowns?.others ? (
													<tr>
														<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															Other Tokens
														</th>
														<td className="text-right font-jetbrains">
															{formattedNum(chainTreasury.tokenBreakdowns?.others, true)}
														</td>
													</tr>
												) : null}
												{chainTreasury.tokenBreakdowns?.ownTokens ? (
													<tr>
														<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															Own Tokens
														</th>
														<td className="text-right font-jetbrains">
															{formattedNum(chainTreasury.tokenBreakdowns?.ownTokens, true)}
														</td>
													</tr>
												) : null}
											</>
										}
									/>
								) : null}
								{chainRaises && chainRaises.length > 0 && (
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
										rowValue={formatRaisedAmount(chainRaises.reduce((sum, r) => sum + Number(r.amount), 0))}
										subRows={
											<>
												{chainRaises
													.sort((a, b) => a.date - b.date)
													.map((raise) => (
														<React.Fragment key={raise.date + raise.amount}>
															<tr>
																<th className="text-left mb-auto font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
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
																			<React.Fragment key={'raised from ' + i}>
																				<a href={`/raises/${sluggify(i)}`}>{i}</a>
																				{index < arr.length - 1 ? ', ' : ''}
																			</React.Fragment>
																		))}
																</td>
															</tr>
														</React.Fragment>
													))}
											</>
										}
									/>
								)}
								{chainAssets ? (
									<RowWithSubRows
										rowHeader="Bridged TVL"
										rowValue={formattedNum(
											chainAssets.total.total + (extraTvlsEnabled.govtokens ? chainAssets?.ownTokens?.total || 0 : 0),
											true
										)}
										helperText={null}
										protocolName={null}
										dataType={null}
										subRows={
											<>
												{chainAssets ? (
													<>
														{chainAssets.native?.total ? (
															<tr>
																<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
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
																	{formattedNum(chainAssets.native.total, true)}
																</td>
															</tr>
														) : null}
														{chainAssets.ownTokens?.total ? (
															<tr>
																<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
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
																	{formattedNum(chainAssets.ownTokens.total, true)}
																</td>
															</tr>
														) : null}

														{chainAssets.canonical?.total ? (
															<tr>
																<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
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
																	{formattedNum(chainAssets.canonical.total, true)}
																</td>
															</tr>
														) : null}

														{chainAssets.thirdParty?.total ? (
															<tr>
																<th className="text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
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
																	{formattedNum(chainAssets.thirdParty.total, true)}
																</td>
															</tr>
														) : null}
													</>
												) : null}
											</>
										}
									/>
								) : null}

								{nftVolumesData ? (
									<tr>
										<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
											<Tooltip content="Volume of NFTs traded on the chain" className="underline decoration-dotted">
												NFT Volume (24h)
											</Tooltip>
										</th>
										<td className="font-jetbrains text-right">{formattedNum(nftVolumesData, true)}</td>
									</tr>
								) : null}

								{chainTokenInfo?.market_data ? (
									<tr>
										<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
											{chainTokenInfo?.tokenSymbol} Price
										</th>
										<td className="font-jetbrains text-right">
											{formattedNum(chainTokenInfo?.market_data?.current_price?.usd, true)}
										</td>
									</tr>
								) : null}

								{chainTokenInfo?.market_data ? (
									<tr>
										<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
											{chainTokenInfo?.tokenSymbol} Market Cap
										</th>
										<td className="font-jetbrains text-right">
											{formattedNum(chainTokenInfo?.market_data?.market_cap?.usd, true)}
										</td>
									</tr>
								) : null}
								{chainTokenInfo?.market_data ? (
									<tr>
										<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
											{chainTokenInfo?.tokenSymbol} FDV
										</th>
										<td className="font-jetbrains text-right">
											{formattedNum(chainTokenInfo?.market_data?.fully_diluted_valuation?.usd, true)}
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
						<CSVDownloadButton
							isLight
							style={{ width: '100px', marginTop: 'auto', marginLeft: '-12px' }}
							onClick={() => {
								window.open(
									`https://api.llama.fi/simpleChainDataset/${
										chainsNamesMap[selectedChain] || selectedChain
									}?${Object.entries(extraTvlsEnabled)
										.filter((t) => t[1] === true)
										.map((t) => `${t[0]}=true`)
										.join('&')}`.replaceAll(' ', '%20')
								)
							}}
						/>
					</div>

					<div className="flex flex-col gap-4 py-4 col-span-1 min-h-[502px]">
						{easterEgg ? (
							<Game />
						) : (
							<>
								<div className="flex flex-wrap gap-4 mx-4 last:*:ml-auto">
									<div className="flex gap-2 flex-wrap">
										{chartOptions
											.filter((o) => o.isVisible)
											.map(({ id, name }) => (
												<label
													key={id + 'chart-option'}
													className="text-sm font-medium cursor-pointer rounded-xl relative"
												>
													<input
														type="checkbox"
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
														className="peer absolute w-[1em] h-[1em] opacity-[0.00001] outline-none"
													/>
													<span className="relative z-[1] block rounded-xl py-2 px-3 whitespace-nowrap font-medium text-sm text-[var(--link-text)] bg-[var(--link-bg)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] peer-checked:bg-[var(--link-active-bg)] peer-checked:text-white">
														{name}
													</span>
												</label>
											))}
									</div>

									{DENOMINATIONS.length > 1 && (
										<div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full max-w-fit bg-[rgba(33,114,229,0.2)]">
											{DENOMINATIONS.map((D) => (
												<button
													data-active={denomination === D}
													key={'denomination' + D}
													className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
													onClick={() => updateRoute('currency', D, router)}
												>
													{D}
												</button>
											))}
										</div>
									)}
									{hasAtleasOneBarChart ? (
										<>
											<div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full max-w-fit bg-[rgba(33,114,229,0.2)]">
												<button
													className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
													data-active={groupBy === 'daily' || !groupBy}
													onClick={() => updateGroupBy('daily')}
												>
													Daily
												</button>
												<button
													className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
													data-active={groupBy === 'weekly'}
													onClick={() => updateGroupBy('weekly')}
												>
													Weekly
												</button>
												<button
													className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
													data-active={groupBy === 'monthly'}
													onClick={() => updateGroupBy('monthly')}
												>
													Monthly
												</button>
												<button
													className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
													data-active={groupBy === 'cumulative'}
													onClick={() => updateGroupBy('cumulative')}
												>
													Cumulative
												</button>
												<EmbedChart color={primaryColor} />
											</div>
										</>
									) : null}
								</div>

								{isFetchingChartData || !router.isReady ? (
									<div className="flex items-center justify-center m-auto h-[360px]">
										<LocalLoader />
									</div>
								) : (
									<ChainChart datasets={chartDatasets} title="" denomination={denomination} isThemeDark={darkMode} />
								)}
							</>
						)}
					</div>
					<button onClick={activateEasterEgg} className="absolute -bottom-9 left-0">
						<img src={llamaLogo.src} width="41px" height="34px" alt="" />
						<span className="sr-only">Activate Easter Egg</span>
					</button>
				</div>

				{finalProtocolsList.length > 0 ? (
					<ProtocolsByChainTable data={finalProtocolsList} />
				) : (
					<p className="text-center my-[256px]">{`${selectedChain} chain has no protocols listed`}</p>
				)}

				{fetchingProtocolsList || fetchingProtocolsFeesAndRevenueByChain || fetchingProtocolsVolumeByChain ? (
					<p className="text-center my-1">Loading...</p>
				) : null}
			</div>
		</>
	)
}
