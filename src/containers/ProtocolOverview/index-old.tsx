import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { LazyChart } from '~/components/LazyChart'
import { Bookmark } from '~/components/Bookmark'
import { CopyHelper } from '~/components/Copy'
import { TokenLogo } from '~/components/TokenLogo'
import { SEO } from '~/components/SEO'
import { AuditInfo } from '~/components/AuditInfo'
import ProtocolChart from './Chart/ProtocolChart'
import { QuestionHelper } from '~/components/QuestionHelper'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { extraTvlOptionsHelperTexts, tvlOptions } from '~/components/Filters/options'
import { DEFI_SETTINGS_KEYS, FEES_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { capitalizeFirstLetter, formatPercentage, formattedNum, getBlockExplorer, slug, tokenIconUrl } from '~/utils'
import { useFetchProtocolTwitter, useGetTokenPrice } from '~/api/categories/protocols/client'
import type { IFusedProtocolData, IProtocolDevActivity, NftVolumeData } from '~/api/types'
import boboLogo from '~/assets/boboSmug.png'
import { formatTvlsByChain, formatRaisedAmount, formatRaise, useFetchProtocolAddlChartsData } from './utils'
import { NewsCard } from '~/components/News/Card'
import { DLNewsLogo } from '~/components/News/Logo'
import { Flag } from './Flag'
import { sluggify } from '~/utils/cache-client'
import dayjs from 'dayjs'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { feesOptions } from '~/components/Filters/options'
import { Icon } from '~/components/Icon'
import { RowWithSubRows } from './RowWithSubRows'
import { Tooltip } from '~/components/Tooltip'
import { ProtocolOverviewLayout } from './Layout'
import { IArticle, IProtocolPageMetrics } from './types'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

interface IProtocolContainerProps {
	articles: IArticle[]
	devMetrics: IProtocolDevActivity
	nftVolumeData: NftVolumeData
	title: string
	protocol: string
	protocolData: IFusedProtocolData
	backgroundColor: string
	similarProtocols: Array<{ name: string; tvl: number }>
	treasury: { [category: string]: number } | null
	isCEX?: boolean
	chartColors: { [type: string]: string }
	users: {
		activeUsers: number | null
		newUsers: number | null
		transactions: number | null
		gasUsd: number | null
	} | null
	fees30d: number | null
	revenue30d: number | null
	holdersRevenue30d: number | null
	tokenTaxesRevenue30d: number | null
	bribesRevenue30d: number | null
	allTimeFees: number | null
	allTimeRevenue: number | null
	allTimeHoldersRevenue: number | null
	allTimeBribesRevenue: number | null
	allTimeTokenTaxesRevenue: number | null
	dailyFees: number | null
	dailyRevenue: number | null
	dailyHoldersRevenue: number | null
	dailyBribesRevenue: number | null
	dailyTokenTaxes: number | null
	dailyVolume: number | null
	allTimeVolume: number | null
	dailyPerpsVolume: number | null
	allTimePerpsVolume: number | null
	dailyAggregatorsVolume: number | null
	allTimeAggregatorsVolume: number | null
	dailyPerpsAggregatorVolume: number | null
	allTimePerpsAggregatorVolume: number | null
	dailyOptionsPremiumVolume: number | null
	dailyOptionsNotionalVolume: number | null
	controversialProposals: Array<{ title: string; link?: string }> | null
	governanceApis: Array<string> | null
	expenses: any
	yields: { noOfPoolsTracked: number; averageAPY: number } | null
	helperTexts: {
		fees?: string | null
		revenue?: string | null
		users?: string | null
		incentives?: string | null
		earnings?: string | null
	}
	tokenLiquidity: Array<[string, string, number]>
	tokenCGData: {
		price: {
			current: number | null
			ath: number | null
			atl: number | null
			athDate: number | null
			atlDate: number | null
		}
		marketCap: { current: number | null }
		fdv: { current: number | null }
		totalSupply: number | null
		volume24h: { total: number | null; cex: number | null; dex: number | null }
	}
	nextEventDescription: string | null
	methodologyUrls: { [type: string]: string | null }
	chartDenominations?: Array<{ symbol: string; geckoId: string | null }>
	twitterData?: { tweets: Array<{ date: string; id: string; message: string }> }
	hacksData?: Array<{
		date: number
		name: string
		classification: string
		technique: string
		amount: number
		chain: Array<string>
		bridgeHack: boolean
		targetType: string
		source: string
		returnedFunds: number | null
		defillamaId: string
	}>
	pageStyles: {
		'--primary-color': string
		'--bg-color': string
		'--btn-bg': string
		'--btn-hover-bg': string
		'--btn-text': string
	}
	tab?: string
	metrics: IProtocolPageMetrics
	incentivesData: {
		emissions24h: number
		emissions7d: number
		emissions30d: number
		emissionsAllTime: number
		incentivesChart: Array<[number, number]>
	}
}

function explainAnnualized(text: string | undefined) {
	return `${
		!text ? '' : text + '.\n'
	}This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it`
}

const isLowerCase = (letter: string) => letter === letter.toLowerCase()

const ProtocolContainer = ({
	articles,
	devMetrics,
	protocolData,
	treasury,
	protocol,
	backgroundColor,
	similarProtocols,
	isCEX,
	chartColors,
	users,
	fees30d,
	revenue30d,
	holdersRevenue30d,
	allTimeFees,
	dailyFees,
	dailyRevenue,
	dailyHoldersRevenue,
	dailyBribesRevenue,
	dailyTokenTaxes,
	bribesRevenue30d,
	tokenTaxesRevenue30d,
	allTimeRevenue,
	allTimeHoldersRevenue,
	allTimeBribesRevenue,
	allTimeTokenTaxesRevenue,
	dailyVolume,
	allTimeVolume,
	dailyPerpsVolume,
	allTimePerpsVolume,
	dailyAggregatorsVolume,
	allTimeAggregatorsVolume,
	dailyPerpsAggregatorVolume,
	allTimePerpsAggregatorVolume,
	dailyOptionsPremiumVolume,
	dailyOptionsNotionalVolume,
	controversialProposals,
	governanceApis,
	expenses,
	helperTexts,
	tokenLiquidity,
	tokenCGData,
	nextEventDescription,
	methodologyUrls,
	chartDenominations = [],
	hacksData,
	nftVolumeData,
	pageStyles,
	tab,
	metrics,
	incentivesData
}: IProtocolContainerProps) => {
	const {
		address = '',
		name,
		symbol,
		assetToken,
		url,
		referralUrl,
		description,
		audits,
		category,
		twitter,
		tvlBreakdowns = {},
		tvlByChain = [],
		audit_links,
		methodology,
		historicalChainTvls,
		forkedFrom,
		otherProtocols,
		hallmarks,
		gecko_id,
		isParentProtocol,
		raises,
		isHourlyChart,
		stablecoins,
		deprecated
	} = protocolData

	const router = useRouter()

	const { usdInflows: usdInflowsParam, denomination } = router.query

	const { explorers } = getBlockExplorer(address)

	const [bobo, setBobo] = React.useState(false)

	const [extraTvlsEnabled, updater] = useLocalStorageSettingsManager('tvl_fees')

	const { data: twitterData } = useFetchProtocolTwitter(protocolData?.twitter ? protocolData?.twitter : null)
	const weeksFromLastTweet = React.useMemo(() => {
		if (twitterData) {
			const lastTweetDate = twitterData.tweets?.slice(-1)?.[0]?.date
			const weeksFromLastTweet = dayjs().diff(dayjs(lastTweetDate), 'weeks')

			return weeksFromLastTweet
		}
	}, [twitterData])
	const { totalValue, hasTvl } = React.useMemo(() => {
		let tvl = 0

		Object.entries(tvlBreakdowns).forEach(([section, sectionTvl]: any) => {
			if (section.includes('-') || section === 'offers') return

			if (section === 'doublecounted') {
				tvl -= sectionTvl
			}

			if (Object.keys(extraTvlsEnabled).includes(section.toLowerCase())) {
				// convert to lowercase as server response is not consistent in extra-tvl names
				if (extraTvlsEnabled[section.toLowerCase()]) tvl += sectionTvl
			} else {
				tvl += sectionTvl
			}
		})

		if (tvl === 0 && Object.keys(tvlBreakdowns).length === 0) {
			Object.entries(historicalChainTvls).forEach(([section, sectionData]) => {
				if (section.includes('-')) return

				if (section === 'doublecounted') {
					tvl -= sectionData.tvl[sectionData.tvl.length - 1].totalLiquidityUSD
				}

				if (Object.keys(extraTvlsEnabled).includes(section.toLowerCase())) {
					// convert to lowercase as server response is not consistent in extra-tvl names
					if (extraTvlsEnabled[section.toLowerCase()])
						tvl += sectionData.tvl[sectionData.tvl.length - 1]?.totalLiquidityUSD ?? 0
				} else {
					tvl += sectionData.tvl[sectionData.tvl.length - 1]?.totalLiquidityUSD ?? 0
				}
			})
		}

		return {
			totalValue: tvl,
			hasTvl:
				Object.values(tvlBreakdowns).find((x) => x > 0) ||
				Object.values(historicalChainTvls).find((x) => x.tvl && x.tvl.length > 0)
					? true
					: false
		}
	}, [extraTvlsEnabled, tvlBreakdowns, historicalChainTvls])

	const { tvls, chainsUnique, extraTvls, toggleOptions } = React.useMemo(() => {
		const {
			tvls: tvlsByChain,
			extraTvls,
			finalTvlOptions
		} = tvlByChain.reduce(
			(acc, [name, tvl]: [string, number]) => {
				// skip masterchef tvl type
				if (name === 'masterchef' || name === 'offers') return acc

				// check if tvl name is addl tvl type and is toggled
				if (isLowerCase(name[0]) && DEFI_SETTINGS_KEYS.includes(name)) {
					acc.extraTvls.push([name, tvl])
					acc.finalTvlOptions.push(tvlOptions.find((e) => e.key === name))
				} else {
					// only include total tvl of each chain skip breakdown of addl tvls if extra tvl type is not toggled
					if (!name.includes('-')) {
						acc.tvls[name] = (acc.tvls[name] || 0) + tvl
					} else {
						// format name to only include chain name and check if it already exists in tvls list
						const chainName = name.split('-')[0]
						const prop = name.split('-')[1]

						// check if prop is toggled
						if (extraTvlsEnabled[prop.toLowerCase()]) {
							acc.tvls[chainName] = (acc.tvls[chainName] || 0) + tvl
						}
					}
				}
				return acc
			},
			{
				tvls: {},
				extraTvls: [],
				finalTvlOptions: []
			}
		)

		const feesToggle = []

		if (dailyBribesRevenue != null) {
			feesToggle.push(feesOptions.find((f) => f.key === FEES_SETTINGS.BRIBES))
		}
		if (dailyTokenTaxes != null) {
			feesToggle.push(feesOptions.find((f) => f.key === FEES_SETTINGS.TOKENTAX))
		}

		const tvls = Object.entries(tvlsByChain)

		const chainsUnique = tvls.map((t) => t[0])

		return { tvls, chainsUnique, extraTvls, toggleOptions: [...finalTvlOptions, ...feesToggle] }
	}, [dailyBribesRevenue, dailyTokenTaxes, extraTvlsEnabled, tvlByChain])

	const { data: addlProtocolData, isLoading } = useFetchProtocolAddlChartsData(protocol)
	const { usdInflows, tokenInflows, tokensUnique, tokenBreakdown, tokenBreakdownUSD, tokenBreakdownPieChart } =
		addlProtocolData || {}

	const chainsSplit = React.useMemo(() => {
		return formatTvlsByChain({ historicalChainTvls, extraTvlsEnabled })
	}, [historicalChainTvls, extraTvlsEnabled])

	const showCharts =
		isLoading ||
		(chainsSplit && chainsUnique?.length > 1) ||
		(tokenBreakdown?.length > 1 && tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 1) ||
		tokensUnique?.length > 0 ||
		usdInflows ||
		tokenInflows
			? true
			: false

	const stakedAmount =
		historicalChainTvls?.['staking']?.tvl?.length > 0
			? historicalChainTvls?.['staking']?.tvl[historicalChainTvls?.['staking']?.tvl.length - 1]?.totalLiquidityUSD ??
			  null
			: null

	const borrowedAmount =
		historicalChainTvls?.['borrowed']?.tvl?.length > 0
			? historicalChainTvls?.['borrowed']?.tvl[historicalChainTvls?.['borrowed']?.tvl.length - 1]?.totalLiquidityUSD ??
			  null
			: null

	const { data: chainPrice, isLoading: fetchingChainPrice } = useGetTokenPrice(chartDenominations?.[1]?.geckoId)

	const formatPrice = (value?: number | string | null): string | number | null => {
		if (Number.isNaN(Number(value))) return null

		if (!fetchingChainPrice && chainPrice?.price && denomination && denomination !== 'USD') {
			return formattedNum(Number(value) / chainPrice.price, false) + ` ${chainPrice.symbol}`
		}

		return formattedNum(value, true)
	}

	let dailyFeesFinal = dailyFees
	let fees30dFinal = fees30d
	let allTimeFeesFinal = allTimeFees

	let dailyRevenueFinal = dailyRevenue
	let revenue30dFinal = revenue30d
	let allTimeRevenueFinal = allTimeRevenue

	let dailyHoldersRevenueFinal = dailyHoldersRevenue
	let holdersRevenue30dFinal = holdersRevenue30d
	let allTimeHoldersRevenueFinal = allTimeHoldersRevenue

	if (extraTvlsEnabled[FEES_SETTINGS.BRIBES] && dailyBribesRevenue != null) {
		dailyFeesFinal = dailyFees + (dailyBribesRevenue ?? 0)
		fees30dFinal = fees30d + (bribesRevenue30d ?? 0)
		allTimeFeesFinal = allTimeFees + (allTimeBribesRevenue ?? 0)

		dailyRevenueFinal = dailyRevenue + (dailyBribesRevenue ?? 0)
		revenue30dFinal = revenue30d + (bribesRevenue30d ?? 0)
		allTimeRevenueFinal = allTimeRevenue + (allTimeBribesRevenue ?? 0)

		dailyHoldersRevenueFinal = dailyHoldersRevenue + (dailyBribesRevenue ?? 0)
		holdersRevenue30dFinal = holdersRevenue30d + (bribesRevenue30d ?? 0)
		allTimeHoldersRevenueFinal = allTimeHoldersRevenue + (allTimeBribesRevenue ?? 0)
	}
	if (extraTvlsEnabled[FEES_SETTINGS.TOKENTAX] && dailyTokenTaxes != null) {
		dailyFeesFinal = dailyFees + (dailyTokenTaxes ?? 0)
		fees30dFinal = fees30d + (tokenTaxesRevenue30d ?? 0)
		allTimeFeesFinal = allTimeFees + (allTimeTokenTaxesRevenue ?? 0)

		dailyRevenueFinal = dailyRevenue + (dailyTokenTaxes ?? 0)
		revenue30dFinal = revenue30dFinal + (tokenTaxesRevenue30d ?? 0)
		allTimeRevenueFinal = allTimeRevenue + (allTimeTokenTaxesRevenue ?? 0)

		dailyHoldersRevenueFinal = dailyHoldersRevenue + (dailyTokenTaxes ?? 0)
		holdersRevenue30dFinal = holdersRevenue30d + (tokenTaxesRevenue30d ?? 0)
		allTimeHoldersRevenueFinal = allTimeHoldersRevenue + (allTimeTokenTaxesRevenue ?? 0)
	}

	return (
		<ProtocolOverviewLayout
			isCEX={isCEX}
			name={name}
			category={category}
			otherProtocols={otherProtocols}
			toggleOptions={toggleOptions}
			metrics={metrics}
			tab={(tab ?? 'information') as any}
		>
			<SEO
				cardName={name}
				token={name}
				logo={tokenIconUrl(name)}
				tvl={formattedNum(totalValue, true)?.toString()}
				isCEX={isCEX}
			/>
			{!tab || tab === 'information' ? (
				<div className="flex flex-col gap-1">
					<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
						<div className="bg-(--cards-bg) rounded-md flex flex-col gap-3 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
							<h1 className="flex items-center flex-wrap gap-2 text-xl">
								<TokenLogo logo={tokenIconUrl(name)} size={24} />
								<span className="font-bold">{name ? name + `${deprecated ? ' (*Deprecated*)' : ''}` + ' ' : ''}</span>
								<span className="font-normal mr-auto">{symbol && symbol !== '-' ? `(${symbol})` : ''}</span>
								<Bookmark readableProtocolName={name} />
							</h1>

							{totalValue || hasTvl ? (
								<details className="group mt-6">
									<summary className="flex items-center">
										<Icon
											name="chevron-right"
											height={20}
											width={20}
											className="-ml-5 -mb-5 group-open:rotate-90 transition-transform duration-100"
										/>
										<span className="flex flex-col">
											<span className="flex items-center flex-nowrap gap-2">
												{isCEX ? (
													<Tooltip
														content={'Value of all assets held on chain'}
														className="underline decoration-dotted text-[#545757] dark:text-[#cccccc]"
													>
														<span>Total Assets</span>
													</Tooltip>
												) : (
													<Tooltip
														content={'Value of all coins held in smart contracts of the protocol'}
														className="underline decoration-dotted text-[#545757] dark:text-[#cccccc]"
													>
														<span>Total Value Locked</span>
													</Tooltip>
												)}
												<Flag
													protocol={protocolData.name}
													dataType={'TVL'}
													isLending={category === 'Lending'}
													className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
												/>
											</span>
											<span className="font-semibold text-2xl font-jetbrains min-h-8" suppressHydrationWarning>
												{formatPrice(totalValue || '0')}
											</span>
										</span>
									</summary>

									<div className="max-h-[50vh] overflow-auto">
										<table className="text-base w-full border-collapse mt-4">
											<tbody>
												<tr>
													<td>
														{tvls.length > 0 && (
															<table className="w-full border-collapse">
																<caption className="text-xs text-[#545757] dark:text-[#cccccc] text-left pb-1">
																	{isCEX ? 'Assets by chain' : 'Chain Breakdown'}
																</caption>
																<tbody>
																	{tvls.map((chainTvl) => (
																		<tr key={JSON.stringify(chainTvl)}>
																			<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">
																				{capitalizeFirstLetter(chainTvl[0])}
																			</th>
																			<td className="font-jetbrains text-right whitespace-nowrap">
																				{formatPrice((chainTvl[1] || 0) as number)}
																			</td>
																		</tr>
																	))}
																</tbody>
															</table>
														)}
													</td>
												</tr>

												<tr>
													<td>
														{extraTvls.length > 0 && (
															<table className="w-full border-collapse mt-4">
																<thead>
																	<tr>
																		<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">
																			Include in TVL (optional)
																		</th>
																		<td>
																			<QuestionHelper
																				text='People define TVL differently. Instead of being opinionated, we give you the option to choose what you would include in a "real" TVL calculation'
																				className="ml-auto"
																			/>
																		</td>
																	</tr>
																</thead>
																<tbody>
																	{extraTvls.map(([option, value]) => (
																		<tr key={option + value}>
																			<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">
																				<label className="flex items-center gap-2 cursor-pointer">
																					<input
																						type="checkbox"
																						value={option}
																						checked={extraTvlsEnabled[option]}
																						onChange={() => updater(option)}
																					/>
																					<span style={{ opacity: extraTvlsEnabled[option] ? 1 : 0.7 }}>
																						<Tooltip
																							content={extraTvlOptionsHelperTexts[option]}
																							className="underline decoration-dotted text-[#545757] dark:text-[#cccccc]"
																						>
																							<span>{capitalizeFirstLetter(option)}</span>
																						</Tooltip>
																					</span>
																				</label>
																			</th>
																			<td className="font-jetbrains text-right whitespace-nowrap">
																				{formatPrice(value)}
																			</td>
																		</tr>
																	))}
																</tbody>
															</table>
														)}
													</td>
												</tr>
											</tbody>
										</table>
									</div>
								</details>
							) : null}

							<table className="text-base w-full border-collapse mt-4">
								<tbody>
									{tokenCGData?.marketCap?.current ? (
										<>
											<tr className="group">
												<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left flex items-center gap-1">
													<span>Market Cap</span>
													<Flag
														protocol={protocolData.name}
														dataType={'Market Cap'}
														className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
													/>
												</th>
												<td className="font-jetbrains text-right whitespace-nowrap">
													{formatPrice(tokenCGData.marketCap.current)}
												</td>
											</tr>

											{nextEventDescription ? (
												<tr className="relative -top-[6px]">
													<td className="text-sm opacity-60 text-right" colSpan={2}>
														{nextEventDescription}
													</td>
												</tr>
											) : null}
										</>
									) : null}

									{tokenCGData?.price?.current ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType="Token Price"
											rowHeader={`${assetToken || symbol ? `$${assetToken ?? symbol}` : 'Token'} Price`}
											rowValue={formatPrice(tokenCGData.price.current)}
											helperText={null}
											subRows={
												<>
													{tokenCGData.price.ath ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`All Time High (${new Date(
																tokenCGData.price.athDate
															).toLocaleDateString()})`}</th>
															<td className="text-sm text-right">{formatPrice(tokenCGData.price.ath)}</td>
														</tr>
													) : null}

													{tokenCGData.price.atl ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`All Time Low (${new Date(
																tokenCGData.price.atlDate
															).toLocaleDateString()})`}</th>
															<td className="text-sm text-right">{formatPrice(tokenCGData.price.atl)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : null}
									{tokenCGData?.fdv?.current ? (
										<tr className="group">
											<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left flex items-center gap-1">
												<Tooltip
													content={`Fully Diluted Valuation, this is calculated by taking the expected maximum supply of the token and multiplying it by the price. It's mainly used to calculate the hypothetical marketcap of the token if all the tokens were unlocked and circulating.\n\nData for this metric is imported directly from coingecko.`}
													className="underline decoration-dotted"
												>
													Fully Diluted Valuation
												</Tooltip>
												<Flag
													protocol={protocolData.name}
													dataType={'FDV'}
													className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
												/>
											</th>
											<td className="font-jetbrains text-right whitespace-nowrap">
												{formatPrice(tokenCGData.fdv.current)}
											</td>
										</tr>
									) : null}
									{tokenCGData?.volume24h?.total ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											rowHeader={`24h ${symbol ? `$${symbol}` : 'Token'} Volume`}
											dataType={'Token Volume'}
											rowValue={formatPrice(tokenCGData.volume24h.total)}
											helperText={`Sum of value in all swaps to or from that token across all Centralized and Decentralized exchanges tracked by coingecko.\n\nData for this metric is imported directly from coingecko.`}
											subRows={
												<>
													{tokenCGData?.volume24h?.cex ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																CEX Volume
															</th>
															<td className="text-sm text-right">{formatPrice(tokenCGData.volume24h.cex)}</td>
														</tr>
													) : null}
													{tokenCGData?.volume24h?.dex ? (
														<>
															<tr>
																<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																	DEX Volume
																</th>
																<td className="text-sm text-right">{formatPrice(tokenCGData.volume24h.dex)}</td>
															</tr>
															<tr className="relative -top-[6px]">
																<td className="text-sm opacity-60 text-right" colSpan={2}>{`(${formatPercentage(
																	(tokenCGData.volume24h.dex / tokenCGData.volume24h.total) * 100
																)}%)`}</td>
															</tr>
														</>
													) : null}
												</>
											}
										/>
									) : null}
									{stakedAmount ? (
										<>
											<tr className="group">
												<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left flex items-center gap-1">
													<span>Staked</span>
													<Flag
														protocol={protocolData.name}
														dataType={'Staked'}
														className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
													/>
												</th>
												<td className="font-jetbrains text-right whitespace-nowrap">{formatPrice(stakedAmount)}</td>
											</tr>
											{tokenCGData?.marketCap?.current ? (
												<tr className="relative -top-[6px]">
													<td className="text-sm opacity-60 text-right" colSpan={2}>
														{`(${((stakedAmount / tokenCGData.marketCap.current) * 100).toLocaleString(undefined, {
															maximumFractionDigits: 2
														})}% of mcap)`}
													</td>
												</tr>
											) : null}
										</>
									) : null}
									{borrowedAmount ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											rowHeader={`Borrowed`}
											dataType={'Token Borrowed'}
											rowValue={formatPrice(borrowedAmount)}
											helperText={null}
											subRows={
												<>
													{tvlByChain
														.filter((c) => c[0].endsWith('-borrowed'))
														.map((c) => (
															<tr key={JSON.stringify(c)}>
																<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																	{c[0].split('-')[0]}
																</th>
																<td className="text-sm text-right">{formatPrice(c[1])}</td>
															</tr>
														))}
												</>
											}
										/>
									) : null}
									{tokenLiquidity && tokenLiquidity.length > 0 ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType="Token Liquidity"
											rowHeader={`${symbol ? `$${symbol}` : 'Token'} Liquidity`}
											rowValue={formatPrice(tokenLiquidity.reduce((acc, curr) => (acc += curr[2]), 0))}
											helperText={
												'Sum of value locked in DEX pools that include that token across all DEXs for which DefiLlama tracks pool data.'
											}
											subRows={
												<>
													{tokenLiquidity.map((item) => (
														<tr key={'token-liq' + item[0] + item[1] + item[2]}>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`${item[0]} (${item[1]})`}</th>
															<td className="text-sm text-right">{formatPrice(item[2])}</td>
														</tr>
													))}
												</>
											}
										/>
									) : null}
									{allTimeVolume && dailyVolume ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType="Volume"
											rowHeader="DEX Volume 24h"
											rowValue={formatPrice(dailyVolume)}
											helperText="Sum of value of all spot trades that went through the protocol in the last 24 hours, updated daily at 00:00UTC"
											subRows={
												<>
													{allTimeVolume ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`Cumulative Volume`}</th>
															<td className="text-sm text-right">{formatPrice(allTimeVolume)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : dailyVolume ? (
										<tr className="group">
											<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left flex items-center gap-1">
												<span>Volume 24h</span>
												<Tooltip
													content="Sum of value of all spot trades that went through the protocol in the last 24 hours, updated daily at 00:00UTC"
													className="underline decoration-dotted"
												>
													Volume 24h
												</Tooltip>
												<Flag
													protocol={protocolData.name}
													dataType={'Volume'}
													className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
												/>
											</th>
											<td className="font-jetbrains text-right whitespace-nowrap">{formatPrice(dailyVolume)}</td>
										</tr>
									) : null}
									{dailyPerpsVolume && allTimePerpsVolume ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType="Perps Volume"
											rowHeader="Perps Volume 24h"
											rowValue={formatPrice(dailyPerpsVolume)}
											helperText="Sum of value of all perps trades that went through the protocol in the last 24 hours, updated daily at 00:00UTC"
											subRows={
												<>
													{allTimePerpsVolume ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`Cumulative Volume`}</th>
															<td className="text-sm text-right">{formatPrice(allTimePerpsVolume)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : dailyPerpsVolume ? (
										<tr className="group">
											<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left flex items-center gap-1">
												<Tooltip
													content="Sum of value of all perps trades that went through the protocol in the last 24 hours, updated daily at 00:00UTC"
													className="underline decoration-dotted"
												>
													Perps Volume 24h
												</Tooltip>
												<Flag
													protocol={protocolData.name}
													dataType={'Perps Volume'}
													className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
												/>
											</th>
											<td className="font-jetbrains text-right whitespace-nowrap">{formatPrice(dailyPerpsVolume)}</td>
										</tr>
									) : null}
									{dailyAggregatorsVolume && allTimeAggregatorsVolume ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType="Aggregators Volume"
											rowHeader="Aggregators Volume 24h"
											rowValue={formatPrice(dailyAggregatorsVolume)}
											helperText="Sum of value of all spot trades that went through the protocol in the last 24 hours, updated daily at 00:00UTC"
											subRows={
												<>
													{allTimeAggregatorsVolume ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`Cumulative Volume`}</th>
															<td className="text-sm text-right">{formatPrice(allTimeAggregatorsVolume)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : dailyAggregatorsVolume ? (
										<tr className="group">
											<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left flex items-center gap-1">
												<Tooltip
													content="Sum of value of all spot trades that went through the protocol in the last 24 hours, updated daily at 00:00UTC"
													className="underline decoration-dotted"
												>
													Aggregators Volume 24h
												</Tooltip>
												<Flag
													protocol={protocolData.name}
													dataType={'Aggregators Volume'}
													className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
												/>
											</th>
											<td className="font-jetbrains text-right whitespace-nowrap">
												{formatPrice(dailyAggregatorsVolume)}
											</td>
										</tr>
									) : null}
									{dailyPerpsAggregatorVolume && allTimePerpsAggregatorVolume ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType="Perps Aggregators Volume"
											rowHeader="Perps Aggs Volume 24h"
											rowValue={formatPrice(dailyPerpsAggregatorVolume)}
											helperText="Sum of value of all perps trades that went through the protocol in the last 24 hours, updated daily at 00:00UTC"
											subRows={
												<>
													{allTimePerpsAggregatorVolume ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`Cumulative Volume`}</th>
															<td className="text-sm text-right">{formatPrice(allTimePerpsAggregatorVolume)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : dailyPerpsAggregatorVolume ? (
										<tr className="group">
											<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left flex items-center gap-1">
												<Tooltip
													content="Sum of value of all perps trades that went through the protocol in the last 24 hours, updated daily at 00:00UTC"
													className="underline decoration-dotted"
												>
													Perps Aggs Volume 24h
												</Tooltip>
												<Flag
													protocol={protocolData.name}
													dataType={'Perps Aggregators Volume'}
													className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
												/>
											</th>
											<td className="font-jetbrains text-right whitespace-nowrap">
												{formatPrice(dailyPerpsAggregatorVolume)}
											</td>
										</tr>
									) : null}

									{dailyOptionsPremiumVolume ? (
										<tr className="group">
											<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left flex items-center gap-1">
												<Tooltip
													content="Sum of value of all options trades that went through the protocol in the last 24 hours, updated daily at 00:00UTC"
													className="underline decoration-dotted"
												>
													Options Premium Volume 24h
												</Tooltip>
												<Flag
													protocol={protocolData.name}
													dataType={'Options Premium Volume 24h'}
													className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
												/>
											</th>
											<td className="font-jetbrains text-right whitespace-nowrap">
												{formatPrice(dailyOptionsPremiumVolume)}
											</td>
										</tr>
									) : null}

									{dailyOptionsNotionalVolume ? (
										<tr className="group">
											<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left flex items-center gap-1">
												<Tooltip
													content="Sum of value of all options trades that went through the protocol in the last 24 hours, updated daily at 00:00UTC"
													className="underline decoration-dotted"
												>
													Options Notional Volume 24h
												</Tooltip>
												<Flag
													protocol={protocolData.name}
													dataType={'Options Notional Volume 24h'}
													className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
												/>
											</th>
											<td className="font-jetbrains text-right whitespace-nowrap">
												{formatPrice(dailyOptionsNotionalVolume)}
											</td>
										</tr>
									) : null}

									{fees30dFinal != null ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType="Fees"
											rowHeader="Fees (annualized)"
											rowValue={formatPrice(fees30dFinal * 12.2)}
											helperText={explainAnnualized(helperTexts?.fees)}
											subRows={
												<>
													<tr>
														<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															<Tooltip
																content="Total fees paid by users in the last 30 days, updated daily at 00:00UTC"
																className="underline decoration-dotted"
															>
																Fees 30d
															</Tooltip>
														</th>
														<td className="text-sm text-right">{formatPrice(fees30dFinal)}</td>
													</tr>

													{dailyFeesFinal != null ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																<Tooltip
																	content="Total fees paid by users in the last 24 hours, updated daily at 00:00UTC"
																	className="underline decoration-dotted"
																>
																	Fees 24h
																</Tooltip>
															</th>
															<td className="text-sm text-right">{formatPrice(dailyFeesFinal)}</td>
														</tr>
													) : null}

													{allTimeFeesFinal != null ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`Cumulative Fees`}</th>
															<td className="text-sm text-right">{formatPrice(allTimeFeesFinal)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : null}
									{revenue30dFinal != null ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType="Revenue"
											rowHeader="Revenue (annualized)"
											rowValue={formatPrice(revenue30dFinal * 12.2)}
											helperText={explainAnnualized(helperTexts?.revenue)}
											subRows={
												<>
													<tr>
														<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															<Tooltip
																content="Total revenue earned by the protocol in the last 30 days, updated daily at 00:00UTC"
																className="underline decoration-dotted"
															>
																Revenue 30d
															</Tooltip>
														</th>
														<td className="text-sm text-right">{formatPrice(revenue30dFinal)}</td>
													</tr>
													{dailyRevenueFinal != null ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																<Tooltip
																	content="Total revenue earned by the protocol in the last 24 hours, updated daily at 00:00UTC"
																	className="underline decoration-dotted"
																>
																	Revenue 24h
																</Tooltip>
															</th>
															<td className="text-sm text-right">{formatPrice(dailyRevenueFinal)}</td>
														</tr>
													) : null}
													{allTimeRevenueFinal != null ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`Cumulative Revenue`}</th>
															<td className="text-sm text-right">{formatPrice(allTimeRevenueFinal)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : null}
									{holdersRevenue30dFinal != null ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType="Revenue"
											rowHeader="Holders Revenue (annualized)"
											rowValue={formatPrice(holdersRevenue30dFinal * 12.2)}
											helperText={explainAnnualized(helperTexts?.revenue)}
											subRows={
												<>
													<tr>
														<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															<Tooltip
																content="Total revenue earned by the protocol in the last 30 days, updated daily at 00:00UTC"
																className="underline decoration-dotted"
															>
																Holders Revenue 30d
															</Tooltip>
														</th>
														<td className="text-sm text-right">{formatPrice(holdersRevenue30dFinal)}</td>
													</tr>
													{dailyHoldersRevenueFinal != null ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																<Tooltip
																	content="Total revenue earned by the protocol in the last 24 hours, updated daily at 00:00UTC"
																	className="underline decoration-dotted"
																>
																	Holders Revenue 24h
																</Tooltip>
															</th>
															<td className="text-sm text-right">{formatPrice(dailyRevenueFinal)}</td>
														</tr>
													) : null}
													{allTimeHoldersRevenueFinal != null ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`Cumulative Holders Revenue`}</th>
															<td className="text-sm text-right">{formatPrice(allTimeHoldersRevenueFinal)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : null}
									{incentivesData != null ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType="Incentives"
											rowHeader="Incentives (annualized)"
											rowValue={formatPrice(incentivesData.emissions30d * 12.2)}
											helperText={explainAnnualized(helperTexts?.incentives)}
											subRows={
												<>
													<tr>
														<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															<Tooltip
																content="Total incentives distributed by the protocol in the last 30 days, updated daily at 00:00UTC"
																className="underline decoration-dotted"
															>
																Incentives 30d
															</Tooltip>
														</th>
														<td className="text-sm text-right">{formatPrice(incentivesData.emissions30d)}</td>
													</tr>
													{dailyRevenueFinal != null ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																<Tooltip
																	content="Total incentives distributed by the protocol in the last 24 hours, updated daily at 00:00UTC"
																	className="underline decoration-dotted"
																>
																	Incentives 24h
																</Tooltip>
															</th>
															<td className="text-sm text-right">{formatPrice(incentivesData.emissions24h)}</td>
														</tr>
													) : null}
													{incentivesData.emissionsAllTime != null ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`Cumulative Incentives`}</th>
															<td className="text-sm text-right">{formatPrice(incentivesData.emissionsAllTime)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : null}
									{incentivesData != null && revenue30dFinal != null ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType="Earnings"
											rowHeader="Earnings (annualized)"
											rowValue={formatPrice((revenue30d - incentivesData.emissions30d) * 12.2)}
											helperText={explainAnnualized(helperTexts?.earnings)}
											subRows={
												<>
													<tr>
														<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															<Tooltip
																content="Total earnings (revenue - incentives) of the protocol in the last 30 days, updated daily at 00:00UTC"
																className="underline decoration-dotted"
															>
																Earnings 30d
															</Tooltip>
														</th>
														<td className="text-sm text-right">
															{formatPrice(revenue30d - incentivesData.emissions30d)}
														</td>
													</tr>
													{dailyRevenueFinal != null ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																<Tooltip
																	content="Total earnings (revenue - incentives) of the protocol in the last 24 hours, updated daily at 00:00UTC"
																	className="underline decoration-dotted"
																>
																	Earnings 24h
																</Tooltip>
															</th>
															<td className="text-sm text-right">
																{formatPrice(dailyRevenueFinal - incentivesData.emissions24h)}
															</td>
														</tr>
													) : null}
													{incentivesData.emissionsAllTime != null ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">{`Cumulative Earnings`}</th>
															<td className="text-sm text-right">
																{formatPrice(allTimeRevenueFinal - incentivesData.emissionsAllTime)}
															</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : null}
									{users?.activeUsers ? (
										<RowWithSubRows
											helperText={helperTexts?.users}
											protocolName={protocolData.name}
											dataType="Users"
											rowHeader={'Active Addresses 24h'}
											rowValue={formattedNum(users.activeUsers, false)}
											subRows={
												<>
													{users.newUsers ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																New Addresses 24h
															</th>
															<td className="text-sm text-right">{formattedNum(users.newUsers, false)}</td>
														</tr>
													) : null}
													{users.transactions ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																Transactions 24h
															</th>
															<td className="text-sm text-right">{formattedNum(users.transactions, false)}</td>
														</tr>
													) : null}
													{users.gasUsd ? (
														<tr>
															<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																Gas Used 24h
															</th>
															<td className="text-sm text-right">{formatPrice(users.gasUsd)}</td>
														</tr>
													) : null}
												</>
											}
										/>
									) : null}
									{treasury && (
										<RowWithSubRows
											protocolName={protocolData.name}
											helperText={
												'Value of coins held in ownership by the protocol. By default this excludes coins created by the protocol itself.'
											}
											rowHeader={'Treasury'}
											rowValue={formatPrice(
												Object.entries(treasury).reduce(
													(acc, curr) => (acc += curr[0] === 'ownTokens' ? 0 : curr[1]),
													0
												)
											)}
											dataType={'Treasury'}
											subRows={
												<>
													{Object.entries(treasury).map(([cat, tre]) => {
														return (
															<tr key={'treasury' + cat + tre}>
																<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																	{capitalizeFirstLetter(cat)}
																</th>
																<td className="text-sm text-right">{formatPrice(tre)}</td>
															</tr>
														)
													})}
												</>
											}
										/>
									)}
									<>
										{raises && raises.length > 0 && (
											<RowWithSubRows
												protocolName={protocolData.name}
												dataType={'Raises'}
												helperText={null}
												rowHeader={'Total Raised'}
												rowValue={formatRaisedAmount(raises.reduce((sum, r) => sum + Number(r.amount), 0))}
												subRows={
													<>
														{raises
															.sort((a, b) => a.date - b.date)
															.map((raise) => (
																<React.Fragment key={raise.date + raise.amount}>
																	<tr>
																		<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																			{new Date(raise.date * 1000).toISOString().split('T')[0]}
																		</th>
																		<td className="text-sm text-right">
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
																		<td colSpan={2} className="text-sm text-right pb-4">
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
									</>
									{controversialProposals && controversialProposals.length > 0 ? (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType={'Governance'}
											helperText={null}
											rowHeader={'Top Controversial Proposals'}
											rowValue={null}
											subRows={
												<>
													{controversialProposals.map((proposal) => (
														<tr key={proposal.title}>
															<td className="text-sm text-left p-1">
																{proposal.link ? (
																	<a
																		href={proposal.link}
																		target="_blank"
																		rel="noreferrer noopener"
																		className="underline"
																	>
																		{proposal.title}
																	</a>
																) : (
																	proposal.title
																)}
															</td>
														</tr>
													))}
												</>
											}
										/>
									) : null}
									{expenses && (
										<RowWithSubRows
											protocolName={protocolData.name}
											dataType={'Expenses'}
											helperText={null}
											rowHeader={'Annual operational expenses'}
											rowValue={formatPrice(
												Object.values((expenses.annualUsdCost || {}) as { [key: string]: number }).reduce(
													(acc, curr) => (acc += curr),
													0
												)
											)}
											subRows={
												<>
													<tr>
														<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															Headcount
														</th>
														<td className="text-sm text-right">{expenses.headcount}</td>
													</tr>

													{Object.entries(expenses.annualUsdCost || {}).map(([cat, exp]: [string, number]) => {
														return (
															<tr key={'expenses' + cat + exp}>
																<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
																	{capitalizeFirstLetter(cat)}
																</th>
																<td className="text-sm text-right">{formatPrice(exp)}</td>
															</tr>
														)
													})}

													<tr>
														<th className="text-sm text-left font-normal pl-1 pb-1 text-[#545757] dark:text-[#cccccc]">
															<a href={expenses.sources?.[0] ?? null} className="underline">
																Source{' '}
																<Icon name="arrow-up-right" height={10} width={10} style={{ display: 'inline' }} />
															</a>
														</th>
														<td className="text-sm text-right"></td>
													</tr>
												</>
											}
										/>
									)}
								</tbody>
							</table>

							<Flag protocol={protocolData.name} isLending={category === 'Lending'} />
							{!isParentProtocol && (totalValue || hasTvl) ? (
								<CSVDownloadButton
									onClick={() => {
										window.open(`https://api.llama.fi/dataset/${protocol}.csv`)
									}}
									className="mt-4 mr-auto bg-(--btn-bg)! text-inherit!"
								/>
							) : null}
						</div>

						<ProtocolChart
							protocolData={protocolData}
							twitterHandle={protocolData.twitter}
							protocol={protocol}
							color={backgroundColor}
							historicalChainTvls={historicalChainTvls}
							hallmarks={hallmarks}
							bobo={bobo}
							geckoId={gecko_id}
							chartColors={chartColors}
							metrics={metrics}
							activeUsersId={users ? protocolData.id : null}
							usdInflowsData={usdInflowsParam === 'true' && !isLoading && usdInflows?.length > 0 ? usdInflows : null}
							governanceApis={governanceApis}
							isHourlyChart={isHourlyChart}
							isCEX={isCEX}
							tokenSymbol={symbol ? `$${symbol}` : 'Token'}
							protocolId={protocolData.id}
							chartDenominations={chartDenominations}
							nftVolumeData={nftVolumeData}
							incentivesData={incentivesData}
						/>

						<button
							onClick={() => setBobo(!bobo)}
							className="absolute -bottom-9 left-0 xl:bottom-[initial] xl:top-0 xl:right-0 xl:left-[initial] z-1"
						>
							<span className="sr-only">Enable Goblin Mode</span>
							<Image src={boboLogo} width={34} height={34} alt="bobo cheers" className="min-h-[34px] w-[34px]" />
						</button>
					</div>
					<div className="grid grid-cols-1 xl:grid-cols-2 gap-1 *:only:col-span-full *:last:odd:col-span-full">
						<div className="bg-(--cards-bg) rounded-md p-3 flex flex-col gap-4">
							<h3 className="font-semibold text-lg">{isCEX ? 'Exchange Information' : 'Protocol Information'}</h3>
							{description && <p>{description}</p>}

							{category && (
								<p className="flex items-center gap-2">
									<span>Category</span>
									<span>:</span>

									<a
										href={category.toLowerCase() === 'cex' ? '/cexs' : `/protocols/${category}`}
										className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
										target="_blank"
										rel="noopener noreferrer"
									>
										<span>{category}</span> <Icon name="arrow-up-right" height={12} width={12} />
									</a>
								</p>
							)}

							{forkedFrom && forkedFrom.length > 0 && (
								<p className="flex items-center gap-2">
									<span>Forked from:</span>
									<>
										{forkedFrom.map((p, index) => (
											<React.Fragment key={'forked from' + p}>
												<a
													href={`/protocol/${slug(p)}`}
													target="_blank"
													rel="noopener noreferrer"
													className="underline"
												>
													{forkedFrom[index + 1] ? p + ', ' : p}
												</a>
												<Icon name="arrow-up-right" height={12} width={12} />
											</React.Fragment>
										))}
									</>
								</p>
							)}

							{audits && audit_links && <AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} />}

							<div className="flex items-center gap-4 flex-wrap">
								{referralUrl || url ? (
									<a
										href={referralUrl || url}
										className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
										target="_blank"
										rel="noopener noreferrer"
										color={backgroundColor}
									>
										<span>Website</span> <Icon name="arrow-up-right" height={12} width={12} />
									</a>
								) : null}

								{twitter && (
									<a
										href={`https://twitter.com/${twitter}`}
										className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
										target="_blank"
										rel="noopener noreferrer"
										color={backgroundColor}
									>
										<span>Twitter</span> <Icon name="arrow-up-right" height={12} width={12} />
									</a>
								)}
							</div>
							{twitter && twitterData?.lastTweet ? (
								<p className="flex items-center gap-2">
									<span>Last tweet:</span> {dayjs(twitterData?.lastTweet?.time).fromNow()} (
									{dayjs(twitterData?.lastTweet?.time).format('YYYY-MM-DD')})
								</p>
							) : null}
						</div>

						{articles && articles.length > 0 && (
							<div className="bg-(--cards-bg) rounded-md p-3 flex flex-col gap-4">
								<div className="flex items-center justify-between">
									<h3 className="font-semibold text-lg">Latest from DL News</h3>

									<a href="https://www.dlnews.com">
										<DLNewsLogo width={102} height={22} />
									</a>
								</div>

								{articles.map((article, idx) => (
									<NewsCard key={`news_card_${idx}`} {...article} color={backgroundColor} />
								))}
							</div>
						)}
						{devMetrics && (
							<div className="bg-(--cards-bg) rounded-md p-3 flex flex-col gap-4">
								<span className="flex items-center gap-2">
									<h3 className="font-semibold text-lg">Development Activity</h3>{' '}
									<p>(updated at {dayjs(devMetrics.last_report_generated_time).format('DD/MM/YY')})</p>
								</span>
								<p className="flex items-center gap-2">
									Weekly commits: {devMetrics?.report?.weekly_contributers.slice(-1)[0]?.cc}
									<br />
									Monthly commits: {devMetrics?.report?.monthly_contributers.slice(-1)[0]?.cc}
									<br />
									Weekly developers: {devMetrics?.report?.weekly_contributers.slice(-1)[0]?.v}
									<br />
									Monthly developers: {devMetrics?.report?.monthly_contributers.slice(-1)[0]?.v}
								</p>
								<p className="flex items-center gap-2">
									<span>Last commit:</span> {dayjs(devMetrics.last_commit_update_time).fromNow()} (
									{dayjs(devMetrics.last_commit_update_time).format('YYYY-MM-DD')})
								</p>
							</div>
						)}
						{(address || protocolData.gecko_id || explorers) && (
							<div className="bg-(--cards-bg) rounded-md p-3 flex flex-col gap-4">
								<h3 className="font-semibold text-lg">Token Information</h3>

								{address && (
									<p className="flex items-center gap-2">
										<span>Address</span>
										<span>:</span>
										<span>{address.split(':').pop().slice(0, 8) + '...' + address.split(':').pop().slice(36, 42)}</span>
										<CopyHelper toCopy={address.split(':').pop()} disabled={!address} />
									</p>
								)}

								<div className="flex items-center gap-4 flex-wrap">
									{protocolData.gecko_id && (
										<a
											href={`https://www.coingecko.com/en/coins/${protocolData.gecko_id}`}
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
											target="_blank"
											rel="noopener noreferrer"
										>
											<span>View on CoinGecko</span> <Icon name="arrow-up-right" height={12} width={12} />
										</a>
									)}

									{explorers &&
										explorers.map(({ blockExplorerLink, blockExplorerName }) => (
											<a
												href={blockExplorerLink}
												key={blockExplorerName}
												className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
												target="_blank"
												rel="noopener noreferrer"
											>
												<span>View on {blockExplorerName}</span> <Icon name="arrow-up-right" height={12} width={12} />
											</a>
										))}
								</div>
							</div>
						)}

						{(methodology ||
							helperTexts?.fees ||
							helperTexts?.revenue ||
							(helperTexts?.users && users?.activeUsers) ||
							Object.values(methodologyUrls ?? {}).filter((x) => !!x).length > 0) && (
							<div className="bg-(--cards-bg) rounded-md p-3 flex flex-col gap-4">
								<h3 className="font-semibold text-lg">Methodology</h3>
								{methodology && (
									<p>
										{isCEX ? 'Total Assets' : 'TVL'}: {methodology}
									</p>
								)}
								{helperTexts?.fees && <p>Fees: {helperTexts.fees}</p>}
								{helperTexts?.revenue && <p>Revenue: {helperTexts.revenue}</p>}
								{helperTexts?.users && users?.activeUsers ? <p>Addresses: {helperTexts.users}</p> : null}

								<div className="flex items-center gap-4 flex-wrap">
									{methodologyUrls?.tvl && !methodologyUrls.tvl.endsWith('dummy.js') && (
										<a
											href={methodologyUrls.tvl}
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
											target="_blank"
											rel="noopener noreferrer"
										>
											<span>{isCEX ? 'Wallet Addresses' : 'TVL'}</span>
											<Icon name="arrow-up-right" height={12} width={12} />
										</a>
									)}

									{methodologyUrls?.fees && (
										<a
											href={methodologyUrls.fees}
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
											target="_blank"
											rel="noopener noreferrer"
										>
											<span>Fees and Revenue</span>
											<Icon name="arrow-up-right" height={12} width={12} />
										</a>
									)}

									{methodologyUrls?.dexs && (
										<a
											href={methodologyUrls.dexs}
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
											target="_blank"
											rel="noopener noreferrer"
										>
											<span>DEX Volume</span>
											<Icon name="arrow-up-right" height={12} width={12} />
										</a>
									)}

									{methodologyUrls?.dexAggregators && (
										<a
											href={methodologyUrls.dexAggregators}
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
											target="_blank"
											rel="noopener noreferrer"
										>
											<span>DEX Aggregator Volume</span>
											<Icon name="arrow-up-right" height={12} width={12} />
										</a>
									)}

									{methodologyUrls?.perps && (
										<a
											href={methodologyUrls.perps}
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
											target="_blank"
											rel="noopener noreferrer"
										>
											<span>Perp Volume</span>
											<Icon name="arrow-up-right" height={12} width={12} />
										</a>
									)}

									{methodologyUrls?.options && (
										<a
											href={methodologyUrls.options}
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
											target="_blank"
											rel="noopener noreferrer"
										>
											<span>Options Volume</span>
											<Icon name="arrow-up-right" height={12} width={12} />
										</a>
									)}

									{methodologyUrls?.bridgeAggregators && (
										<a
											href={methodologyUrls.bridgeAggregators}
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
											target="_blank"
											rel="noopener noreferrer"
										>
											<span>Bridge Aggregator Volume</span>
											<Icon name="arrow-up-right" height={12} width={12} />
										</a>
									)}

									{methodologyUrls?.treasury && (
										<a
											href={methodologyUrls.treasury}
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
											target="_blank"
											rel="noopener noreferrer"
										>
											<span>Treasury</span>
											<Icon name="arrow-up-right" height={12} width={12} />
										</a>
									)}

									{methodologyUrls?.stablecoins
										? methodologyUrls.stablecoins.split(',').map((stablecoin) => (
												<a
													href={stablecoin.split('$')[1]}
													key={`code-${stablecoin}`}
													className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
													target="_blank"
													rel="noopener noreferrer"
												>
													<span>{stablecoin.split('$')[0]}</span>
													<Icon name="arrow-up-right" height={12} width={12} />
												</a>
										  ))
										: null}
								</div>
							</div>
						)}

						{hacksData && hacksData.length > 0 ? (
							<div className="bg-(--cards-bg) rounded-md p-3 flex flex-col gap-4">
								<h3 className="font-semibold text-lg">Hacks</h3>

								{hacksData.map((hack) => (
									<div key={`hack-${hack.date}-${name}`}>
										<p className="flex items-center gap-2">
											<span>Date</span>
											<span>:</span>
											<span>
												{new Date(hack.date * 1000).toLocaleDateString()} (
												{((Date.now() / 1e3 - hack.date) / (30 * 24 * 3600)).toFixed(0)} months ago)
											</span>
										</p>
										<p className="flex items-center gap-2">
											<span>Amount</span>
											<span>:</span>
											<span>{formattedNum(hack.amount, true)}</span>
										</p>
										<p className="flex items-center gap-2">
											<span>Classification</span>
											<span>:</span>
											<span>{hack.classification}</span>
										</p>
										<p className="flex items-center gap-2">
											<span>Technique</span>
											<span>:</span>
											<span>{hack.technique}</span>
										</p>
										<p className="flex items-center gap-2">
											<span>Chain</span>
											<span>:</span>
											<span>{hack.chain.join(', ')}</span>
										</p>
										<p className="flex items-center gap-2">
											<span>Returned Funds</span>
											<span>:</span>
											<span>{formattedNum(hack.returnedFunds, true)}</span>
										</p>

										<a
											href={hack.source}
											className="flex items-center gap-1 mt-1 max-w-fit"
											target="_blank"
											rel="noopener noreferrer"
											color={backgroundColor}
										>
											<span>Source</span> <Icon name="arrow-up-right" height={12} width={12} />
										</a>
									</div>
								))}
							</div>
						) : null}

						{similarProtocols && similarProtocols.length > 0 ? (
							<div className="bg-(--cards-bg) rounded-md p-3 flex flex-col gap-4">
								<h3 className="font-semibold text-lg">Competitors</h3>

								<div className="flex items-center gap-4 flex-wrap">
									{similarProtocols.map((similarProtocol) => (
										<a
											href={`/protocol/${slug(similarProtocol.name)}`}
											key={'Competitors ' + JSON.stringify(similarProtocol)}
											target="_blank"
											rel="noopener noreferrer"
											className="underline"
										>{`${similarProtocol.name}${
											similarProtocol.tvl ? `(${formatPrice(similarProtocol.tvl)})` : ''
										}`}</a>
									))}
								</div>
							</div>
						) : null}
					</div>
				</div>
			) : null}
			{showCharts && ['tvl', 'assets'].includes(tab) ? (
				<div className="grid grid-cols-2 bg-(--cards-bg) rounded-md pt-2">
					{isLoading ? (
						<p className="flex items-center justify-center text-center h-[400px] col-span-full">Loading...</p>
					) : (
						<>
							{chainsSplit && chainsUnique?.length > 1 && (
								<LazyChart className="relative col-span-full min-h-[400px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<React.Suspense fallback={<></>}>
										<AreaChart
											chartData={chainsSplit}
											title="Chains"
											customLegendName="Chain"
											customLegendOptions={chainsUnique}
											valueSymbol="$"
										/>
									</React.Suspense>
								</LazyChart>
							)}

							{tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 0 && (
								<>
									<LazyChart className="relative col-span-full min-h-[400px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
										<React.Suspense fallback={<></>}>
											<AreaChart
												chartData={tokenBreakdownUSD}
												title="Token Values (USD)"
												customLegendName="Token"
												customLegendOptions={tokensUnique}
												valueSymbol="$"
											/>
										</React.Suspense>
									</LazyChart>
								</>
							)}

							{tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 0 && (
								<>
									{tokenBreakdownPieChart?.length > 0 && (
										<LazyChart className="pt-10 relative col-span-full min-h-[440px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
											<React.Suspense fallback={<></>}>
												<PieChart title="Tokens Breakdown" chartData={tokenBreakdownPieChart} />
											</React.Suspense>
										</LazyChart>
									)}
								</>
							)}

							{tokenBreakdown?.length > 1 && tokensUnique?.length > 0 && (
								<LazyChart className="relative col-span-full min-h-[400px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<React.Suspense fallback={<></>}>
										<AreaChart
											chartData={tokenBreakdown}
											title="Token Balances (Raw Quantities)"
											customLegendName="Token"
											customLegendOptions={tokensUnique}
										/>
									</React.Suspense>
								</LazyChart>
							)}

							{usdInflows?.length > 0 && (
								<LazyChart className="relative col-span-full min-h-[400px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<React.Suspense fallback={<></>}>
										<BarChart chartData={usdInflows} color={backgroundColor} title="USD Inflows" valueSymbol="$" />
									</React.Suspense>
								</LazyChart>
							)}
							{tokenInflows?.length > 0 && tokensUnique?.length > 0 && (
								<LazyChart className="relative col-span-full min-h-[400px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<React.Suspense fallback={<></>}>
										<BarChart
											chartData={tokenInflows}
											title="Token Inflows"
											customLegendName="Token"
											customLegendOptions={tokensUnique}
											hideDefaultLegend={true}
											valueSymbol="$"
										/>
									</React.Suspense>
								</LazyChart>
							)}
						</>
					)}
				</div>
			) : null}
		</ProtocolOverviewLayout>
	)
}

export default ProtocolContainer
