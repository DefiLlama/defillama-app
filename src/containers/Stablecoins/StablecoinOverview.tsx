import * as React from 'react'
import { transparentize } from 'polished'
import Layout from '~/layout'
import { PeggedSearch } from '~/components/Search/Stablecoins'
import { FormattedName } from '~/components/FormattedName'
import { TokenLogo } from '~/components/TokenLogo'
import { AuditInfo } from '~/components/AuditInfo'
import { SEO } from '~/components/SEO'
import { QuestionHelper } from '~/components/QuestionHelper'
import { useCalcGroupExtraPeggedByDay, useCalcCirculating, useGroupBridgeData } from '~/hooks/data/stablecoins'
import { UNRELEASED, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import {
	capitalizeFirstLetter,
	toNiceCsvDate,
	formattedNum,
	download,
	getBlockExplorer,
	toK,
	peggedAssetIconUrl
} from '~/utils'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { PeggedAssetByChainTable } from './Table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'
import { buildStablecoinChartData } from '~/containers/Stablecoins/utils'
import { Tooltip } from '~/components/Tooltip'
import { defaultProtocolPageStyles } from '../ProtocolOverview/Chart/constants'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const risksHelperTexts = {
	algorithmic:
		'Algorithmic assets have their pegs maintained by mechanisms that influence supply and demand. They may be partially collateralized or over-collateralized, but usually do not have a redemption mechanism for their reserve assets. Risks of algorithmic assets include smart contract risk, price collapse due to bank run or other mechanism failure, and de-pegging.',
	'fiat-backed':
		'Fiat-backed assets are backed 1:1 by a reserve of fiat assets controlled by the issuer. Risks of fiat-backed assets include counterparty risk against the issuer, asset freezing and regulations, and risk of insufficient backing.',
	'crypto-backed':
		'Crypto-backed assets are backed by cryptoassets locked in a smart contract as collateral. Risks of crypto-backed assets include smart contract risk, collateral volatility and liquidation, and de-pegging.'
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
		>
			<SEO
				stablePage={true}
				cardName={name}
				token={name}
				logo={props.logo}
				tvl={formattedNum(props.mcap, true)?.toString()}
			/>

			<PeggedSearch />

			<PeggedAssetInfo {...props} />
		</Layout>
	)
}

const totalChartTooltipLabel = ['Circulating']

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

	const chainsData: any[] = chainsUnique.map((elem: string) => {
		return peggedAssetData.chainBalances[elem].tokens
	})

	const { peggedAreaChartData, peggedAreaTotalData, stackedDataset } = React.useMemo(
		() =>
			buildStablecoinChartData({
				chartDataByAssetOrChain: chainsData,
				assetsOrChainsList: chainsUnique,
				filteredIndexes: [...Array(chainsUnique.length).keys()],
				issuanceType: 'circulating',
				selectedChain: undefined,
				totalChartTooltipLabel: totalChartTooltipLabel[0]
			}),
		[chainsData, chainsUnique, totalChartTooltipLabel]
	)

	const extraPeggeds = [UNRELEASED]
	const [extraPeggedsEnabled, updater] = useLocalStorageSettingsManager('stablecoins')

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

	const tagStyles = React.useMemo(() => {
		return {
			'--tag-border-color': transparentize(0.9, backgroundColor),
			'--tag-bg': backgroundColor,
			'--tag-hover-bg': transparentize(0.8, backgroundColor),
			...defaultProtocolPageStyles
		}
	}, [backgroundColor])

	return (
		<>
			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1" style={tagStyles as any}>
				<div className="bg-(--cards-bg) rounded-md flex flex-col col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<Ariakit.TabProvider defaultSelectedId={defaultSelectedId}>
						<Ariakit.TabList aria-label="Pegged Tabs" className="flex">
							<Ariakit.Tab
								className="py-2 px-6 flex-1 whitespace-nowrap border-b rounded-tl-md border-(--tag-border-color) hover:bg-(--tag-hover-bg) focus-visible:bg-(--tag-hover-bg) aria-selected:border-b-(--tag-bg)"
								id={defaultSelectedId}
							>
								Stats
							</Ariakit.Tab>
							<Ariakit.Tab className="py-2 px-6 flex-1 whitespace-nowrap border-b border-l border-(--tag-border-color) hover:bg-(--tag-hover-bg) focus-visible:bg-(--tag-hover-bg) aria-selected:border-b-(--tag-bg)">
								Info
							</Ariakit.Tab>
							<Ariakit.Tab className="py-2 px-6 flex-1 whitespace-nowrap border-b rounded-tr-xl xl:rounded-none border-l border-(--tag-border-color) hover:bg-(--tag-hover-bg) focus-visible:bg-(--tag-hover-bg) aria-selected:border-b-(--tag-bg)">
								Links
							</Ariakit.Tab>
						</Ariakit.TabList>

						<Ariakit.TabPanel tabId={defaultSelectedId}>
							<div className="flex flex-col gap-6 p-5 overflow-x-auto">
								<h1 className="flex items-center gap-2 text-xl">
									<TokenLogo logo={logo} size={24} />
									<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
									<span className="font-normal mr-auto">{symbol && symbol !== '-' ? `(${symbol})` : ''}</span>
									{peggedAssetData.deprecated ? (
										<span className="text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1">
											<Tooltip
												content="Deprecated"
												className="bg-red-600 dark:bg-red-400 text-white text-[10px] h-3 w-3 flex items-center justify-center rounded-full"
											>
												!
											</Tooltip>
											<span>Deprecated</span>
										</span>
									) : null}
								</h1>

								<p className="flex flex-col gap-1">
									<span className="text-base text-[#545757] dark:text-[#cccccc]">Market Cap</span>
									<span className="font-semibold text-2xl font-jetbrains min-h-8">
										{formattedNum(mcap || '0', true)}
									</span>
								</p>

								<p className="flex items-center flex-wrap justify-between gap-2 text-base">
									<span className="text-[#545757] dark:text-[#cccccc]">Price</span>
									<span className="font-jetbrains">{price === null ? '-' : formattedNum(price, true)}</span>
								</p>

								{totalCirculating && (
									<table className="w-full border-collapse text-base">
										<caption className="text-xs text-[#545757] dark:text-[#cccccc] text-left pb-1">
											Issuance Stats
										</caption>
										<tbody>
											<tr>
												<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">Total Circulating</th>
												<td className="font-jetbrains text-right">{toK(totalCirculating)}</td>
											</tr>
										</tbody>
									</table>
								)}

								{extraPeggeds.length > 0 && (
									<table className="w-full border-collapse text-base">
										<caption className="text-xs text-[#545757] dark:text-[#cccccc] text-left pb-1 flex items-center gap-1 flex-wrap">
											<span>Optional Circulating Counts</span>
											<QuestionHelper text="Use this option to choose whether to include coins that have been minted but have never been circulating." />
										</caption>
										<tbody>
											{extraPeggeds.map((option) => (
												<tr key={option}>
													<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left">
														<label className="flex items-center gap-2 cursor-pointer">
															<input
																type="checkbox"
																value={option}
																checked={extraPeggedsEnabled[option]}
																onChange={() => updater(option)}
															/>
															<span style={{ opacity: extraPeggedsEnabled[option] ? 1 : 0.7 }}>
																{capitalizeFirstLetter(option)}
															</span>
														</label>
													</th>
													<td className="font-jetbrains text-right">{toK(unreleased)}</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
								<CSVDownloadButton onClick={downloadCsv} className="mr-auto" />
							</div>
						</Ariakit.TabPanel>

						<Ariakit.TabPanel>
							<div className="flex flex-col gap-6 p-5 overflow-auto">
								{description && (
									<p className="flex flex-col gap-2">
										<span className="font-medium">Description</span>
										<span>{description}</span>
									</p>
								)}

								{pegMechanism && (
									<p className="flex items-center gap-2">
										<span className="font-medium">Category</span>
										<span>:</span>
										<span>{pegMechanism}</span>
										<QuestionHelper text={risksHelperTexts[pegMechanism]} />
									</p>
								)}

								{mintRedeemDescription && (
									<p className="flex flex-col gap-2">
										<span className="font-medium">Minting and Redemption</span>
										<span>{mintRedeemDescription}</span>
									</p>
								)}

								{pegMechanism === 'fiat-backed' && auditLinks && (
									<AuditInfo audits={auditLinks.length > 0 ? 2 : 0} auditLinks={auditLinks} color={backgroundColor} />
								)}
							</div>
						</Ariakit.TabPanel>

						<Ariakit.TabPanel>
							<div className="flex items-center gap-6 p-5 overflow-auto flex-wrap">
								{blockExplorerLink !== undefined && (
									<span>
										<a
											href={blockExplorerLink}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
										>
											<span>View on {blockExplorerName}</span> <Icon name="arrow-up-right" height={14} width={14} />
										</a>
									</span>
								)}

								{url && (
									<span>
										<a
											href={url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
										>
											<span>Website</span>
											<Icon name="arrow-up-right" height={14} width={14} />
										</a>
									</span>
								)}

								{twitter && (
									<span>
										<a
											href={twitter}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
										>
											<span>Twitter</span>
											<Icon name="arrow-up-right" height={14} width={14} />
										</a>
									</span>
								)}

								{onCoinGecko === 'true' && (
									<span>
										<a
											href={`https://www.coingecko.com/en/coins/${gecko_id}`}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
										>
											<span>CoinGecko</span>
											<Icon name="arrow-up-right" height={14} width={14} />
										</a>
									</span>
								)}

								<a
									href={`https://github.com/DefiLlama/peggedassets-server/tree/master/src/adapters/peggedAssets/${gecko_id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
								>
									<span>Check the code</span>
									<Icon name="arrow-up-right" height={14} width={14} />
								</a>
							</div>
						</Ariakit.TabPanel>
					</Ariakit.TabProvider>
				</div>

				<div className="bg-(--cards-bg) rounded-md min-h-[416px] flex flex-col col-span-2">
					<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--tag-border-color) m-3">
						<button
							data-active={chartType === 'Mcap'}
							className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--tag-hover-bg) focus-visible:bg-(--tag-hover-bg) data-[active=true]:bg-(--tag-hover-bg)"
							onClick={() => setChartType('Mcap')}
						>
							Total Circ
						</button>
						<button
							data-active={chartType === 'Pie'}
							className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--tag-hover-bg) focus-visible:bg-(--tag-hover-bg) data-[active=true]:bg-(--tag-hover-bg)"
							onClick={() => setChartType('Pie')}
						>
							Pie
						</button>
						<button
							data-active={chartType === 'Dominance'}
							className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--tag-hover-bg) focus-visible:bg-(--tag-hover-bg) data-[active=true]:bg-(--tag-hover-bg)"
							onClick={() => setChartType('Dominance')}
						>
							Dominance
						</button>
						<button
							data-active={chartType === 'Chain Mcaps'}
							className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--tag-hover-bg) focus-visible:bg-(--tag-hover-bg) data-[active=true]:bg-(--tag-hover-bg)"
							onClick={() => setChartType('Chain Mcaps')}
						>
							Area
						</button>
					</div>

					{chartType === 'Mcap' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title={`Total ${symbol} Circulating`}
								chartData={peggedAreaTotalData}
								stacks={totalChartTooltipLabel}
								color={backgroundColor}
								hideDefaultLegend={true}
							/>
						</React.Suspense>
					)}
					{chartType === 'Chain Mcaps' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title=""
								chartData={peggedAreaChartData}
								stacks={chainsUnique}
								valueSymbol="$"
								hideDefaultLegend={true}
							/>
						</React.Suspense>
					)}
					{chartType === 'Dominance' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title=""
								valueSymbol="%"
								chartData={dataWithExtraPeggedAndDominanceByDay}
								stacks={chainsUnique}
								hideDefaultLegend={true}
							/>
						</React.Suspense>
					)}
					{chartType === 'Pie' && (
						<React.Suspense fallback={<></>}>
							<PieChart chartData={chainsCirculatingValues} />
						</React.Suspense>
					)}
				</div>
			</div>

			<PeggedAssetByChainTable data={groupedChains} />
		</>
	)
}
