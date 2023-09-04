import * as React from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/future/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { ArrowUpRight, ChevronRight, DownloadCloud } from 'react-feather'
import Layout from '~/layout'
import {
	Button,
	DownloadButton,
	ExtraOption,
	FlexRow,
	LinksWrapper,
	DetailsWrapper,
	Name,
	Section,
	Symbol,
	ChartsWrapper,
	LazyChart,
	ChartsPlaceholder
} from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Checkbox2 } from '~/components'
import Bookmark from '~/components/Bookmark'
import CopyHelper from '~/components/Copy'
import FormattedName from '~/components/FormattedName'
import TokenLogo from '~/components/TokenLogo'
import SEO from '~/components/SEO'
import { ProtocolsChainsSearch } from '~/components/Search'
import AuditInfo from '~/components/AuditInfo'
import ProtocolChart from '~/components/ECharts/ProtocolChart/ProtocolChart'
import QuestionHelper from '~/components/QuestionHelper'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { protocolsAndChainsOptions } from '~/components/Filters/protocols'
import { DEFI_SETTINGS_KEYS, useDefiManager } from '~/contexts/LocalStorage'
import {
	capitalizeFirstLetter,
	formatPercentage,
	formattedNum,
	getBlockExplorer,
	slug,
	standardizeProtocolName,
	tokenIconUrl
} from '~/utils'
import { useFetchProtocol, useFetchProtocolTwitter, useGetTokenPrice } from '~/api/categories/protocols/client'
import type { IFusedProtocolData, IProtocolDevActivity } from '~/api/types'
import boboLogo from '~/assets/boboSmug.png'
import { formatTvlsByChain, buildProtocolAddlChartsData, formatRaisedAmount, formatRaise } from './utils'
import { TreasuryChart } from './Treasury'
import type { IArticle } from '~/api/categories/news'
import { NewsCard } from '~/components/News/Card'
import { UnlocksCharts } from './Emissions'
import { RowBetween } from '~/components/Row'
import { DLNewsLogo } from '~/components/News/Logo'
import Announcement from '~/components/Announcement'
import { useTabState, TabPanel } from 'ariakit'
import { FeesAndRevenueCharts, VolumeCharts } from './Fees'
import { GridContent, TabLayout, TabList, Tab, OtherProtocols, ProtocolLink } from './Common'
import { GovernanceData } from './Governance'
import { BridgeContainerOnClient } from '~/containers/BridgeContainer'
import { ProtocolPools } from './Yields'
import { Flag } from './Flag'
import { StablecoinInfo } from './Stablecoin'
import { AccordionStat } from '~/layout/Stats/Large'
import { ForksData } from './Forks'
import { sluggify } from '~/utils/cache-client'
import dayjs from 'dayjs'

const scams = [
	'Drachma Exchange',
	'StableDoin',
	'CroLend Finance',
	'Agora',
	'MinerSwap',
	'Mosquitos Finance',
	'SatoshiCoreSwap',
	'Swaprum',
	'Cells Finance',
	'SkyDex',
	'Avault'
]

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const Bobo = styled.button`
	position: absolute;
	bottom: -36px;
	left: 0;

	img {
		width: 34px !important;
		height: 34px !important;
	}

	@media screen and (min-width: 80rem) {
		top: 0;
		right: 0;
		bottom: initial;
		left: initial;
		z-index: 1;
	}
`

const ProtocolDetailsWrapper = styled(DetailsWrapper)`
	gap: 0px;

	@media screen and (min-width: 80rem) {
		max-width: 300px;
	}
`

const ProtocolStatsTable = styled.table`
	width: 100%;
	border-collapse: collapse;

	caption,
	thead th {
		font-weight: 400;
		font-size: 0.75rem;
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#cccccc' : '#545757')};
	}

	caption {
		color: ${({ theme }) => theme.text1};
	}

	th {
		font-weight: 400;
		font-size: 1rem;
		text-align: start;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#cccccc' : '#545757')};
		display: flex;
		align-items: center;
		gap: 4px;

		div[data-tooltipanchor='true'] {
			button {
				opacity: 0;
			}

			button:focus-visible {
				opacity: 1;
			}
		}

		div[data-tooltipanchor='true']:focus-visible {
			button {
				opacity: 1;
			}
		}
	}

	th:hover {
		div[data-tooltipanchor='true'] {
			button {
				opacity: 1;
			}
		}
	}

	td:not(.investors) {
		font-weight: 600;
		font-size: 1rem;
		text-align: right;
		font-family: var(--font-jetbrains);
	}

	thead td {
		> * {
			width: min-content;
			background: none;
			margin-left: auto;
			color: ${({ theme }) => theme.text1};
		}
	}

	thead > tr > *,
	caption {
		padding: 0 0 4px;
	}

	tbody > tr > * {
		padding: 4px 0;
	}

	.question-helper {
		padding: 0 16px 4px;
	}
`

const HackDataWrapper = styled.div`
	a {
		margin-top: 6px;
		width: fit-content;
	}
`

interface IProtocolContainerProps {
	articles: IArticle[]
	devMetrics: IProtocolDevActivity
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
	allTimeFees: number | null
	dailyFees: number | null
	dailyRevenue: number | null
	dailyVolume: number | null
	allTimeVolume: number | null
	dailyDerivativesVolume: number | null
	allTimeDerivativesVolume: number | null
	controversialProposals: Array<{ title: string; link?: string }> | null
	governanceApis: Array<string> | null
	expenses: any
	yields: { noOfPoolsTracked: number; averageAPY: number } | null
	helperTexts: {
		fees?: string | null
		revenue?: string | null
		users?: string | null
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
	protocolHasForks?: boolean
	twitterData?: { tweets: Array<{ date: string; id: string; message: string }> }
	hacksData?: {
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
	}
}

function explainAnnualized(text: string | undefined) {
	return `${
		text === undefined ? '' : text + '.\n'
	}This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it`
}

const isLowerCase = (letter: string) => letter === letter.toLowerCase()

function ProtocolContainer({
	articles,
	devMetrics,
	title,
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
	allTimeFees,
	dailyFees,
	dailyRevenue,
	dailyVolume,
	allTimeVolume,
	dailyDerivativesVolume,
	allTimeDerivativesVolume,
	controversialProposals,
	governanceApis,
	expenses,
	yields,
	helperTexts,
	tokenLiquidity,
	tokenCGData,
	nextEventDescription,
	methodologyUrls,
	chartDenominations = [],
	protocolHasForks = false,
	hacksData
}: IProtocolContainerProps) {
	const {
		address = '',
		name,
		symbol,
		url,
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
		metrics,
		isHourlyChart,
		stablecoins
	} = protocolData

	const router = useRouter()

	const { usdInflows: usdInflowsParam, denomination } = router.query

	const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

	const [bobo, setBobo] = React.useState(false)

	const [extraTvlsEnabled, updater] = useDefiManager()

	const { data: twitterData } = useFetchProtocolTwitter(twitter ? twitter : null)

	const weeksFromLastTweet = React.useMemo(() => {
		if (twitterData) {
			const lastTweetDate = twitterData.tweets?.slice(-1)?.[0]?.date
			const weeksFromLastTweet = dayjs().diff(dayjs(lastTweetDate), 'weeks')

			return weeksFromLastTweet
		}
	}, [twitterData])

	const totalVolume = React.useMemo(() => {
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

		return tvl
	}, [extraTvlsEnabled, tvlBreakdowns, historicalChainTvls])

	const {
		tvls: tvlsByChain,
		extraTvls,
		tvlOptions
	} = tvlByChain.reduce(
		(acc, [name, tvl]: [string, number]) => {
			// skip masterchef tvl type
			if (name === 'masterchef' || name === 'offers') return acc

			// check if tvl name is addl tvl type and is toggled
			if (isLowerCase(name[0]) && DEFI_SETTINGS_KEYS.includes(name)) {
				acc.extraTvls.push([name, tvl])
				acc.tvlOptions.push(protocolsAndChainsOptions.find((e) => e.key === name))
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
			tvlOptions: []
		}
	)

	const tvls = Object.entries(tvlsByChain)

	const { data: addlProtocolData, loading } = useFetchProtocol(protocol)

	const { usdInflows, tokenInflows, tokensUnique, tokenBreakdown, tokenBreakdownUSD, tokenBreakdownPieChart } =
		React.useMemo(
			() => buildProtocolAddlChartsData({ protocolData: addlProtocolData, extraTvlsEnabled }),
			[addlProtocolData, extraTvlsEnabled]
		)

	const chainsSplit = React.useMemo(() => {
		return formatTvlsByChain({ historicalChainTvls, extraTvlsEnabled })
	}, [historicalChainTvls, extraTvlsEnabled])

	const chainsUnique = tvls.map((t) => t[0])

	const showCharts =
		loading ||
		(chainsSplit && chainsUnique?.length > 1) ||
		(tokenBreakdown?.length > 1 && tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 1) ||
		tokensUnique?.length > 0 ||
		usdInflows ||
		tokenInflows
			? true
			: false

	const queryParams = router.asPath.split('?')[1] ? `?${router.asPath.split('?')[1]}` : ''

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

	const defaultSelectedId = router.asPath.split('#')?.[1] ?? 'information'

	const tab = useTabState({ defaultSelectedId })

	const { data: chainPrice, loading: fetchingChainPrice } = useGetTokenPrice(chartDenominations?.[1]?.geckoId)

	const formatPrice = (value?: number | string | null): string | number | null => {
		if (Number.isNaN(Number(value))) return null

		if (router.isReady && !fetchingChainPrice && chainPrice?.price && denomination && denomination !== 'USD') {
			return formattedNum(Number(value) / chainPrice.price, false) + ` ${chainPrice.symbol}`
		}

		return formattedNum(value, true)
	}

	return (
		<Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} style={{ gap: '36px' }}>
			<SEO
				cardName={name}
				token={name}
				logo={tokenIconUrl(name)}
				tvl={formattedNum(totalVolume, true)?.toString()}
				isCEX={isCEX}
			/>

			<ProtocolsChainsSearch step={{ category: 'Protocols', name }} options={tvlOptions} />

			{['SyncDEX Finance', 'Avatr', 'SatoshiCoreSwap', 'Locus Finance', 'Opankeswap'].includes(name) && (
				<Announcement warning={true} notCancellable={true}>
					Project has some red flags and multiple users have reported concerns. Be careful.
				</Announcement>
			)}
			{(category === 'Uncollateralized Lending' || category === 'RWA Lending') && (
				<Announcement>
					Borrowed coins are not included into TVL by default, to include them toggle Borrows. For more info on this
					click{' '}
					<a
						href="https://github.com/DefiLlama/DefiLlama-Adapters/discussions/6163"
						target="_blank"
						rel="noreferrer noopener"
					>
						here
					</a>
					.
				</Announcement>
			)}
			{name === 'Multichain' && (
				<Announcement warning={true} notCancellable={true}>
					Please avoid using Multichain. The Multichain team doesn't control the keys and your money will get
					stuck/lost.
				</Announcement>
			)}
			<StatsSection>
				{otherProtocols?.length > 1 && (
					<OtherProtocols>
						{otherProtocols.map((p) => (
							<Link
								href={`/protocol/${standardizeProtocolName(p)}`}
								key={'navigate to ' + `/protocol/${standardizeProtocolName(p)}`}
								passHref
							>
								<ProtocolLink
									active={router.asPath === `/protocol/${standardizeProtocolName(p)}` + queryParams}
									color={backgroundColor}
								>
									{p}
								</ProtocolLink>
							</Link>
						))}
					</OtherProtocols>
				)}

				<ProtocolDetailsWrapper style={{ borderTopLeftRadius: otherProtocols?.length > 1 ? 0 : '12px' }}>
					{scams.includes(name) && <p>There's been multiple hack reports in this protocol</p>}

					<Name>
						<TokenLogo logo={tokenIconUrl(name)} size={24} />
						<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
						<Symbol>{symbol && symbol !== '-' ? `(${symbol})` : ''}</Symbol>

						<Bookmark readableProtocolName={name} />
					</Name>

					<AccordionStat style={{ margin: '24px 0 16px' }}>
						<summary>
							<span data-arrowicon>
								<ChevronRight size={20} />
							</span>

							<span data-summaryheader>
								<span>
									<span>{isCEX ? 'Total Assets' : 'Total Value Locked'}</span>
									<Flag protocol={protocolData.name} dataType={'TVL'} isLending={category === 'Lending'} />
								</span>
								<span>{formatPrice(totalVolume || '0')}</span>
							</span>

							{!isParentProtocol && (
								<Link href={`https://api.llama.fi/dataset/${protocol}.csv`} passHref>
									<DownloadButton
										as="a"
										color={backgroundColor}
										style={{ height: 'fit-content', margin: 'auto 0 0 auto' }}
										target="_blank"
									>
										<DownloadCloud size={14} />
										<span>&nbsp;&nbsp;.csv</span>
									</DownloadButton>
								</Link>
							)}
						</summary>

						<span>
							{tvls.length > 0 && (
								<ProtocolStatsTable>
									<caption>{isCEX ? 'Assets by chain' : 'Chain Breakdown'}</caption>
									<tbody>
										{tvls.map((chainTvl) => (
											<tr key={JSON.stringify(chainTvl)}>
												<th>{capitalizeFirstLetter(chainTvl[0])}</th>
												<td>{formatPrice((chainTvl[1] || 0) as number)}</td>
											</tr>
										))}
									</tbody>
								</ProtocolStatsTable>
							)}

							{extraTvls.length > 0 && (
								<ProtocolStatsTable>
									<thead>
										<tr>
											<th>Include in TVL (optional)</th>
											<td className="question-helper">
												<QuestionHelper text='People define TVL differently. Instead of being opinionated, we give you the option to choose what you would include in a "real" TVL calculation' />
											</td>
										</tr>
									</thead>
									<tbody>
										{extraTvls.map(([option, value]) => (
											<tr key={option}>
												<th>
													<ExtraOption>
														<Checkbox2
															type="checkbox"
															value={option}
															checked={extraTvlsEnabled[option]}
															onChange={updater(option)}
														/>
														<span style={{ opacity: extraTvlsEnabled[option] ? 1 : 0.7 }}>
															{capitalizeFirstLetter(option)}
														</span>
													</ExtraOption>
												</th>
												<td>{formatPrice(value)}</td>
											</tr>
										))}
									</tbody>
								</ProtocolStatsTable>
							)}
						</span>
					</AccordionStat>

					<StatsTable2>
						<tbody>
							{tokenCGData?.marketCap?.current ? (
								<>
									<tr>
										<th>
											<span>Market Cap</span>
											<Flag protocol={protocolData.name} dataType={'Market Cap'} />
										</th>
										<td>{formatPrice(tokenCGData.marketCap.current)}</td>
									</tr>

									{nextEventDescription ? (
										<tr style={{ position: 'relative', top: '-6px' }}>
											<td
												style={{
													opacity: '0.6',
													fontFamily: 'var(--inter)',
													fontWeight: 400,
													fontSize: '0.875rem',
													padding: '0px',
													textAlign: 'right'
												}}
												colSpan={2}
											>
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
									rowHeader={`${symbol || 'Token'} Price`}
									rowValue={formatPrice(tokenCGData.price.current)}
									helperText={null}
									subRows={
										<>
											{tokenCGData.price.ath ? (
												<tr>
													<th data-subvalue>{`All Time High (${new Date(
														tokenCGData.price.athDate
													).toLocaleDateString()})`}</th>
													<td data-subvalue>{formatPrice(tokenCGData.price.ath)}</td>
												</tr>
											) : null}

											{tokenCGData.price.atl ? (
												<tr>
													<th data-subvalue>{`All Time Low (${new Date(
														tokenCGData.price.atlDate
													).toLocaleDateString()})`}</th>
													<td data-subvalue>{formatPrice(tokenCGData.price.atl)}</td>
												</tr>
											) : null}
										</>
									}
								/>
							) : null}

							{tokenCGData?.fdv?.current ? (
								<tr>
									<th>
										<span>Fully Diluted Valuation</span>
										<Flag protocol={protocolData.name} dataType={'FDV'} />
									</th>
									<td>{formatPrice(tokenCGData.fdv.current)}</td>
								</tr>
							) : null}

							{tokenCGData?.volume24h?.total ? (
								<RowWithSubRows
									protocolName={protocolData.name}
									rowHeader={`24h ${symbol || 'Token'} Volume`}
									dataType={'Token Volume'}
									rowValue={formatPrice(tokenCGData.volume24h.total)}
									helperText={null}
									subRows={
										<>
											{tokenCGData?.volume24h?.cex ? (
												<tr>
													<th data-subvalue>CEX Volume</th>
													<td data-subvalue>{formatPrice(tokenCGData.volume24h.cex)}</td>
												</tr>
											) : null}
											{tokenCGData?.volume24h?.dex ? (
												<>
													<tr>
														<th data-subvalue>DEX Volume</th>
														<td data-subvalue>{formatPrice(tokenCGData.volume24h.dex)}</td>
													</tr>
													<tr style={{ position: 'relative', top: '-6px' }}>
														<td
															style={{
																opacity: '0.6',
																fontFamily: 'var(--inter)',
																fontWeight: 400,
																fontSize: '0.875rem',
																padding: '0px'
															}}
															colSpan={2}
														>{`(${formatPercentage(
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
									<tr>
										<th>
											<span>Staked</span>
											<Flag protocol={protocolData.name} dataType={'Staked'} />
										</th>
										<td>{formatPrice(stakedAmount)}</td>
									</tr>

									{tokenCGData.marketCap.current ? (
										<tr style={{ position: 'relative', top: '-6px' }}>
											<td
												style={{
													opacity: '0.6',
													fontFamily: 'var(--inter)',
													fontWeight: 400,
													fontSize: '0.875rem',
													padding: '0px'
												}}
												colSpan={2}
											>
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
														<th data-subvalue>{c[0].split('-')[0]}</th>
														<td data-subvalue>{formatPrice(c[1])}</td>
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
									rowHeader={`${symbol || 'Token'} Liquidity`}
									rowValue={formatPrice(tokenLiquidity.reduce((acc, curr) => (acc += curr[2]), 0))}
									helperText={null}
									subRows={
										<>
											{tokenLiquidity.map((item) => (
												<tr key={'token-liq' + item[0] + item[1] + item[2]}>
													<th data-subvalue>{`${item[0]} (${item[1]})`}</th>
													<td data-subvalue>{formatPrice(item[2])}</td>
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
									rowHeader="Volume 24h"
									rowValue={formatPrice(dailyVolume)}
									helperText={null}
									subRows={
										<>
											{allTimeVolume ? (
												<tr>
													<th data-subvalue>{`Cumulative Volume`}</th>
													<td data-subvalue>{formatPrice(allTimeVolume)}</td>
												</tr>
											) : null}
										</>
									}
								/>
							) : dailyVolume ? (
								<tr>
									<th>
										<span>Volume 24h</span>
										<Flag protocol={protocolData.name} dataType={'Volume'} />
									</th>
									<td>{formatPrice(dailyVolume)}</td>
								</tr>
							) : null}

							{dailyDerivativesVolume && allTimeDerivativesVolume ? (
								<RowWithSubRows
									protocolName={protocolData.name}
									dataType="Derivatives Volume"
									rowHeader="Derivatives Volume 24h"
									rowValue={formatPrice(dailyDerivativesVolume)}
									helperText={null}
									subRows={
										<>
											{allTimeDerivativesVolume ? (
												<tr>
													<th data-subvalue>{`Cumulative Volume`}</th>
													<td data-subvalue>{formatPrice(allTimeDerivativesVolume)}</td>
												</tr>
											) : null}
										</>
									}
								/>
							) : dailyDerivativesVolume ? (
								<tr>
									<th>
										<span>Derivatives Volume 24h</span>
										<Flag protocol={protocolData.name} dataType={'Derivatives Volume'} />
									</th>
									<td>{formatPrice(dailyDerivativesVolume)}</td>
								</tr>
							) : null}

							{fees30d ? (
								<RowWithSubRows
									protocolName={protocolData.name}
									dataType="Fees"
									rowHeader="Fees (annualized)"
									rowValue={formatPrice(fees30d * 12.2)}
									helperText={explainAnnualized(helperTexts.fees)}
									subRows={
										<>
											<tr>
												<th data-subvalue>{`Fees 30d`}</th>
												<td data-subvalue>{formatPrice(fees30d)}</td>
											</tr>

											{dailyFees ? (
												<tr>
													<th data-subvalue>{`Fees 24h`}</th>
													<td data-subvalue>{formatPrice(dailyFees)}</td>
												</tr>
											) : null}

											{allTimeFees ? (
												<tr>
													<th data-subvalue>{`Cumulative Fees`}</th>
													<td data-subvalue>{formatPrice(allTimeFees)}</td>
												</tr>
											) : null}
										</>
									}
								/>
							) : null}

							{revenue30d ? (
								<RowWithSubRows
									protocolName={protocolData.name}
									dataType="Revenue"
									rowHeader="Revenue (annualized)"
									rowValue={formatPrice(revenue30d * 12.2)}
									helperText={explainAnnualized(helperTexts.revenue)}
									subRows={
										<>
											<tr>
												<th data-subvalue>{`Revenue 30d`}</th>
												<td data-subvalue>{formatPrice(revenue30d)}</td>
											</tr>

											{dailyRevenue ? (
												<tr>
													<th data-subvalue>{`Revenue 24h`}</th>
													<td data-subvalue>{formatPrice(dailyRevenue)}</td>
												</tr>
											) : null}
										</>
									}
								/>
							) : null}

							{users?.activeUsers ? (
								<RowWithSubRows
									helperText={helperTexts.users}
									protocolName={protocolData.name}
									dataType="Users"
									rowHeader={'Active Addresses 24h'}
									rowValue={formattedNum(users.activeUsers, false)}
									subRows={
										<>
											{users.newUsers ? (
												<tr>
													<th data-subvalue>New Addresses 24h</th>
													<td data-subvalue>{formattedNum(users.newUsers, false)}</td>
												</tr>
											) : null}
											{users.transactions ? (
												<tr>
													<th data-subvalue>Transactions 24h</th>
													<td data-subvalue>{formattedNum(users.transactions, false)}</td>
												</tr>
											) : null}
											{users.gasUsd ? (
												<tr>
													<th data-subvalue>Gas Used 24h</th>
													<td data-subvalue>{formatPrice(users.gasUsd)}</td>
												</tr>
											) : null}
										</>
									}
								/>
							) : null}

							{treasury && (
								<RowWithSubRows
									protocolName={protocolData.name}
									helperText={null}
									rowHeader={'Treasury'}
									rowValue={formatPrice(
										Object.entries(treasury).reduce((acc, curr) => (acc += curr[0] === 'ownTokens' ? 0 : curr[1]), 0)
									)}
									dataType={'Treasury'}
									subRows={
										<>
											{Object.entries(treasury).map(([cat, tre]) => {
												return (
													<tr key={'treasury' + cat + tre}>
														<th data-subvalue>{capitalizeFirstLetter(cat)}</th>
														<td data-subvalue>{formatPrice(tre)}</td>
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
														<>
															<tr key={raise.date + raise.amount}>
																<th data-subvalue>{new Date(raise.date * 1000).toISOString().split('T')[0]}</th>
																<td data-subvalue>
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
																<td colSpan={2} className="investors">
																	<b>Investors</b>:{' '}
																	{(raise as any).leadInvestors
																		.concat((raise as any).otherInvestors)
																		.map((i, index, arr) => (
																			<>
																				<a href={`/raises/${sluggify(i)}`}>{i}</a>
																				{index < arr.length - 1 ? ', ' : ''}
																			</>
																		))}
																</td>
															</tr>
														</>
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
													<td data-subvalue style={{ textAlign: 'left' }}>
														{proposal.link ? (
															<a href={proposal.link} target="_blank" rel="noreferrer noopener">
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
												<th data-subvalue>Headcount</th>
												<td data-subvalue>{expenses.headcount}</td>
											</tr>

											{Object.entries(expenses.annualUsdCost || {}).map(([cat, exp]: [string, number]) => {
												return (
													<tr key={'expenses' + cat + exp}>
														<th data-subvalue>{capitalizeFirstLetter(cat)}</th>
														<td data-subvalue>{formatPrice(exp)}</td>
													</tr>
												)
											})}

											<tr>
												<th data-subvalue>
													<a href={expenses.sources[0]}>
														Source <ArrowUpRight size={10} style={{ display: 'inline' }} />
													</a>
												</th>
												<td data-subvalue></td>
											</tr>
										</>
									}
								/>
							)}
						</tbody>
					</StatsTable2>

					<Flag protocol={protocolData.name} isLending={category === 'Lending'} />
				</ProtocolDetailsWrapper>

				<ProtocolChart
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
					usdInflowsData={usdInflowsParam === 'true' && !loading && usdInflows?.length > 0 ? usdInflows : null}
					governanceApis={governanceApis}
					isHourlyChart={isHourlyChart}
					isCEX={isCEX}
					tokenSymbol={symbol}
					protocolId={protocolData.id}
					chartDenominations={chartDenominations}
				/>

				<Bobo onClick={() => setBobo(!bobo)}>
					<span className="visually-hidden">Enable Goblin Mode</span>
					<Image src={boboLogo} width="34px" height="34px" alt="bobo cheers" />
				</Bobo>
			</StatsSection>

			<TabLayout>
				<TabList state={tab}>
					<Tab id="information" color={backgroundColor}>
						Information
					</Tab>
					{showCharts && (
						<Tab id="tvl-charts" color={backgroundColor}>
							{isCEX ? 'Assets' : 'TVL'}
						</Tab>
					)}
					{stablecoins && stablecoins.length > 0 && (
						<Tab id="stablecoin-info" color={backgroundColor}>
							Stablecoin Info
						</Tab>
					)}
					{metrics.bridge && (
						<Tab id="bridge" color={backgroundColor}>
							Bridge Info
						</Tab>
					)}
					{treasury && (
						<Tab id="treasury" color={backgroundColor}>
							Treasury
						</Tab>
					)}
					{metrics.unlocks && (
						<Tab id="unlocks" color={backgroundColor}>
							Unlocks
						</Tab>
					)}
					{yields && (
						<Tab id="yields" color={backgroundColor}>
							Yields
						</Tab>
					)}
					{metrics.fees && (
						<Tab id="fees-revenue" color={backgroundColor}>
							Fees and Revenue
						</Tab>
					)}
					{metrics.dexs && (
						<Tab id="volume" color={backgroundColor}>
							Volume
						</Tab>
					)}
					{metrics.derivatives && (
						<Tab id="derivatives-volume" color={backgroundColor}>
							Derivatives Volume
						</Tab>
					)}
					{governanceApis?.length > 0 && (
						<Tab id="governance" color={backgroundColor}>
							Governance
						</Tab>
					)}
					{protocolHasForks && (
						<Tab id="forks" color={backgroundColor}>
							Forks
						</Tab>
					)}
				</TabList>

				<TabPanel state={tab} tabId="information">
					<GridContent>
						<Section>
							<h3>{isCEX ? 'Exchange Information' : 'Protocol Information'}</h3>
							{description && <p>{description}</p>}

							{category && (
								<FlexRow>
									<span>Category</span>
									<span>:</span>

									<Link
										href={category.toLowerCase() === 'cex' ? '/cexs' : `/protocols/${category.toLowerCase()}`}
										passHref
									>
										<Button
											as="a"
											target="_blank"
											rel="noopener noreferrer"
											useTextColor={true}
											color={backgroundColor}
											style={{ height: '33.5px' }}
										>
											<span>{category}</span> <ArrowUpRight size={14} />
										</Button>
									</Link>
								</FlexRow>
							)}

							{forkedFrom && forkedFrom.length > 0 && (
								<FlexRow>
									<span>Forked from:</span>
									<>
										{forkedFrom.map((p, index) => (
											<React.Fragment key={'forked from' + p}>
												<Link href={`/protocol/${slug(p)}`}>{forkedFrom[index + 1] ? p + ', ' : p}</Link>
												<ArrowUpRight size={14} />
											</React.Fragment>
										))}
									</>
								</FlexRow>
							)}

							{audits && audit_links && <AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} />}

							<LinksWrapper>
								{url && (
									<Link href={url} passHref>
										<Button
											as="a"
											target="_blank"
											rel="noopener noreferrer"
											useTextColor={true}
											color={backgroundColor}
										>
											<span>Website</span> <ArrowUpRight size={14} />
										</Button>
									</Link>
								)}

								{twitter && (
									<Link href={`https://twitter.com/${twitter}`} passHref>
										<Button
											as="a"
											target="_blank"
											rel="noopener noreferrer"
											useTextColor={true}
											color={backgroundColor}
										>
											<span>Twitter</span> <ArrowUpRight size={14} />
										</Button>
									</Link>
								)}
							</LinksWrapper>
						</Section>

						{articles.length > 0 && (
							<Section>
								<RowBetween>
									<h3>Latest from DL News</h3>
									<Link href="https://www.dlnews.com" passHref>
										<a>
											<DLNewsLogo width={102} height={22} />
										</a>
									</Link>
								</RowBetween>

								{articles.map((article, idx) => (
									<NewsCard key={`news_card_${idx}`} {...article} color={backgroundColor} />
								))}
							</Section>
						)}
						{devMetrics && (
							<Section>
								<FlexRow>
									<h3>Development Activity</h3> (updated at{' '}
									{dayjs(devMetrics.last_report_generated_time).format('DD/MM/YY')})
								</FlexRow>
								<FlexRow>
									<span>Weekly commits:</span> {devMetrics?.report.weekly_contributers.slice(-1)[0]?.cc}
								</FlexRow>
								<FlexRow>
									<span>Monthly commits:</span> {devMetrics?.report.monthly_contributers.slice(-1)[0]?.cc}
								</FlexRow>
								<FlexRow>
									<span>Weekly developers:</span> {devMetrics?.report.weekly_contributers.slice(-1)[0]?.v}
								</FlexRow>
								<FlexRow>
									<span>Monthly developers:</span> {devMetrics?.report.monthly_contributers.slice(-1)[0]?.v}
								</FlexRow>
								<FlexRow>
									<span>Last commit date:</span> {dayjs(devMetrics.last_commit_update_time).format('DD/MM/YY')}
								</FlexRow>
							</Section>
						)}

						{(address || protocolData.gecko_id || blockExplorerLink) && (
							<Section>
								<h3>Token Information</h3>

								{address && (
									<FlexRow>
										<span>Address</span>
										<span>:</span>
										<span>{address.split(':').pop().slice(0, 8) + '...' + address.split(':').pop().slice(36, 42)}</span>
										<CopyHelper toCopy={address.split(':').pop()} disabled={!address} />
									</FlexRow>
								)}

								<LinksWrapper>
									{protocolData.gecko_id && (
										<Link href={`https://www.coingecko.com/en/coins/${protocolData.gecko_id}`} passHref>
											<Button
												as="a"
												target="_blank"
												rel="noopener noreferrer"
												useTextColor={true}
												color={backgroundColor}
											>
												<span>View on CoinGecko</span> <ArrowUpRight size={14} />
											</Button>
										</Link>
									)}

									{blockExplorerLink && (
										<Link href={blockExplorerLink} passHref>
											<Button
												as="a"
												target="_blank"
												rel="noopener noreferrer"
												useTextColor={true}
												color={backgroundColor}
											>
												<span>View on {blockExplorerName}</span> <ArrowUpRight size={14} />
											</Button>
										</Link>
									)}
								</LinksWrapper>
							</Section>
						)}

						{(methodology ||
							helperTexts?.fees ||
							helperTexts?.revenue ||
							(helperTexts?.users && users?.activeUsers) ||
							Object.values(methodologyUrls ?? {}).filter((x) => !!x).length > 0) && (
							<Section>
								<h3>Methodology</h3>
								{methodology && (
									<p>
										{isCEX ? 'Total Assets' : 'TVL'}: {methodology}
									</p>
								)}
								{helperTexts?.fees && <p>Fees: {helperTexts.fees}</p>}
								{helperTexts?.revenue && <p>Revenue: {helperTexts.revenue}</p>}
								{helperTexts?.users && users?.activeUsers ? <p>Users: {helperTexts.users}</p> : null}

								<LinksWrapper>
									{methodologyUrls?.tvl && (
										<Link href={methodologyUrls.tvl} passHref>
											<Button
												as="a"
												target="_blank"
												rel="noopener noreferrer"
												useTextColor={true}
												color={backgroundColor}
											>
												<span>TVL code</span>
												<ArrowUpRight size={14} />
											</Button>
										</Link>
									)}

									{methodologyUrls?.fees && (
										<Link href={methodologyUrls.fees} passHref>
											<Button
												as="a"
												target="_blank"
												rel="noopener noreferrer"
												useTextColor={true}
												color={backgroundColor}
											>
												<span>Fees and Revenue code</span>
												<ArrowUpRight size={14} />
											</Button>
										</Link>
									)}

									{methodologyUrls?.dexs && (
										<Link href={methodologyUrls.dexs} passHref>
											<Button
												as="a"
												target="_blank"
												rel="noopener noreferrer"
												useTextColor={true}
												color={backgroundColor}
											>
												<span>Volume code</span>
												<ArrowUpRight size={14} />
											</Button>
										</Link>
									)}

									{methodologyUrls?.derivatives && (
										<Link href={methodologyUrls.derivatives} passHref>
											<Button
												as="a"
												target="_blank"
												rel="noopener noreferrer"
												useTextColor={true}
												color={backgroundColor}
											>
												<span>Derivatives Volume code</span>
												<ArrowUpRight size={14} />
											</Button>
										</Link>
									)}
								</LinksWrapper>
							</Section>
						)}

						{hacksData ? (
							<Section>
								<h3>Hacks</h3>

								<HackDataWrapper>
									<FlexRow>
										<span>Date</span>
										<span>:</span>
										<span>{new Date(hacksData.date * 1000).toLocaleDateString()}</span>
									</FlexRow>
									<FlexRow>
										<span>Amount</span>
										<span>:</span>
										<span>{formattedNum(hacksData.amount, true)}</span>
									</FlexRow>
									<FlexRow>
										<span>Classification</span>
										<span>:</span>
										<span>{hacksData.classification}</span>
									</FlexRow>
									<FlexRow>
										<span>Technique</span>
										<span>:</span>
										<span>{hacksData.technique}</span>
									</FlexRow>
									<FlexRow>
										<span>Chain</span>
										<span>:</span>
										<span>{hacksData.chain.join(', ')}</span>
									</FlexRow>
									<FlexRow>
										<span>Returned Funds</span>
										<span>:</span>
										<span>{formattedNum(hacksData.returnedFunds, true)}</span>
									</FlexRow>

									{blockExplorerLink && (
										<Link href={hacksData.source} passHref>
											<Button
												as="a"
												target="_blank"
												rel="noopener noreferrer"
												useTextColor={true}
												color={backgroundColor}
											>
												<span>Source</span> <ArrowUpRight size={14} />
											</Button>
										</Link>
									)}
								</HackDataWrapper>
							</Section>
						) : null}

						{similarProtocols && similarProtocols.length > 0 ? (
							<Section>
								<h3>Competitors</h3>

								<LinksWrapper>
									{similarProtocols.map((similarProtocol) => (
										<Link
											href={`/protocol/${slug(similarProtocol.name)}`}
											passHref
											key={'Competitors ' + JSON.stringify(similarProtocol)}
										>
											<a target="_blank" style={{ textDecoration: 'underline' }}>{`${
												similarProtocol.name
											} (${formatPrice(similarProtocol.tvl)})`}</a>
										</Link>
									))}
								</LinksWrapper>
							</Section>
						) : null}
					</GridContent>
				</TabPanel>

				{showCharts && (
					<TabPanel state={tab} tabId="tvl-charts">
						<ChartsWrapper style={{ background: 'none', border: 'none' }}>
							{loading ? (
								<ChartsPlaceholder>Loading...</ChartsPlaceholder>
							) : (
								<>
									{chainsSplit && chainsUnique?.length > 1 && (
										<LazyChart>
											<AreaChart
												chartData={chainsSplit}
												title="Chains"
												customLegendName="Chain"
												customLegendOptions={chainsUnique}
												valueSymbol="$"
											/>
										</LazyChart>
									)}
									{tokenBreakdown?.length > 1 && tokensUnique?.length > 1 && (
										<LazyChart>
											<AreaChart
												chartData={tokenBreakdown}
												title="Tokens"
												customLegendName="Token"
												customLegendOptions={tokensUnique}
											/>
										</LazyChart>
									)}
									{tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 1 && (
										<>
											{tokenBreakdownPieChart?.length > 0 && (
												<LazyChart>
													<PieChart title="Tokens Breakdown" chartData={tokenBreakdownPieChart} />
												</LazyChart>
											)}

											<LazyChart>
												<AreaChart
													chartData={tokenBreakdownUSD}
													title="Tokens (USD)"
													customLegendName="Token"
													customLegendOptions={tokensUnique}
													valueSymbol="$"
												/>
											</LazyChart>
										</>
									)}
									{usdInflows?.length > 0 && (
										<LazyChart>
											<BarChart chartData={usdInflows} color={backgroundColor} title="USD Inflows" valueSymbol="$" />
										</LazyChart>
									)}
									{tokenInflows?.length > 0 && (
										<LazyChart>
											<BarChart
												chartData={tokenInflows}
												title="Token Inflows"
												customLegendName="Token"
												customLegendOptions={tokensUnique}
												hideDefaultLegend={true}
												valueSymbol="$"
											/>
										</LazyChart>
									)}
								</>
							)}
						</ChartsWrapper>
					</TabPanel>
				)}

				{stablecoins && stablecoins.length > 0 && (
					<TabPanel state={tab} tabId="stablecoin-info">
						<StablecoinInfo assetName={stablecoins[0]} />
					</TabPanel>
				)}

				{metrics.bridge && (
					<TabPanel state={tab} tabId="bridge">
						<BridgeContainerOnClient protocol={protocol} />
					</TabPanel>
				)}

				{treasury && (
					<TabPanel state={tab} tabId="treasury">
						<TreasuryChart protocolName={protocol} />
					</TabPanel>
				)}

				{metrics.unlocks && (
					<TabPanel state={tab} tabId="unlocks">
						<UnlocksCharts protocolName={protocol} />
					</TabPanel>
				)}

				{yields && (
					<TabPanel state={tab} tabId="yields">
						<ProtocolPools data={yields} protocol={protocol} />
					</TabPanel>
				)}

				{metrics.fees && (
					<TabPanel state={tab} tabId="fees-revenue">
						<FeesAndRevenueCharts data={protocolData} />
					</TabPanel>
				)}

				{metrics.dexs && (
					<TabPanel state={tab} tabId="volume">
						<VolumeCharts data={protocolData} />
					</TabPanel>
				)}

				{metrics.derivatives && (
					<TabPanel state={tab} tabId="derivatives-volume">
						<VolumeCharts data={protocolData} type="derivatives" />
					</TabPanel>
				)}

				{governanceApis?.length > 0 && (
					<TabPanel state={tab} tabId="governance">
						<GovernanceData apis={governanceApis} color={backgroundColor} />
					</TabPanel>
				)}

				{protocolHasForks && (
					<TabPanel state={tab} tabId="forks">
						<ForksData protocolName={name} />
					</TabPanel>
				)}
			</TabLayout>
		</Layout>
	)
}

const Toggle = styled.button`
	margin-left: -22px;
	display: flex;
	align-items: center;
	gap: 2px;
	white-space: nowrap;

	& > *[data-arrow] {
		flex-shrink: 0;
	}

	&[data-open='true'] {
		& > *[data-arrow] {
			transform: rotate(90deg);
			transition: 0.1s ease;
		}
	}
`

export const StatsTable2 = styled(ProtocolStatsTable)`
	th[data-subvalue],
	td[data-subvalue] {
		font-weight: 400;
		font-family: var(--inter);
		font-size: 0.875rem;
	}

	td {
		color: ${({ theme }) => theme.text1};
	}

	td[data-parentvalue] {
		white-space: nowrap;
	}

	a {
		text-decoration: underline;
		text-decoration-color: ${({ theme }) => (theme.mode === 'dark' ? '#cccccc' : '#545757')};
	}

	tr[data-parentrow] {
		div[data-tooltipanchor='true'] {
			button {
				position: relative;
				top: 2px;
			}
		}
	}

	tr[data-parentrow]:hover {
		div[data-tooltipanchor='true'] {
			button {
				opacity: 1;
			}
		}
	}
`

export const RowWithSubRows = ({ subRows, protocolName, dataType, rowHeader, rowValue, helperText }) => {
	const [open, setOpen] = React.useState(false)
	return (
		<>
			<tr data-parentrow>
				<th>
					<Toggle onClick={() => setOpen(!open)} data-open={open}>
						<ChevronRight size={16} data-arrow />
						<span>{rowHeader}</span>
						{helperText && <QuestionHelper text={helperText} />}
					</Toggle>
					{protocolName && dataType ? <Flag protocol={protocolName} dataType={dataType} /> : null}
				</th>
				<td data-parentvalue>{rowValue}</td>
			</tr>

			{open && <>{subRows}</>}
		</>
	)
}

export default ProtocolContainer
