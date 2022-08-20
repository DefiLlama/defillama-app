import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useTabState, Tab, TabList, TabPanel } from 'ariakit'
import { transparentize } from 'polished'
import { ArrowUpRight, DownloadCloud } from 'react-feather'
import styled from 'styled-components'
import Layout from '~/layout'
import { CustomLink } from '~/components/Link'
import { PeggedSearch } from '~/components/Search'
import { OptionButton } from '~/components/ButtonStyled'
import { AutoRow, RowBetween } from '~/components/Row'
import { ButtonLight } from '~/components/ButtonStyled'
import { PeggedChainResponsivePie, PeggedChainResponsiveDominance, AreaChart } from '~/components/Charts'
import FormattedName from '~/components/FormattedName'
import TokenLogo from '~/components/TokenLogo'
import AuditInfo from '~/components/AuditInfo'
import { columnsToShow, FullTable } from '~/components/Table'
import SEO from '~/components/SEO'
import QuestionHelper from '~/components/QuestionHelper'
import {
	useCalcGroupExtraPeggedByDay,
	useCalcCirculating,
	useGroupBridgeData,
	useCreatePeggedCharts
} from '~/hooks/data'
import { useXl, useMed } from '~/hooks/useBreakpoints'
import { UNRELEASED, useStablecoinsManager } from '~/contexts/LocalStorage'
import {
	capitalizeFirstLetter,
	toNiceCsvDate,
	toNiceMonthlyDate,
	getRandomColor,
	formattedNum,
	download,
	getBlockExplorer,
	toK,
	peggedAssetIconUrl,
	formattedPeggedPrice
} from '~/utils'
import { IProtocolMcapTVLChartProps } from '~/components/TokenChart/types'

const TokenAreaChart = dynamic(() => import('~/components/TokenChart/AreaChart'), {
	ssr: false
}) as React.FC<IProtocolMcapTVLChartProps>

const risksHelperTexts = {
	algorithmic:
		'Algorithmic assets have their pegs maintained by mechanisms that influence supply and demand. They may be partially collateralized or over-collateralized, but usually do not have a redemption mechanism for their reserve assets. Risks of algorithmic assets include smart contract risk, price collapse due to bank run or other mechanism failure, and de-pegging.',
	'fiat-backed':
		'Fiat-backed assets are backed 1:1 by a reserve of fiat assets controlled by the issuer. Risks of fiat-backed assets include counterparty risk against the issuer, asset freezing and regulations, and risk of insufficient backing.',
	'crypto-backed':
		'Crypto-backed assets are backed by cryptoassets locked in a smart contract as collateral. Risks of crypto-backed assets include smart contract risk, collateral volatility and liquidation, and de-pegging.'
}

const Stats = styled.section`
	display: flex;
	flex-direction: column;
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	border: ${({ theme }) => '0px solid ' + theme.divider};
	box-shadow: ${({ theme }) => theme.shadowSm};
	position: relative;
	isolation: isolate;
	z-index: 1;

	@media (min-width: 80rem) {
		flex-direction: row;
	}
`

const PeggedDetails = styled.div`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	padding-bottom: calc(24px + 0.4375rem);
	color: ${({ theme }) => theme.text1};
	overflow: auto;
`

const PeggedName = styled.h1`
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 1.25rem;
`

const Symbol = styled.span`
	font-weight: 400;
`

const Table = styled(FullTable)`
	tr > :first-child {
		padding-left: 40px;
	}

	tr > *:not(:first-child) {
		& > * {
			white-space: nowrap;
			overflow: hidden;
			font-weight: 400;
			margin-left: auto;
		}
	}

	// PEGGED NAME
	tr > *:nth-child(1) {
		& > * {
			width: 140px;
			overflow: hidden;
			white-space: nowrap;

			& > *:nth-child(3) {
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}
	}

	// BRIDGE
	tr > *:nth-child(2) {
		display: none;
		& > * {
			width: 200px;
			overflow: hidden;
			white-space: nowrap;
		}
	}

	// BRIDGED AMOUNT
	tr > *:nth-child(3) {
		display: none;
	}

	// 1D CHANGE
	tr > *:nth-child(4) {
		display: none;
	}

	// 7D CHANGE
	tr > *:nth-child(5) {
		display: none;
	}

	// 1M CHANGE
	tr > *:nth-child(6) {
		display: none;
	}

	// TOTAL CIRCULATING
	tr > *:nth-child(7) {
		width: 160px;
		padding-right: 20px;
		& > * {
			text-align: right;
			margin-left: auto;
			white-space: nowrap;
			overflow: hidden;
		}
	}

	@media screen and (min-width: 360px) {
		// PEGGED NAME
		tr > *:nth-child(1) {
			& > * {
				width: 160px;
			}
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		// 7D CHANGE
		tr > *:nth-child(5) {
			display: revert;
		}
	}

	@media screen and (min-width: 640px) {
		// PEGGED NAME
		tr > *:nth-child(1) {
			& > * {
				width: 280px;
				// SHOW LOGO
				& > *:nth-child(2) {
					display: flex;
				}
			}
		}
	}

	@media screen and (min-width: 720px) {
		// 1M CHANGE
		tr > *:nth-child(6) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpMed}) {
		// PEGGED NAME
		tr > *:nth-child(1) {
			& > * {
				& > *:nth-child(4) {
					& > *:nth-child(2) {
						display: revert;
					}
				}
			}
		}
	}

	@media screen and (min-width: 900px) {
		// TOTAL CIRCULATING
		tr > *:nth-child(7) {
			padding-right: 0px;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		// 1D CHANGE
		tr > *:nth-child(4) {
			display: none !important;
		}

		// TOTAL CIRCULATING
		tr > *:nth-child(7) {
			padding-right: 20px;
		}
	}

	@media screen and (min-width: 1200px) {
		// 1M CHANGE
		tr > *:nth-child(6) {
			display: revert !important;
		}
	}

	@media screen and (min-width: 1300px) {
		// BRIDGED AMOUNT
		tr > *:nth-child(3) {
			display: revert !important;
		}

		// 1D CHANGE
		tr > *:nth-child(4) {
			display: revert !important;
		}

		// TOTAL CIRCULATING
		tr > *:nth-child(7) {
			display: revert !important;
		}
	}

	@media screen and (min-width: 1536px) {
		// PEGGED NAME
		tr > *:nth-child(1) {
			& > * {
				width: 300px;
			}
		}

		// BRIDGE
		tr > *:nth-child(2) {
			display: revert;
		}
	}
`

const DetailsTable = styled.table`
	border-collapse: collapse;

	caption,
	thead th {
		font-weight: 400;
		font-size: 0.75rem;
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#969b9b' : '#545757')};
	}

	th {
		font-weight: 600;
		font-size: 1rem;
		text-align: start;
	}

	td {
		font-weight: 400;
		font-size: 0.875rem;
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
`

const Mcap = styled.p`
	font-weight: 700;
	font-size: 2rem;
	display: flex;
	flex-direction: column;
	gap: 8px;

	& > *:first-child {
		font-weight: 400;
		font-size: 0.75rem;
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#969b9b' : '#545757')};
	}
`

const TabContainer = styled(TabList)`
	display: flex;

	& > *:first-child {
		border-top-left-radius: 12px;
	}

	& > :nth-child(3) {
		border-top-right-radius: 12px;
	}

	@media (min-width: 80rem) {
		& > :nth-child(3) {
			border-top-right-radius: 0px;
		}
	}
`

const PeggedTab = styled(Tab)`
	display: flex;
	flex-grow: 1;
	height: 2rem;
	align-items: center;
	justify-content: center;
	border-style: none;
	padding-left: 1rem;
	padding-right: 1rem;
	font-weight: 400;
	font-size: 1rem;
	line-height: 1.5rem;
	background-color: ${({ theme }) => theme.bg3};
	color: ${({ theme }) => (theme.mode === 'dark' ? '#969b9b' : '#545757')};

	&[aria-selected='true'] {
		color: ${({ theme }) => theme.white};
		background-color: ${({ theme }) => theme.primary1} !important;
	}

	:hover {
		background-color: ${({ color, theme }) =>
			color ? transparentize(0.8, color) : transparentize(0.8, theme.primary1)};
	}
`

const TabWrapper = styled.section`
	display: flex;
	flex-direction: column;
	background: ${({ theme }) => theme.bg7};
	border-top-left-radius: 12px;
	border-top-right-radius: 12px;

	@media (min-width: 80rem) {
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
		font-size: 0.75rem;
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#969b9b' : '#545757')};
	}
`

const McapWrapper = styled.section`
	display: flex;
	gap: 20px;
	align-items: flex-end;
	justify-content: space-between;
	flex-wrap: wrap;
`

const ExtraPeggedOption = styled.label`
	display: flex;
	align-items: center;
	gap: 8px;

	input {
		position: relative;
		top: 1px;
		padding: 0;
		-webkit-appearance: none;
		appearance: none;
		background-color: transparent;
		width: 1em;
		height: 1em;
		border: ${({ theme }) => '1px solid ' + theme.text4};
		border-radius: 0.15em;
		transform: translateY(-0.075em);
		display: grid;
		place-content: center;

		::before {
			content: '';
			width: 0.5em;
			height: 0.5em;
			transform: scale(0);
			transition: 120ms transform ease-in-out;
			box-shadow: ${({ theme }) => 'inset 1em 1em ' + theme.text1};
			transform-origin: bottom left;
			clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
		}

		:checked::before {
			transform: scale(1);
		}

		:focus-visible {
			outline-offset: max(2px, 0.15em);
		}

		:hover {
			cursor: pointer;
		}
	}

	:hover {
		cursor: pointer;
	}
`

const Button = styled(ButtonLight)`
	display: flex;
	gap: 4px;
	align-items: center;
	padding: 8px 12px;
	font-size: 0.875rem;
	font-weight: 400;
	white-space: nowrap;
	font-family: var(--font-inter);
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

const DownloadButton = styled(Button)`
	display: flex;
	align-items: center;
	padding: 8px 12px;
	border-radius: 10px;
`

const FlexRow = styled.p`
	display: flex;
	align-items: center;
	gap: 8px;
`

const Capitalize = (str) => {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

const columns = [
	...columnsToShow('peggedAssetChain'),
	{
		header: 'Bridge',
		accessor: 'bridgeInfo',
		disableSortBy: true,
		Cell: ({ value }) => {
			return value.link ? <CustomLink href={value.link}>{value.name}</CustomLink> : <span>{value.name}</span>
		}
	},
	{
		header: 'Bridged Amount',
		accessor: 'bridgedAmount',
		disableSortBy: true,
		Cell: ({ value }) => <>{typeof value === 'string' ? value : formattedNum(value)}</>
	},
	...columnsToShow('1dChange', '7dChange', '1mChange'),
	{
		header: 'Total Circulating',
		accessor: 'circulating',
		Cell: ({ value }) => <>{value && formattedNum(value)}</>
	}
]

export default function PeggedContainer({
	chainsUnique,
	chainCirculatings,
	peggedAssetData,
	totalCirculating,
	unreleased,
	mcap,
	bridgeInfo,
	peggedChartType,
	backgroundColor
}) {
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

	const [chartType, setChartType] = useState(peggedChartType)
	const defaultSelectedId = 'default-selected-tab'
	const tab = useTabState({ defaultSelectedId })

	const belowMed = useMed()
	const belowXl = useXl()
	const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

	const chainsData: any[] = chainsUnique.map((elem: string) => {
		return peggedAssetData.chainBalances[elem].tokens
	})

	const [peggedAreaChartData, peggedAreaTotalData, stackedDataset] = useCreatePeggedCharts(
		chainsData,
		chainsUnique,
		[...Array(chainsUnique.length).keys()],
		'circulating'
	)

	const extraPeggeds = [UNRELEASED]
	const [extraPeggedsEnabled, updater] = useStablecoinsManager()

	const chainColor = useMemo(
		() => Object.fromEntries([...chainsUnique, 'Others'].map((chain) => [chain, getRandomColor()])),
		[chainsUnique]
	)

	const chainTotals = useCalcCirculating(chainCirculatings)

	const chainsCirculatingValues = useMemo(() => {
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

	const { data: stackedData, daySum } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const groupedChains = useGroupBridgeData(chainTotals, bridgeInfo)

	const downloadCsv = () => {
		const rows = [['Timestamp', 'Date', ...chainsUnique]]
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([day.date, toNiceCsvDate(day.date), ...chainsUnique.map((chain) => day[chain] ?? '')])
			})
		download('peggedAssetChains.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	const totalMcapLabel = ['Mcap']

	return (
		<Layout
			title={`${name}: Circulating and stats - DefiLlama`}
			backgroundColor={transparentize(0.6, backgroundColor)}
			style={{ gap: '48px' }}
		>
			<SEO cardName={name} token={name} logo={logo} tvl={formattedNum(mcap, true)?.toString()} />

			<PeggedSearch
				step={{
					category: 'Pegged Asset',
					name: Capitalize(symbol),
					route: 'peggedassets',
					hideOptions: true
				}}
			/>

			<Stats>
				<TabWrapper>
					<TabContainer state={tab} className="tab-list" aria-label="Pegged Tabs">
						<PeggedTab className="tab" id={defaultSelectedId}>
							Stats
						</PeggedTab>
						<PeggedTab className="tab">Info</PeggedTab>
						<PeggedTab className="tab">Links</PeggedTab>
					</TabContainer>

					<TabPanel state={tab} tabId={defaultSelectedId}>
						<PeggedDetails>
							<PeggedName>
								<TokenLogo logo={logo} size={24} />
								<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
								<Symbol>{symbol !== '-' ? `(${symbol})` : ''}</Symbol>
							</PeggedName>

							<McapWrapper>
								<Mcap>
									<span>Market Cap</span>
									<span>{formattedNum(mcap || '0', true)}</span>
								</Mcap>

								<DownloadButton onClick={downloadCsv}>
									<DownloadCloud size={14} />
									<span>&nbsp;&nbsp;.csv</span>
								</DownloadButton>
							</McapWrapper>

							<DetailsTable>
								<tbody>
									<tr key={'Price'}>
										<th>{'Price'}</th>
										<td>{price === null ? '-' : formattedPeggedPrice(price, true)}</td>
									</tr>
								</tbody>
							</DetailsTable>

							{totalCirculating && (
								<DetailsTable>
									<caption>Issuance Stats</caption>
									<tbody>
										<tr key={'Total Circulating'}>
											<th>{'Total Circulating'}</th>
											<td>{toK(totalCirculating)}</td>
										</tr>
									</tbody>
								</DetailsTable>
							)}

							{extraPeggeds.length > 0 && (
								<DetailsTable>
									<thead>
										<tr>
											<th>Optional Circulating Counts</th>
											<td>
												<QuestionHelper text="Use this option to choose whether to include coins that have been minted but have never been circulating." />
											</td>
										</tr>
									</thead>
									<tbody>
										{extraPeggeds.map((option) => (
											<tr key={option}>
												<th>
													<ExtraPeggedOption>
														<input
															type="checkbox"
															value={option}
															checked={extraPeggedsEnabled[option]}
															onChange={updater(option)}
														/>
														<span>{capitalizeFirstLetter(option)}</span>
													</ExtraPeggedOption>
												</th>
												<td>{toK(unreleased)}</td>
											</tr>
										))}
									</tbody>
								</DetailsTable>
							)}
						</PeggedDetails>
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
						<PeggedDetails>
							<FlexRow>
								{blockExplorerLink !== undefined && (
									<>
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
									</>
								)}
							</FlexRow>

							{url && (
								<FlexRow>
									<>
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
									</>
								</FlexRow>
							)}

							{twitter && (
								<FlexRow>
									<>
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
									</>
								</FlexRow>
							)}

							{wiki && (
								<FlexRow>
									<>
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
									</>
								</FlexRow>
							)}

							{onCoinGecko === 'true' && (
								<FlexRow>
									<>
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
									</>
								</FlexRow>
							)}

							<FlexRow>
								<>
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
								</>
							</FlexRow>
						</PeggedDetails>
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
					<RowBetween my={useMed ? 20 : 0} mx={useMed ? 10 : 0} align="flex-start">
						<AutoRow style={{ width: 'fit-content' }} justify="flex-end" gap="6px" align="flex-start">
							<OptionButton active={chartType === 'Mcap'} onClick={() => setChartType('Mcap')}>
								Total Mcap
							</OptionButton>
							<OptionButton active={chartType === 'Area'} onClick={() => setChartType('Area')}>
								Area
							</OptionButton>
							<OptionButton active={chartType === 'Dominance'} onClick={() => setChartType('Dominance')}>
								Dominance
							</OptionButton>
							<OptionButton active={chartType === 'Pie'} onClick={() => setChartType('Pie')}>
								Pie
							</OptionButton>
						</AutoRow>
					</RowBetween>
					{chartType === 'Mcap' && (
						<TokenAreaChart
							title={`Total ${symbol} Circulating`}
							chartData={peggedAreaTotalData}
							tokensUnique={totalMcapLabel}
							color={backgroundColor}
							moneySymbol=""
							hideLegend={true}
							hallmarks={[]}
						/>
					)}
					{chartType === 'Area' && (
						<AreaChart
							aspect={aspect}
							finalChartData={peggedAreaChartData}
							tokensUnique={chainsUnique}
							color={'blue'}
							moneySymbol=""
							formatDate={toNiceMonthlyDate}
							hallmarks={[]}
						/>
					)}
					{chartType === 'Dominance' && (
						<PeggedChainResponsiveDominance
							stackOffset="expand"
							formatPercent={true}
							stackedDataset={stackedData}
							chainsUnique={chainsUnique}
							chainColor={chainColor}
							daySum={daySum}
							aspect={aspect}
						/>
					)}
					{chartType === 'Pie' && (
						<PeggedChainResponsivePie data={chainsCirculatingValues} chainColor={chainColor} aspect={aspect} />
					)}
				</div>
			</Stats>

			<Table data={groupedChains} columns={columns} />
		</Layout>
	)
}
