import * as React from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/future/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { ArrowUpRight, DownloadCloud } from 'react-feather'
import Layout from '~/layout'
import {
	Button,
	DetailsTable,
	DownloadButton,
	ExtraOption,
	FlexRow,
	InfoWrapper,
	LinksWrapper,
	DetailsWrapper,
	Name,
	Section,
	SectionHeader,
	Symbol,
	ChartsWrapper,
	LazyChart,
	ChartsPlaceholder
} from '~/layout/ProtocolAndPool'
import { Stat, StatsSection, StatWrapper } from '~/layout/Stats/Medium'
import { ChartWrapper } from '~/layout/ProtocolAndPool'
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
import { useScrollToTop } from '~/hooks'
import { useCalcSingleExtraTvl } from '~/hooks/data'
import { DEFI_SETTINGS_KEYS, useDefiManager } from '~/contexts/LocalStorage'
import {
	capitalizeFirstLetter,
	chainIconUrl,
	formattedNum,
	getBlockExplorer,
	slug,
	standardizeProtocolName,
	toK,
	tokenIconUrl
} from '~/utils'
import { useFetchProtocol } from '~/api/categories/protocols/client'
import type { IFusedProtocolData, IRaise } from '~/api/types'
import { useYields } from '~/api/categories/yield/client'
import boboLogo from '~/assets/boboSmug.png'
import { formatTvlsByChain, buildProtocolAddlChartsData } from './utils'
import ChartByType from './../../DexsAndFees/charts'

const StackedChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const scams = ['Drachma Exchange', 'StableDoin', 'CroLend Finance']

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

const OtherProtocols = styled.nav`
	grid-column: span 1;
	display: flex;
	overflow-x: auto;
	background: ${({ theme }) => theme.bg7};
	font-weight: 500;
	border-radius: 12px 12px 0 0;

	@media screen and (min-width: 80rem) {
		grid-column: span 2;
	}
`

const RaisesWrapper = styled.ul`
	list-style: none;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
`

interface IProtocolLink {
	active: boolean
	color: string | null
}

const ProtocolLink = styled.a<IProtocolLink>`
	padding: 8px 24px;
	white-space: nowrap;

	& + & {
		border-left: ${({ theme }) => '1px solid ' + theme.divider};
	}

	border-bottom: ${({ active, color, theme }) => '1px solid ' + (active ? color : theme.divider)};

	:first-child {
		border-top-left-radius: 12px;
	}

	:hover,
	:focus-visible {
		background-color: ${({ color }) => transparentize(0.9, color)};
	}
`

interface IProtocolContainerProps {
	title: string
	protocol: string
	protocolData: IFusedProtocolData
	backgroundColor: string
	similarProtocols: Array<{ name: string; tvl: number }>
}

const isLowerCase = (letter: string) => letter === letter.toLowerCase()

export function FeesBody({ data, chartData }) {
	const { pathname } = useRouter()

	const isProtocolPage = pathname.includes('protocol')
	return (
		<StatsSection>
			<DetailsWrapper>
				<Name>
					{isProtocolPage ? (
						'Fees and Revenue'
					) : (
						<>
							<TokenLogo logo={data.logo ?? chainIconUrl(data.name)} size={24} />
							<FormattedName text={data.name} maxCharacters={16} fontWeight={700} />
						</>
					)}
				</Name>

				<Stat>
					<span>24h fees</span>
					<span>{formattedNum(data.total1dFees || 0, true)}</span>
				</Stat>

				<Stat>
					<span>24h revenue</span>
					<span>{formattedNum(data.total1dRevenue || 0, true)}</span>
				</Stat>
			</DetailsWrapper>

			<ChartWrapper>
				<StackedChart
					chartData={chartData}
					title={isProtocolPage ? '' : 'Fees And Revenue'}
					stacks={{ Fees: 'a', Revenue: 'b' }}
					stackColors={stackedBarChartColors}
				/>
			</ChartWrapper>
		</StatsSection>
	)
}

function ProtocolContainer({
	title,
	protocolData,
	protocol,
	backgroundColor,
	similarProtocols
}: IProtocolContainerProps) {
	useScrollToTop()
	const {
		address = '',
		name,
		symbol,
		url,
		description,
		tvl,
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
		raises
	} = protocolData

	const router = useRouter()

	const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

	const totalVolume = useCalcSingleExtraTvl(tvlBreakdowns, tvl)

	const [bobo, setBobo] = React.useState(false)

	const [extraTvlsEnabled, updater] = useDefiManager()

	const { data: yields } = useYields()

	const {
		tvls: tvlsByChain,
		extraTvls,
		tvlOptions
	} = tvlByChain.reduce(
		(acc, [name, tvl]: [string, number]) => {
			// skip masterchef tvl type
			if (name === 'masterchef') return acc

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

	const [yeildsNumber, averageApy] = React.useMemo(() => {
		if (!yields) return [0, 0]
		const projectYieldsExist = yields.find(({ project }) => project === protocol)
		if (!projectYieldsExist) return [0, 0]
		const projectYields = yields.filter(({ project }) => project === protocol)
		const averageApy = projectYields.reduce((acc, { apy }) => acc + apy, 0) / projectYields.length

		return [projectYields.length, averageApy]
	}, [protocol, yields])

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

	return (
		<Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} style={{ gap: '36px' }}>
			<SEO cardName={name} token={name} logo={tokenIconUrl(name)} tvl={formattedNum(totalVolume, true)?.toString()} />

			<ProtocolsChainsSearch step={{ category: 'Protocols', name }} options={tvlOptions} />

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

				<DetailsWrapper style={{ borderTopLeftRadius: otherProtocols?.length > 1 ? 0 : '12px' }}>
					{scams.includes(name) && <p>There's been multiple hack reports in this protocol</p>}

					<Name>
						<TokenLogo logo={tokenIconUrl(name)} size={24} />
						<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
						<Symbol>{symbol && symbol !== '-' ? `(${symbol})` : ''}</Symbol>

						{!isParentProtocol && <Bookmark readableProtocolName={name} />}
					</Name>

					<StatWrapper>
						<Stat>
							<span>Total Value Locked</span>
							<span>{formattedNum(totalVolume || '0', true)}</span>
						</Stat>

						{!isParentProtocol && (
							<Link href={`https://api.llama.fi/dataset/${protocol}.csv`} passHref>
								<DownloadButton as="a" color={backgroundColor}>
									<DownloadCloud size={14} />
									<span>&nbsp;&nbsp;.csv</span>
								</DownloadButton>
							</Link>
						)}
					</StatWrapper>

					{tvls.length > 0 && (
						<DetailsTable>
							<caption>Chain Breakdown</caption>
							<tbody>
								{tvls.map((chainTvl) => (
									<tr key={chainTvl[0]}>
										<th>{capitalizeFirstLetter(chainTvl[0])}</th>
										<td>${toK(chainTvl[1] || 0)}</td>
									</tr>
								))}
							</tbody>
						</DetailsTable>
					)}

					{extraTvls.length > 0 && (
						<DetailsTable>
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
										<td>${toK(value)}</td>
									</tr>
								))}
							</tbody>
						</DetailsTable>
					)}
				</DetailsWrapper>

				<ProtocolChart
					protocol={protocol}
					color={backgroundColor}
					historicalChainTvls={historicalChainTvls}
					chains={chains}
					hallmarks={hallmarks}
					bobo={bobo}
					geckoId={gecko_id}
				/>

				<Bobo onClick={() => setBobo(!bobo)}>
					<span className="visually-hidden">Enable Goblin Mode</span>
					<Image src={boboLogo} width="34px" height="34px" alt="bobo cheers" />
				</Bobo>
			</StatsSection>

			<SectionHeader>Information</SectionHeader>
			<InfoWrapper>
				<Section>
					<h3>Protocol Information</h3>
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

					{forkedFrom && (
						<FlexRow>
							<span>Forked from</span>
							<span>:</span>
							<>
								{forkedFrom.map((p, index) => (
									<Link href={`/protocol/${p}`} key={p}>
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
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>Website</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}

						{twitter && (
							<Link href={`https://twitter.com/${twitter}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>Twitter</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>

				<Section>
					<h3>Token Information</h3>

					{address && (
						<FlexRow>
							<span>Address</span>
							<span>:</span>
							<span>{address.slice(0, 8) + '...' + address?.slice(36, 42)}</span>
							<CopyHelper toCopy={address} disabled={!address} />
						</FlexRow>
					)}

					<LinksWrapper>
						{protocolData.gecko_id && (
							<Link href={`https://www.coingecko.com/en/coins/${protocolData.gecko_id}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>View on CoinGecko</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
						{blockExplorerLink && (
							<Link href={blockExplorerLink} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>View on {blockExplorerName}</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>

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
									<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
										<span>Check the code</span>
										<ArrowUpRight size={14} />
									</Button>
								</Link>
							)}
						</LinksWrapper>
					</Section>
				)}

				{similarProtocols && similarProtocols.length > 0 && (
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
				)}

				{raises && raises.length > 0 && (
					<Section>
						<h3>Raises</h3>
						<RaisesWrapper>
							<li>{`Total raised: ${formatRaisedAmount(raises.reduce((sum, r) => sum + Number(r.amount), 0))}`}</li>
							{raises
								.sort((a, b) => a.date - b.date)
								.map((raise) => (
									<li key={raise.date + raise.amount}>
										<a target="_blank" rel="noopener noreferrer" href={raise.source}>
											{formatRaise(raise)}
										</a>
									</li>
								))}
						</RaisesWrapper>
					</Section>
				)}
			</InfoWrapper>

			{yeildsNumber > 0 && (
				<InfoWrapper>
					<Section>
						<h3>Yields</h3>

						<FlexRow>
							<span>Number of pools tracked</span>
							<span>:</span>
							<span>{yeildsNumber}</span>
						</FlexRow>
						<FlexRow>
							<span>Average APY</span>
							<span>:</span>
							<span>{averageApy.toFixed(2)}%</span>
						</FlexRow>

						<LinksWrapper>
							<Link href={`/yields?project=${protocol}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>Open on Yields dashboard</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						</LinksWrapper>
					</Section>
				</InfoWrapper>
			)}

			{showCharts && (
				<>
					<SectionHeader>TVL Charts</SectionHeader>

					<ChartsWrapper>
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
										<LazyChart>
											<PieChart title="Tokens Breakdown" chartData={tokenBreakdownPieChart} />
										</LazyChart>

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
											hidedefaultlegend={true}
											valueSymbol="$"
										/>
									</LazyChart>
								)}
							</>
						)}
					</ChartsWrapper>
				</>
			)}

			{/* <ChartsWrapper>
				{loading ? (
					<ChartsPlaceholder>Loading...</ChartsPlaceholder>
				) : (
					<>
						<ChartByType chartType="chain" protocolName={slug(protocolData.name)} type="dexs" />
						<ChartByType chartType="chain" protocolName={slug(protocolData.name)} type="fees" breakdownChart={false} />
						<ChartByType chartType="version" protocolName={slug(protocolData.name)} type="dexs" />
						<ChartByType chartType="chain" protocolName={slug(protocolData.name)} type="fees" />
					</>
				)}
			</ChartsWrapper> */}
		</Layout>
	)
}

const stackedBarChartColors = {
	Fees: '#4f8fea',
	Revenue: '#E59421'
}

const formatRaise = (raise: IRaise) => {
	let text = new Date(raise.date * 1000).toLocaleDateString() + ' :'

	if (raise.round) {
		text += ` ${raise.round}`
	}

	if (raise.round && raise.amount) {
		text += ' -'
	}

	if (raise.amount) {
		text += ` Raised $${formatRaisedAmount(Number(raise.amount))}`
	}

	if (raise.valuation && Number(raise.valuation)) {
		text += ` at $${formatRaisedAmount(Number(raise.valuation))} valuation`
	}

	return text
}

const formatRaisedAmount = (n: number) => {
	if (n >= 1e3) {
		return `${n / 1e3}b`
	}
	return `${n}m`
}

export default ProtocolContainer
