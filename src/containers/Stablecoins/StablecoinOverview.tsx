import * as Ariakit from '@ariakit/react'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard/AddToDashboardButton'
import { ChartCsvExportButton } from '~/components/ButtonStyled/ChartCsvExportButton'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { preparePieChartData } from '~/components/ECharts/formatters'
import type { IPieChartProps } from '~/components/ECharts/types'
import { FormattedName } from '~/components/FormattedName'
import { Icon } from '~/components/Icon'
import { Menu } from '~/components/Menu'
import { QuestionHelper } from '~/components/QuestionHelper'
import { LinkPreviewCard } from '~/components/SEO'
import { TagGroup } from '~/components/TagGroup'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import { StablecoinAssetChartConfig, StablecoinAssetChartType } from '~/containers/ProDashboard/types'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay, useGroupBridgeData } from '~/containers/Stablecoins/hooks'
import { buildStablecoinChartData } from '~/containers/Stablecoins/utils'
import { UNRELEASED, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useChartCsvExport } from '~/hooks/useChartCsvExport'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import Layout from '~/layout'
import { capitalizeFirstLetter, formattedNum, getBlockExplorer, peggedAssetIconUrl, slug, toNiceCsvDate } from '~/utils'
import { PeggedAssetByChainTable } from './Table'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const risksHelperTexts = {
	algorithmic:
		'Algorithmic assets have their pegs maintained by mechanisms that influence supply and demand. They may be partially collateralized or over-collateralized, but usually do not have a redemption mechanism for their reserve assets. Risks of algorithmic assets include smart contract risk, price collapse due to bank run or other mechanism failure, and de-pegging.',
	'fiat-backed':
		'Fiat-backed assets are backed 1:1 by a reserve of fiat assets controlled by the issuer. Risks of fiat-backed assets include counterparty risk against the issuer, asset freezing and regulations, and risk of insufficient backing.',
	'crypto-backed':
		'Crypto-backed assets are backed by cryptoassets locked in a smart contract as collateral. Risks of crypto-backed assets include smart contract risk, collateral volatility and liquidation, and de-pegging.'
}

const CHART_TYPE_TO_API_TYPE: Record<string, StablecoinAssetChartType> = {
	'Total Circ': 'totalCirc',
	Pie: 'chainPie',
	Dominance: 'chainDominance',
	Area: 'chainMcaps'
}

const CHART_TYPE_VALUES = ['Total Circ', 'Pie', 'Dominance', 'Area'] as const

export default function PeggedContainer(props) {
	let { name, symbol } = props.peggedAssetData
	const nameWithSymbol = name + (symbol && symbol !== '-' ? ` (${symbol})` : '')
	return (
		<Layout
			title={`${nameWithSymbol} - DefiLlama`}
			description={`Track ${nameWithSymbol} supply, market cap, price, and inflows on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${nameWithSymbol.toLowerCase()} total supply, ${nameWithSymbol.toLowerCase()} market cap, ${nameWithSymbol.toLowerCase()} price, ${nameWithSymbol.toLowerCase()} circulating, ${nameWithSymbol.toLowerCase()} stats`}
			canonicalUrl={`/stablecoin/${slug(name)}`}
		>
			<LinkPreviewCard
				stablePage={true}
				cardName={name}
				token={name}
				logo={peggedAssetIconUrl(name)}
				tvl={formattedNum(props.mcap, true)?.toString()}
			/>
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
	bridgeInfo
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
		auditLinks,
		price
	} = peggedAssetData
	const logo = peggedAssetIconUrl(name)

	const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

	const [chartType, setChartType] = React.useState('Pie')
	const defaultSelectedId = 'default-selected-tab'
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()
	const { chartInstance: exportChartCsvInstance, handleChartReady: handleChartCsvReady } = useChartCsvExport()

	const onChartTypeChange = React.useCallback(
		(nextChartType: (typeof CHART_TYPE_VALUES)[number]) => {
			// Clear previous refs immediately to avoid exporting a stale chart
			handleChartReady(null)
			handleChartCsvReady(null)
			setChartType(nextChartType)
		},
		[handleChartReady, handleChartCsvReady]
	)

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
		[chainsData, chainsUnique]
	)

	const extraPeggeds = [UNRELEASED] as const
	const [extraPeggedsEnabled, updater] = useLocalStorageSettingsManager('stablecoins')

	const chainTotals = useCalcCirculating(chainCirculatings)

	const chainsCirculatingValues = React.useMemo(() => {
		return preparePieChartData({ data: chainTotals, sliceIdentifier: 'name', sliceValue: 'circulating', limit: 10 })
	}, [chainTotals])

	const { data: stackedData, dataWithExtraPeggedAndDominanceByDay } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const groupedChains = useGroupBridgeData(chainTotals, bridgeInfo)

	const prepareCsv = () => {
		const rows = [['Timestamp', 'Date', ...chainsUnique, 'Total']]
		const sortedData = stackedData.sort((a, b) => a.date - b.date)
		for (const day of sortedData) {
			rows.push([
				day.date,
				toNiceCsvDate(day.date),
				...chainsUnique.map((chain) => day[chain] ?? ''),
				chainsUnique.reduce((acc, curr) => {
					return (acc += day[curr] ?? 0)
				}, 0)
			])
		}
		return { filename: 'stablecoinsChains.csv', rows: rows as (string | number | boolean)[][] }
	}

	const getImageExportTitle = () => {
		const chartTypeMap = {
			'Total Circ': 'Total Circulating',
			Pie: 'Distribution by Chain',
			Dominance: 'Chain Dominance',
			Area: 'Circulating by Chain'
		}
		return `${name} - ${chartTypeMap[chartType] || chartType}`
	}

	const getImageExportFilename = () => {
		const chartSlug = chartType.toLowerCase().replace(/\s+/g, '-')
		return `${slug(name)}-${chartSlug}`
	}

	const dashboardChartConfig: StablecoinAssetChartConfig = React.useMemo(
		() => ({
			id: `stablecoin-asset-${slug(name)}-${CHART_TYPE_TO_API_TYPE[chartType]}`,
			kind: 'stablecoin-asset',
			stablecoin: name,
			stablecoinId: slug(name),
			chartType: CHART_TYPE_TO_API_TYPE[chartType],
			colSpan: 1
		}),
		[name, chartType]
	)

	const totalCircDataset = React.useMemo(
		() => ({
			source: peggedAreaTotalData.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
			dimensions: ['timestamp', ...totalChartTooltipLabel]
		}),
		[peggedAreaTotalData]
	)

	const { areaDataset, areaCharts } = React.useMemo(
		() => ({
			areaDataset: {
				source: peggedAreaChartData.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...chainsUnique]
			},
			areaCharts: chainsUnique.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name },
				stack: 'chains'
			}))
		}),
		[peggedAreaChartData, chainsUnique]
	)

	const { dominanceDataset, dominanceCharts } = React.useMemo(
		() => ({
			dominanceDataset: {
				source: dataWithExtraPeggedAndDominanceByDay
					.map(({ date, ...rest }) => {
						const timestamp = Number(date) * 1e3
						if (!Number.isFinite(timestamp)) return null

						// Ensure every dimension exists and is numeric (ECharts can crash on undefined/NaN in stacked % charts)
						const row: Record<string, number> = { timestamp }
						for (const chain of chainsUnique) {
							const raw = (rest as any)[chain]
							const value = typeof raw === 'number' ? raw : Number(raw)
							row[chain] = Number.isFinite(value) ? value : 0
						}
						return row
					})
					.filter(Boolean),
				dimensions: ['timestamp', ...chainsUnique]
			},
			dominanceCharts: chainsUnique.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name },
				stack: 'dominance'
			}))
		}),
		[dataWithExtraPeggedAndDominanceByDay, chainsUnique]
	)

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1">
					<Ariakit.TabProvider defaultSelectedId={defaultSelectedId}>
						<Ariakit.TabList aria-label="Pegged Tabs" className="flex">
							<Ariakit.Tab
								className="flex-1 rounded-tl-md border-b border-(--bg-border) px-6 py-2 whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg) aria-selected:border-b-(--primary)"
								id={defaultSelectedId}
							>
								Stats
							</Ariakit.Tab>
							<Ariakit.Tab className="flex-1 border-b border-l border-(--bg-border) px-6 py-2 whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg) aria-selected:border-b-(--primary)">
								Info
							</Ariakit.Tab>
							<Ariakit.Tab className="flex-1 rounded-tr-xl border-b border-l border-(--bg-border) px-6 py-2 whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg) aria-selected:border-b-(--primary) xl:rounded-none">
								Links
							</Ariakit.Tab>
						</Ariakit.TabList>

						<Ariakit.TabPanel tabId={defaultSelectedId}>
							<div className="flex flex-col gap-6 overflow-x-auto p-5">
								<h1 className="flex items-center gap-2 text-xl">
									<TokenLogo logo={logo} size={24} />
									<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
									<span className="mr-auto font-normal">{symbol && symbol !== '-' ? `(${symbol})` : ''}</span>
									{peggedAssetData.deprecated ? (
										<Tooltip content="Deprecated protocol" className="text-(--error)">
											<Icon name="alert-triangle" height={16} width={16} />
										</Tooltip>
									) : null}
								</h1>

								<p className="flex flex-col gap-1">
									<span className="text-base text-(--text-label)">Market Cap</span>
									<span className="min-h-8 font-jetbrains text-2xl font-semibold">
										{formattedNum(mcap || '0', true)}
									</span>
								</p>

								<p className="flex flex-wrap items-center justify-between gap-2 text-base">
									<span className="text-(--text-label)">Price</span>
									<span className="font-jetbrains">{price === null ? '-' : formattedNum(price, true)}</span>
								</p>

								{totalCirculating != null ? (
									<table className="w-full border-collapse text-base">
										<caption className="pb-1 text-left text-xs text-(--text-label)">Issuance Stats</caption>
										<tbody>
											<tr>
												<th className="text-left font-normal text-(--text-label)">Total Circulating</th>
												<td className="text-right font-jetbrains">{formattedNum(totalCirculating)}</td>
											</tr>
										</tbody>
									</table>
								) : null}

								{extraPeggeds.length > 0 && (
									<table className="w-full border-collapse text-base">
										<caption className="flex flex-wrap items-center gap-1 pb-1 text-left text-xs text-(--text-label)">
											<span>Optional Circulating Counts</span>
											<QuestionHelper text="Use this option to choose whether to include coins that have been minted but have never been circulating." />
										</caption>
										<tbody>
											{extraPeggeds.map((option) => (
												<tr key={option}>
													<th className="text-left font-normal text-(--text-label)">
														<label className="flex cursor-pointer items-center gap-2">
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
													<td className="text-right font-jetbrains">{formattedNum(unreleased)}</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
								<CSVDownloadButton prepareCsv={prepareCsv} smol className="mt-auto mr-auto" />
							</div>
						</Ariakit.TabPanel>

						<Ariakit.TabPanel>
							<div className="flex flex-col gap-6 overflow-auto p-5">
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
								<p className="flex items-center gap-1">
									<span className="flex flex-nowrap items-center gap-1">
										<span>Audits</span>
										<QuestionHelper text="Audits are not a security guarantee" />
										<span>:</span>
									</span>
									{auditLinks?.length > 0 ? (
										<Menu
											name="Yes"
											options={typeof auditLinks === 'string' ? [auditLinks] : auditLinks}
											isExternal
											className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
										/>
									) : (
										<span>No</span>
									)}
								</p>
							</div>
						</Ariakit.TabPanel>

						<Ariakit.TabPanel>
							<div className="flex flex-wrap items-center gap-6 overflow-auto p-5">
								{blockExplorerLink !== undefined && (
									<span>
										<a
											href={blockExplorerLink}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
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
											className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
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
											className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
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
											className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
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
									className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
								>
									<span>Check the code</span>
									<Icon name="arrow-up-right" height={14} width={14} />
								</a>
							</div>
						</Ariakit.TabPanel>
					</Ariakit.TabProvider>
				</div>

				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex items-center justify-end gap-2 p-2">
						<div className="mr-auto flex items-center gap-2">
							<TagGroup
								setValue={onChartTypeChange}
								selectedValue={chartType}
								values={CHART_TYPE_VALUES}
								variant="responsive"
							/>
						</div>
						<AddToDashboardButton chartConfig={dashboardChartConfig} smol />
						<ChartCsvExportButton chartInstance={exportChartCsvInstance} filename={getImageExportFilename()} />
						<ChartExportButton
							chartInstance={exportChartInstance}
							filename={getImageExportFilename()}
							title={getImageExportTitle()}
						/>
					</div>
					{chartType === 'Total Circ' ? (
						<React.Suspense fallback={<div className="h-[360px] w-full" />}>
							<MultiSeriesChart2
								dataset={totalCircDataset}
								charts={TOTAL_CIRC_CHARTS}
								onReady={(instance) => {
									handleChartReady(instance)
									handleChartCsvReady(instance)
								}}
							/>
						</React.Suspense>
					) : chartType === 'Area' ? (
						<React.Suspense fallback={<div className="h-[360px] w-full" />}>
							<MultiSeriesChart2
								dataset={areaDataset}
								charts={areaCharts}
								stacked={true}
								valueSymbol="$"
								onReady={(instance) => {
									handleChartReady(instance)
									handleChartCsvReady(instance)
								}}
							/>
						</React.Suspense>
					) : chartType === 'Dominance' ? (
						<React.Suspense fallback={<div className="h-[360px] w-full" />}>
							<MultiSeriesChart2
								dataset={dominanceDataset}
								charts={dominanceCharts}
								stacked={true}
								expandTo100Percent={true}
								valueSymbol="%"
								onReady={(instance) => {
									handleChartReady(instance)
									handleChartCsvReady(instance)
								}}
							/>
						</React.Suspense>
					) : chartType === 'Pie' ? (
						<React.Suspense fallback={<div className="h-[360px] w-full" />}>
							<PieChart
								chartData={chainsCirculatingValues}
								onReady={(instance) => {
									handleChartReady(instance)
									handleChartCsvReady(instance)
								}}
							/>
						</React.Suspense>
					) : null}
				</div>
			</div>

			<PeggedAssetByChainTable data={groupedChains} />
		</>
	)
}

const TOTAL_CIRC_CHARTS = [
	{ type: 'line' as const, name: 'Circulating', encode: { x: 'timestamp', y: 'Circulating' }, color: CHART_COLORS[0] }
]
