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
	formattedNum,
	getBlockExplorer,
	slug,
	standardizeProtocolName,
	toK,
	tokenIconUrl
} from '~/utils'
import { useFetchProtocol } from '~/api/categories/protocols/client'
import type { IFusedProtocolData, IRaise } from '~/api/types'
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

const scams = ['Drachma Exchange', 'StableDoin', 'CroLend Finance', 'Agora', 'MinerSwap', 'Mosquitos Finance']

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
	gap: 24px;

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
	}

	td {
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

const Details = styled.details`
	&[open] {
		summary {
			& > *[data-arrowicon] {
				transform: rotate(90deg);
				transition: 0.1s ease;
			}
		}
	}

	margin-bottom: -8px;

	summary {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		align-items: center;
		list-style: none;
		list-style-type: none;
		cursor: pointer;

		& > *[data-arrowicon] {
			margin: auto -16px 8px -20px;
		}

		& > *[data-summaryheader] {
			font-size: 1.5rem;
			font-weight: 600;
			display: flex;
			flex-direction: column;
			gap: 8px;

			& > *:first-child {
				font-weight: 400;
				font-size: 1rem;
				text-align: left;
				color: ${({ theme }) => (theme.mode === 'dark' ? '#cccccc' : '#545757')};
			}

			& > *:nth-child(2) {
				font-family: var(--font-jetbrains);
				min-height: 2rem;
			}
		}
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary + span {
		margin-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
`

interface IProtocolContainerProps {
	articles: IArticle[]
	title: string
	protocol: string
	protocolData: IFusedProtocolData
	backgroundColor: string
	similarProtocols: Array<{ name: string; tvl: number }>
	treasury: { [category: string]: number } | null
	isCEX?: boolean
	chartColors: { [type: string]: string }
	users: { users: number }
	tokenPrice: number | null
	tokenMcap: number | null
	tokenSupply: number | null
	allTimeFees: number | null
	dailyFees: number | null
	dailyRevenue: number | null
	dailyVolume: number | null
	allTimeVolume: number | null
	controversialProposals: Array<{ title: string; link?: string }> | null
	governanceApi: string | null
	expenses: any
	yields: { noOfPoolsTracked: number; averageAPY: number } | null
	helperTexts: {
		fees?: string | null
		revenue?: string | null
		users?: string | null
	}
}

const isLowerCase = (letter: string) => letter === letter.toLowerCase()

function ProtocolContainer({
	articles,
	title,
	protocolData,
	treasury,
	protocol,
	backgroundColor,
	similarProtocols,
	isCEX,
	chartColors,
	users,
	tokenPrice: priceOfToken,
	tokenMcap,
	tokenSupply,
	allTimeFees,
	dailyFees,
	dailyRevenue,
	dailyVolume,
	allTimeVolume,
	controversialProposals,
	governanceApi,
	expenses,
	yields,
	helperTexts
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
		module: codeModule,
		historicalChainTvls,
		chains = [],
		forkedFrom,
		otherProtocols,
		hallmarks,
		gecko_id,
		isParentProtocol,
		raises,
		metrics,
		isHourlyChart
	} = protocolData

	const router = useRouter()

	const { usdInflows: usdInflowsParam } = router.query

	const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

	const [bobo, setBobo] = React.useState(false)

	const [extraTvlsEnabled, updater] = useDefiManager()

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

	return (
		<Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} style={{ gap: '36px' }}>
			<SEO cardName={name} token={name} logo={tokenIconUrl(name)} tvl={formattedNum(totalVolume, true)?.toString()} />

			<ProtocolsChainsSearch step={{ category: 'Protocols', name }} options={tvlOptions} />

			{['SyncDEX Finance', 'Avatr'].includes(name) && (
				<Announcement warning={true} notCancellable={true}>
					Project has some red flags and multiple users have reported concerns. Be careful.
				</Announcement>
			)}
			{category === 'Uncollateralized Lending' && (
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

			<StatsSection>
				{otherProtocols?.length > 1 && (
					<OtherProtocols>
						{otherProtocols.map((p) => (
							<Link href={`/protocol/${standardizeProtocolName(p)}`} key={p} passHref>
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

						{!isParentProtocol && <Bookmark readableProtocolName={name} />}
					</Name>

					<Details>
						<summary>
							<span data-arrowicon>
								<ChevronRight size={20} />
							</span>

							<span data-summaryheader>
								<span>{isCEX ? 'Total Assets' : 'Total Value Locked'}</span>
								<span>{formattedNum(totalVolume || '0', true)}</span>
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
											<tr key={chainTvl[0]}>
												<th>{capitalizeFirstLetter(chainTvl[0])}</th>
												<td>{formattedNum(chainTvl[1] || 0, true)}</td>
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
												<td>{formattedNum(value, true)}</td>
											</tr>
										))}
									</tbody>
								</ProtocolStatsTable>
							)}
						</span>
					</Details>

					<div style={{ width: '100%', overflowX: 'auto' }}>
						<ProtocolStatsTable>
							<tbody>
								{tokenMcap ? (
									<tr>
										<th>Market Cap</th>
										<td>{formattedNum(tokenMcap, true)}</td>
									</tr>
								) : null}

								{priceOfToken ? (
									<tr>
										<th>Token Price</th>
										<td>${priceOfToken.toLocaleString('en-US', { maximumFractionDigits: 5 })}</td>
									</tr>
								) : null}

								{tokenSupply && priceOfToken ? (
									<tr>
										<th>Fully Diluted Valuation</th>
										<td>{formattedNum(priceOfToken * tokenSupply, true)}</td>
									</tr>
								) : null}

								{dailyVolume ? (
									<tr>
										<th>Volume 24h</th>
										<td>{formattedNum(dailyVolume, true)}</td>
									</tr>
								) : null}

								{dailyFees ? (
									<tr>
										<th>
											<span>Fees 24h</span>
											{helperTexts.fees && <QuestionHelper text={helperTexts.fees} />}
										</th>
										<td>{formattedNum(dailyFees, true)}</td>
									</tr>
								) : null}

								{dailyRevenue ? (
									<tr>
										<th>
											<span>Revenue 24h</span>
											{helperTexts.revenue && <QuestionHelper text={helperTexts.revenue} />}
										</th>
										<td>{formattedNum(dailyRevenue, true)}</td>
									</tr>
								) : null}

								{users?.users ? (
									<tr>
										<th>
											<span>Active Addresses 24h</span>
											{helperTexts.users && <QuestionHelper text={helperTexts.users} />}
										</th>
										<td>{formattedNum(users.users, false)}</td>
									</tr>
								) : null}

								{stakedAmount ? (
									<>
										<tr>
											<th>Staked</th>
											<td>{formattedNum(stakedAmount, true)}</td>
										</tr>

										{tokenMcap ? (
											<tr style={{ position: 'relative', top: '-6px' }}>
												<th style={{ padding: 0 }}></th>
												<td
													style={{
														opacity: '0.6',
														fontFamily: 'var(--inter)',
														fontWeight: 400,
														fontSize: '0.875rem',
														padding: '0px'
													}}
												>
													{`(${((stakedAmount / tokenMcap) * 100).toLocaleString(undefined, {
														maximumFractionDigits: 2
													})}% of mcap)`}
												</td>
											</tr>
										) : null}
									</>
								) : null}

								{borrowedAmount ? (
									<tr>
										<th>Borrowed</th>
										<td>{formattedNum(borrowedAmount, true)}</td>
									</tr>
								) : null}

								{allTimeVolume ? (
									<tr>
										<th>Cumulative Volume</th>
										<td>{formattedNum(allTimeVolume, true)}</td>
									</tr>
								) : null}

								{allTimeFees ? (
									<tr>
										<th>
											<span>Cumulative Fees</span>
											{helperTexts.fees && <QuestionHelper text={helperTexts.fees} />}
										</th>
										<td>{formattedNum(allTimeFees, true)}</td>
									</tr>
								) : null}
							</tbody>
						</ProtocolStatsTable>
					</div>

					<>{treasury && <TreasuryTable data={treasury} />}</>

					<>{raises && raises.length > 0 && <Raised data={raises} />}</>

					{controversialProposals && controversialProposals.length > 0 ? (
						<TopProposals data={controversialProposals} />
					) : null}

					{expenses && <Expenses data={expenses} />}
				</ProtocolDetailsWrapper>

				<ProtocolChart
					protocol={protocol}
					color={backgroundColor}
					historicalChainTvls={historicalChainTvls}
					chains={isCEX ? null : chains}
					hallmarks={hallmarks}
					bobo={bobo}
					geckoId={gecko_id}
					chartColors={chartColors}
					metrics={metrics}
					activeUsersId={users ? protocolData.id : null}
					usdInflowsData={usdInflowsParam === 'true' && !loading && usdInflows?.length > 0 ? usdInflows : null}
					governanceApi={governanceApi}
					isHourlyChart={isHourlyChart}
					protocolHasTreasury={treasury ? true : false}
					isCEX={isCEX}
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
					{(category === 'Bridge' || category === 'Cross Chain') && (
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
					{governanceApi && (
						<Tab id="governance" color={backgroundColor}>
							Governance
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
									<span>: </span>
									<Link href={category.toLowerCase() === 'cex' ? '/cexs' : `/protocols/${category.toLowerCase()}`}>
										{category}
									</Link>
								</FlexRow>
							)}

							{forkedFrom && forkedFrom.length > 0 && (
								<FlexRow>
									<span>Forked from</span>
									<span>:</span>
									<>
										{forkedFrom.map((p, index) => (
											<Link href={`/protocol/${slug(p)}`} key={p}>
												{forkedFrom[index + 1] ? p + ', ' : p}
											</Link>
										))}
									</>
								</FlexRow>
							)}

							{audits && audit_links && <AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} />}

							<LinksWrapper>
								{url && (
									<Link href={url} passHref>
										<Button as="a" target="_blank" rel="noopener" useTextColor={true} color={backgroundColor}>
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

						{(address || protocolData.gecko_id || blockExplorerLink) && (
							<Section>
								<h3>Token Information</h3>

								{address && (
									<FlexRow>
										<span>Address</span>
										<span>:</span>
										<span>{address.split(':').pop().slice(0, 8) + '...' + address?.slice(36, 42)}</span>
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

						{(methodology || codeModule) && (
							<Section>
								<h3>Methodology</h3>
								{methodology && <p>{methodology}</p>}
								<LinksWrapper>
									{codeModule && (
										<Link
											href={`https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${codeModule}`}
											passHref
										>
											<Button
												as="a"
												target="_blank"
												rel="noopener noreferrer"
												useTextColor={true}
												color={backgroundColor}
											>
												<span>Check the code</span>
												<ArrowUpRight size={14} />
											</Button>
										</Link>
									)}
								</LinksWrapper>
							</Section>
						)}

						{similarProtocols && similarProtocols.length > 0 ? (
							<Section>
								<h3>Competitors</h3>

								<LinksWrapper>
									{similarProtocols.map((similarProtocol) => (
										<Link href={`/protocol/${slug(similarProtocol.name)}`} passHref key={similarProtocol.name}>
											<a target="_blank" style={{ textDecoration: 'underline' }}>{`${similarProtocol.name} ($${toK(
												similarProtocol.tvl
											)})`}</a>
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
											{tokenBreakdownPieChart.length > 0 && (
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
									{usdInflows && (
										<LazyChart>
											<BarChart chartData={usdInflows} color={backgroundColor} title="USD Inflows" valueSymbol="$" />
										</LazyChart>
									)}
									{tokenInflows && (
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

				{(category === 'Bridge' || category === 'Cross Chain') && (
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
						<GridContent>
							<Section>
								<FlexRow>
									<span>Number of pools tracked</span>
									<span>:</span>
									<span>{yields.noOfPoolsTracked}</span>
								</FlexRow>
								<FlexRow>
									<span>Average APY</span>
									<span>:</span>
									<span>{yields.averageAPY.toFixed(2)}%</span>
								</FlexRow>

								<LinksWrapper>
									<Link href={`/yields?project=${protocol}`} passHref>
										<Button
											as="a"
											target="_blank"
											rel="noopener noreferrer"
											useTextColor={true}
											color={backgroundColor}
										>
											<span>Open on Yields dashboard</span> <ArrowUpRight size={14} />
										</Button>
									</Link>
								</LinksWrapper>
							</Section>
						</GridContent>
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

				{governanceApi && (
					<TabPanel state={tab} tabId="governance">
						<GovernanceData api={governanceApi} />
					</TabPanel>
				)}
			</TabLayout>
		</Layout>
	)
}

const Raised = ({ data }: { data: Array<IRaise> }) => {
	const [open, setOpen] = React.useState(false)
	return (
		<StatsTable2>
			<tbody>
				<tr>
					<th>
						<Toggle onClick={() => setOpen(!open)} data-open={open}>
							<ChevronRight size={16} />
							<span>Total Raised</span>
						</Toggle>
					</th>
					<td>${formatRaisedAmount(data.reduce((sum, r) => sum + Number(r.amount), 0))}</td>
				</tr>
				{open && (
					<>
						{data
							.sort((a, b) => a.date - b.date)
							.map((raise) => (
								<tr key={raise.date + raise.amount}>
									<th data-subvalue>{new Date(raise.date * 1000).toLocaleDateString()}</th>
									<td data-subvalue>
										<a target="_blank" rel="noopener noreferrer" href={raise.source}>
											{formatRaise(raise)}
										</a>
									</td>
								</tr>
							))}
					</>
				)}
			</tbody>
		</StatsTable2>
	)
}

const TopProposals = ({ data }: { data: Array<{ title: string; link?: string }> }) => {
	const [open, setOpen] = React.useState(false)
	return (
		<StatsTable2>
			<tbody>
				<tr>
					<th>
						<Toggle onClick={() => setOpen(!open)} data-open={open}>
							<ChevronRight size={16} />
							<span>Top Controversial Proposals</span>
						</Toggle>
					</th>
				</tr>
				{open && (
					<>
						{data.map((proposal) => (
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
				)}
			</tbody>
		</StatsTable2>
	)
}

const Expenses = ({
	data
}: {
	data: { headcount: number; annualUsdCost: { [key: string]: number }; sources: string[] }
}) => {
	const [open, setOpen] = React.useState(false)
	return (
		<StatsTable2>
			<tbody>
				<tr>
					<th>
						<Toggle onClick={() => setOpen(!open)} data-open={open}>
							<ChevronRight size={16} />
							<span>Annual operational expenses</span>
						</Toggle>
					</th>
					<td>
						{formattedNum(
							Object.values(data.annualUsdCost || {}).reduce((acc, curr) => (acc += curr), 0),
							true
						)}
					</td>
				</tr>

				{open && (
					<>
						<tr>
							<th data-subvalue>Headcount</th>
							<td data-subvalue>{data.headcount}</td>
						</tr>

						{Object.entries(data.annualUsdCost || {}).map(([cat, exp]) => {
							return (
								<tr key={'expenses' + cat + exp}>
									<th data-subvalue>{capitalizeFirstLetter(cat)}</th>
									<td data-subvalue>{formattedNum(exp, true)}</td>
								</tr>
							)
						})}

						<tr>
							<th data-subvalue>
								<a href={data.sources[0]}>
									Source <ArrowUpRight size={10} style={{ display: 'inline' }} />
								</a>
							</th>
							<td data-subvalue></td>
						</tr>
					</>
				)}
			</tbody>
		</StatsTable2>
	)
}

const TreasuryTable = ({ data }: { data: { [category: string]: number } }) => {
	const [open, setOpen] = React.useState(false)
	return (
		<StatsTable2>
			<tbody>
				<tr>
					<th>
						<Toggle onClick={() => setOpen(!open)} data-open={open}>
							<ChevronRight size={16} />
							<span>Treasury</span>
						</Toggle>
					</th>
					<td>
						{formattedNum(
							Object.values(data).reduce((acc, curr) => (acc += curr), 0),
							true
						)}
					</td>
				</tr>

				{open && (
					<>
						{Object.entries(data).map(([cat, tre]) => {
							return (
								<tr key={'treasury' + cat + tre}>
									<th data-subvalue>{capitalizeFirstLetter(cat)}</th>
									<td data-subvalue>{formattedNum(tre, true)}</td>
								</tr>
							)
						})}
					</>
				)}
			</tbody>
		</StatsTable2>
	)
}

const Toggle = styled.button`
	margin-left: -24px;
	display: flex;
	align-items: center;
	gap: 2px;
	white-space: nowrap;

	svg {
		flex-shrink: 0;
	}

	&[data-open='true'] {
		svg {
			transform: rotate(90deg);
			transition: 0.1s ease;
		}
	}
`

const StatsTable2 = styled(ProtocolStatsTable)`
	margin: -24px 0 0 0;

	th[data-subvalue],
	td[data-subvalue] {
		font-weight: 400;
		font-family: var(--inter);
		font-size: 0.875rem;
	}
	td {
		color: ${({ theme }) => theme.text1};
	}

	a {
		text-decoration: underline;
		text-decoration-color: ${({ theme }) => (theme.mode === 'dark' ? '#cccccc' : '#545757')};
	}
`

export default ProtocolContainer
