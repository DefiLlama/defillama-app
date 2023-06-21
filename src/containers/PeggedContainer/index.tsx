import * as React from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useTabState, Tab, TabList, TabPanel } from 'ariakit'
import { transparentize } from 'polished'
import { ArrowUpRight, DownloadCloud } from 'react-feather'
import styled from 'styled-components'
import Layout from '~/layout'
import {
	Button,
	DetailsTable,
	DownloadButton,
	ExtraOption,
	FlexRow,
	DetailsWrapper,
	Name,
	Symbol
} from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Checkbox2 } from '~/components'
import { PeggedSearch } from '~/components/Search'
import { ButtonLight } from '~/components/ButtonStyled'
import FormattedName from '~/components/FormattedName'
import TokenLogo from '~/components/TokenLogo'
import AuditInfo from '~/components/AuditInfo'
import SEO from '~/components/SEO'
import QuestionHelper from '~/components/QuestionHelper'

import { useCalcGroupExtraPeggedByDay, useCalcCirculating, useGroupBridgeData } from '~/hooks/data/stablecoins'
import { useBuildPeggedChartData } from '~/utils/stablecoins'
import { UNRELEASED, useStablecoinsManager } from '~/contexts/LocalStorage'
import {
	capitalizeFirstLetter,
	toNiceCsvDate,
	formattedNum,
	download,
	getBlockExplorer,
	toK,
	peggedAssetIconUrl,
	formattedPeggedPrice
} from '~/utils'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { PeggedAssetByChainTable } from '~/components/Table'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/Misc'
import { Stat, StatInARow } from '~/layout/Stats/Large'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const risksHelperTexts = {
	algorithmic:
		'Algorithmic assets have their pegs maintained by mechanisms that influence supply and demand. They may be partially collateralized or over-collateralized, but usually do not have a redemption mechanism for their reserve assets. Risks of algorithmic assets include smart contract risk, price collapse due to bank run or other mechanism failure, and de-pegging.',
	'fiat-backed':
		'Fiat-backed assets are backed 1:1 by a reserve of fiat assets controlled by the issuer. Risks of fiat-backed assets include counterparty risk against the issuer, asset freezing and regulations, and risk of insufficient backing.',
	'crypto-backed':
		'Crypto-backed assets are backed by cryptoassets locked in a smart contract as collateral. Risks of crypto-backed assets include smart contract risk, collateral volatility and liquidation, and de-pegging.'
}

const PeggedDetails = styled.div`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	padding-bottom: calc(24px + 0.4375rem);
	color: ${({ theme }) => theme.text1};
	overflow: auto;
`

const LinksWrapper = styled(PeggedDetails)`
	flex-direction: row;
	flex-wrap: wrap;
	gap: 16px;
`

const TabContainer = styled(TabList)`
	display: flex;

	& > *:first-child {
		border-top-left-radius: 12px;
	}

	& > :nth-child(3) {
		border-top-right-radius: 12px;
	}

	@media screen and (min-width: 80rem) {
		& > :nth-child(3) {
			border-top-right-radius: 0px;
		}
	}
`

const PeggedTab = styled(Tab)`
	padding: 8px 24px;
	white-space: nowrap;
	border-bottom: 1px solid transparent;
	flex: 1;

	&[aria-selected='true'] {
		border-bottom: ${({ color }) => '1px solid ' + color};
	}

	& + & {
		border-left: ${({ theme }) => '1px solid ' + theme.divider};
	}

	:first-child {
		border-top-left-radius: 12px;
	}

	:hover,
	:focus-visible {
		background-color: ${({ color }) => transparentize(0.9, color)};
	}
`

const TabWrapper = styled.section`
	display: flex;
	flex-direction: column;
	background: ${({ theme }) => theme.bg7};
	border-top-left-radius: 12px;
	border-top-right-radius: 12px;

	@media screen and (min-width: 80rem) {
		width: 380px;
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		border-bottom-left-radius: 12px;
	}
`

const PeggedDescription = styled.p`
	font-weight: 400;
	font-size: 0.875rem;
	display: flex;
	flex-direction: column;
	gap: 8px;

	& > *:first-child {
		font-weight: 400;
		font-size: 0.875rem;
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#969b9b' : '#545757')};
	}
`

const AlignSelfButton = styled(ButtonLight)`
	display: flex;
	gap: 4px;
	align-items: center;
	align-self: flex-start;
	padding: 8px 12px;
	font-size: 0.875rem;
	font-weight: 400;
	white-space: nowrap;
	font-family: var(--font-inter);
`

const Capitalize = (str) => {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

export default function PeggedContainer(props) {
	let {
		name,

		symbol
	} = props.peggedAssetData

	return (
		<Layout
			title={`${name}: Circulating and stats - DefiLlama`}
			backgroundColor={transparentize(0.6, props.backgroundColor)}
			style={{ gap: '48px' }}
		>
			<SEO cardName={name} token={name} logo={props.logo} tvl={formattedNum(props.mcap, true)?.toString()} />

			<PeggedSearch
				step={{
					category: 'Stablecoin',
					name: Capitalize(symbol),
					route: 'stablecoins',
					hideOptions: true
				}}
			/>

			<PeggedAssetInfo {...props} />
		</Layout>
	)
}

export const PeggedAssetInfo = ({
	chainsUnique,
	chainCirculatings,
	peggedAssetData,
	totalCirculating,
	unreleased,
	mcap,
	bridgeInfo,
	backgroundColor
}) => {
	let {
		name,
		onCoinGecko,
		gecko_id,
		symbol,
		description,
		mintRedeemDescription,
		address,
		url,
		pegMechanism,
		twitter,
		wiki,
		auditLinks,
		price
	} = peggedAssetData
	const logo = peggedAssetIconUrl(name)

	const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

	const [chartType, setChartType] = React.useState('Pie')
	const defaultSelectedId = 'default-selected-tab'
	const tab = useTabState({ defaultSelectedId })

	const chainsData: any[] = chainsUnique.map((elem: string) => {
		return peggedAssetData.chainBalances[elem].tokens
	})

	const totalChartTooltipLabel = ['Circulating']

	const { peggedAreaChartData, peggedAreaTotalData, stackedDataset } = useBuildPeggedChartData(
		chainsData,
		chainsUnique,
		[...Array(chainsUnique.length).keys()],
		'circulating',
		undefined,
		undefined,
		totalChartTooltipLabel[0]
	)

	const extraPeggeds = [UNRELEASED]
	const [extraPeggedsEnabled, updater] = useStablecoinsManager()

	const chainTotals = useCalcCirculating(chainCirculatings)

	const chainsCirculatingValues = React.useMemo(() => {
		const data = chainTotals.map((chain) => ({
			name: chain.name,
			value: chain.circulating
		}))
		const otherCirculating = data.slice(10).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		return data
			.slice(0, 10)
			.sort((a, b) => b.value - a.value)
			.concat({ name: 'Others', value: otherCirculating })
	}, [chainTotals])

	const { data: stackedData, dataWithExtraPeggedAndDominanceByDay } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const groupedChains = useGroupBridgeData(chainTotals, bridgeInfo)

	const downloadCsv = () => {
		const rows = [['Timestamp', 'Date', ...chainsUnique, 'Total']]
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([
					day.date,
					toNiceCsvDate(day.date),
					...chainsUnique.map((chain) => day[chain] ?? ''),
					chainsUnique.reduce((acc, curr) => {
						return (acc += day[curr] ?? 0)
					}, 0)
				])
			})
		download('stablecoinsChains.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	return (
		<>
			<StatsSection>
				<TabWrapper>
					<TabContainer state={tab} className="tab-list" aria-label="Pegged Tabs">
						<PeggedTab className="tab" id={defaultSelectedId} color={backgroundColor}>
							Stats
						</PeggedTab>
						<PeggedTab className="tab" color={backgroundColor}>
							Info
						</PeggedTab>
						<PeggedTab className="tab" color={backgroundColor}>
							Links
						</PeggedTab>
					</TabContainer>

					<TabPanel state={tab} tabId={defaultSelectedId}>
						<DetailsWrapper>
							<Name>
								<TokenLogo logo={logo} size={24} />
								<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
								<Symbol>{symbol && symbol !== '-' ? `(${symbol})` : ''}</Symbol>
							</Name>

							<Stat>
								<span>Market Cap</span>
								<span>
									<span>{formattedNum(mcap || '0', true)}</span>
									<DownloadButton onClick={downloadCsv} color={backgroundColor}>
										<DownloadCloud size={14} />
										<span>&nbsp;&nbsp;.csv</span>
									</DownloadButton>
								</span>
							</Stat>

							<StatInARow>
								<span>Price</span>
								<span>{price === null ? '-' : formattedPeggedPrice(price, true)}</span>
							</StatInARow>

							{totalCirculating && (
								<DetailsTable>
									<caption>Issuance Stats</caption>
									<tbody>
										<tr>
											<th>Total Circulating</th>
											<td>{toK(totalCirculating)}</td>
										</tr>
									</tbody>
								</DetailsTable>
							)}

							{extraPeggeds.length > 0 && (
								<DetailsTable>
									<caption>
										<span>Optional Circulating Counts</span>
										<QuestionHelper text="Use this option to choose whether to include coins that have been minted but have never been circulating." />
									</caption>
									<tbody>
										{extraPeggeds.map((option) => (
											<tr key={option}>
												<th>
													<ExtraOption>
														<Checkbox2
															type="checkbox"
															value={option}
															checked={extraPeggedsEnabled[option]}
															onChange={updater(option)}
														/>
														<span style={{ opacity: extraPeggedsEnabled[option] ? 1 : 0.7 }}>
															{capitalizeFirstLetter(option)}
														</span>
													</ExtraOption>
												</th>
												<td>{toK(unreleased)}</td>
											</tr>
										))}
									</tbody>
								</DetailsTable>
							)}
						</DetailsWrapper>
					</TabPanel>

					<TabPanel state={tab}>
						<PeggedDetails>
							{description && (
								<PeggedDescription>
									<>
										<span>Description</span>
										<span>{description}</span>
									</>
								</PeggedDescription>
							)}

							{pegMechanism && (
								<FlexRow>
									<>
										<span>Category</span>
										<span>:</span>
										<span>{pegMechanism}</span>
										<QuestionHelper text={risksHelperTexts[pegMechanism]} />
									</>
								</FlexRow>
							)}

							{mintRedeemDescription && (
								<PeggedDescription>
									<>
										<span>Minting and Redemption</span>
										<span>{mintRedeemDescription}</span>
									</>
								</PeggedDescription>
							)}

							{pegMechanism === 'fiat-backed' && auditLinks && (
								<AuditInfo audits={auditLinks.length > 0 ? 2 : 0} auditLinks={auditLinks} color={backgroundColor} />
							)}
						</PeggedDetails>
					</TabPanel>

					<TabPanel state={tab}>
						<LinksWrapper>
							{blockExplorerLink !== undefined && (
								<span>
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
								</span>
							)}

							{url && (
								<span>
									<Link href={url} passHref>
										<Button
											as="a"
											target="_blank"
											rel="noopener noreferrer"
											useTextColor={true}
											color={backgroundColor}
										>
											<span>Website</span>
											<ArrowUpRight size={14} />
										</Button>
									</Link>
								</span>
							)}

							{twitter && (
								<span>
									<Link href={twitter} passHref>
										<Button
											as="a"
											target="_blank"
											rel="noopener noreferrer"
											useTextColor={true}
											color={backgroundColor}
										>
											<span>Twitter</span>
											<ArrowUpRight size={14} />
										</Button>
									</Link>
								</span>
							)}

							{wiki && (
								<span>
									<Link href={wiki} passHref>
										<Button
											as="a"
											target="_blank"
											rel="noopener noreferrer"
											useTextColor={true}
											color={backgroundColor}
										>
											<span>DeFiLlama Wiki</span>
											<ArrowUpRight size={14} />
										</Button>
									</Link>
								</span>
							)}

							{onCoinGecko === 'true' && (
								<span>
									<Link href={`https://www.coingecko.com/en/coins/${gecko_id}`} passHref>
										<Button
											as="a"
											target="_blank"
											rel="noopener noreferrer"
											useTextColor={true}
											color={backgroundColor}
										>
											<span>CoinGecko</span>
											<ArrowUpRight size={14} />
										</Button>
									</Link>
								</span>
							)}

							<Link
								href={`https://github.com/DefiLlama/peggedassets-server/tree/master/src/adapters/peggedAssets/${gecko_id}`}
								passHref
							>
								<AlignSelfButton
									as="a"
									target="_blank"
									rel="noopener noreferrer"
									useTextColor={true}
									color={backgroundColor}
								>
									<span>Check the code</span>
									<ArrowUpRight size={14} />
								</AlignSelfButton>
							</Link>
						</LinksWrapper>
					</TabPanel>
				</TabWrapper>

				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						gap: '16px',
						padding: '0 0 20px 0',
						minHeight: '460px'
					}}
				>
					<Filters style={{ margin: '16px 16px 0' }} color={backgroundColor}>
						<Denomination as="button" active={chartType === 'Mcap'} onClick={() => setChartType('Mcap')}>
							Total Circ
						</Denomination>
						<Denomination as="button" active={chartType === 'Pie'} onClick={() => setChartType('Pie')}>
							Pie
						</Denomination>
						<Denomination as="button" active={chartType === 'Dominance'} onClick={() => setChartType('Dominance')}>
							Dominance
						</Denomination>
						<Denomination as="button" active={chartType === 'Chain Mcaps'} onClick={() => setChartType('Chain Mcaps')}>
							Area
						</Denomination>
					</Filters>

					{chartType === 'Mcap' && (
						<AreaChart
							title={`Total ${symbol} Circulating`}
							chartData={peggedAreaTotalData}
							stacks={totalChartTooltipLabel}
							color={backgroundColor}
							hideDefaultLegend={true}
						/>
					)}
					{chartType === 'Chain Mcaps' && (
						<AreaChart
							title=""
							chartData={peggedAreaChartData}
							stacks={chainsUnique}
							valueSymbol="$"
							hideDefaultLegend={true}
						/>
					)}
					{chartType === 'Dominance' && (
						<AreaChart
							title=""
							valueSymbol="%"
							chartData={dataWithExtraPeggedAndDominanceByDay}
							stacks={chainsUnique}
							hideDefaultLegend={true}
						/>
					)}
					{chartType === 'Pie' && <PieChart chartData={chainsCirculatingValues} />}
				</div>
			</StatsSection>

			<PeggedAssetByChainTable data={groupedChains} />
		</>
	)
}
