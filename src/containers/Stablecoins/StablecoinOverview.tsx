import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard/AddToDashboardButton'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { preparePieChartData } from '~/components/ECharts/formatters'
import type { IPieChartProps } from '~/components/ECharts/types'
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
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
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
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const onChartTypeChange = React.useCallback(
		(nextChartType: (typeof CHART_TYPE_VALUES)[number]) => {
			// Clear previous refs immediately to avoid exporting a stale chart
			handleChartReady(null)
			setChartType(nextChartType)
		},
		[handleChartReady]
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

	const { dataWithExtraPeggedAndDominanceByDay } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const groupedChains = useGroupBridgeData(chainTotals, bridgeInfo)

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

	const hasInfo = description || pegMechanism || mintRedeemDescription || auditLinks?.length > 0

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				{/* Stats card */}
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="flex flex-wrap items-center gap-2 text-xl">
						<TokenLogo logo={logo} size={24} />
						<span className="font-bold">{name}</span>
						{symbol && symbol !== '-' ? <span className="font-normal">({symbol})</span> : null}
						{peggedAssetData.deprecated ? (
							<Tooltip content="Deprecated protocol" className="text-(--error)">
								<Icon name="alert-triangle" height={18} width={18} />
							</Tooltip>
						) : null}
					</h1>

					<p className="flex flex-col">
						<span className="text-(--text-label)">Market Cap</span>
						<span className="min-h-8 font-jetbrains text-2xl font-semibold">{formattedNum(mcap || '0', true)}</span>
					</p>

					<div className="flex flex-col">
						<p className="flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
							<span className="text-(--text-label)">Price</span>
							<span className="font-jetbrains">{price === null ? '-' : formattedNum(price, true)}</span>
						</p>
						{totalCirculating != null ? (
							<p className="flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
								<span className="text-(--text-label)">Total Circulating</span>
								<span className="font-jetbrains">{formattedNum(totalCirculating)}</span>
							</p>
						) : null}
						{unreleased > 0
							? extraPeggeds.map((option) => (
									<p
										key={option}
										className="flex flex-wrap items-center justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0"
									>
										<label className="flex cursor-pointer items-center gap-2 text-(--text-label)">
											<input
												type="checkbox"
												value={option}
												checked={extraPeggedsEnabled[option]}
												onChange={() => updater(option)}
											/>
											<span style={{ opacity: extraPeggedsEnabled[option] ? 1 : 0.7 }}>
												{capitalizeFirstLetter(option)}
											</span>
											<QuestionHelper text="Use this option to choose whether to include coins that have been minted but have never been circulating." />
										</label>
										<span className="font-jetbrains">{formattedNum(unreleased)}</span>
									</p>
								))
							: null}
					</div>
				</div>

				{/* Chart */}
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex items-center justify-end gap-2 p-2 pb-0">
						<div className="mr-auto flex items-center gap-2">
							<TagGroup
								setValue={onChartTypeChange}
								selectedValue={chartType}
								values={CHART_TYPE_VALUES}
								variant="responsive"
							/>
						</div>
						<AddToDashboardButton chartConfig={dashboardChartConfig} smol />
						<ChartExportButtons
							chartInstance={exportChartInstance}
							filename={getImageExportFilename()}
							title={getImageExportTitle()}
						/>
					</div>
					{chartType === 'Total Circ' ? (
						<React.Suspense fallback={<div className="h-[360px] w-full" />}>
							<MultiSeriesChart2 dataset={totalCircDataset} charts={TOTAL_CIRC_CHARTS} onReady={handleChartReady} />
						</React.Suspense>
					) : chartType === 'Area' ? (
						<React.Suspense fallback={<div className="h-[360px] w-full" />}>
							<MultiSeriesChart2
								dataset={areaDataset}
								charts={areaCharts}
								stacked={true}
								valueSymbol="$"
								onReady={handleChartReady}
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
								onReady={handleChartReady}
							/>
						</React.Suspense>
					) : chartType === 'Pie' ? (
						<React.Suspense fallback={<div className="h-[360px] w-full" />}>
							<PieChart chartData={chainsCirculatingValues} onReady={handleChartReady} />
						</React.Suspense>
					) : null}
				</div>

				{/* Additional info cards */}
				{hasInfo ? (
					<div className="col-span-full">
						<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
							<h2 className="text-base font-semibold">Stablecoin Information</h2>
							{description ? <p>{description}</p> : null}
							{pegMechanism ? (
								<p className="flex items-center gap-1">
									<span>Category:</span>
									<span>{pegMechanism}</span>
									<QuestionHelper text={risksHelperTexts[pegMechanism] || 'No additional info available'} />
								</p>
							) : null}
							{mintRedeemDescription ? (
								<p className="flex flex-col gap-1">
									<span className="font-medium">Minting and Redemption</span>
									<span className="text-(--text-label)">{mintRedeemDescription}</span>
								</p>
							) : null}
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
							<div className="flex flex-wrap gap-2">
								{url ? (
									<a
										href={url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									>
										<Icon name="earth" className="h-3 w-3" />
										<span>Website</span>
									</a>
								) : null}
								{twitter ? (
									<a
										href={twitter}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									>
										<Icon name="twitter" className="h-3 w-3" />
										<span>Twitter</span>
									</a>
								) : null}
								{blockExplorerLink !== undefined ? (
									<a
										href={blockExplorerLink}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									>
										<span>{blockExplorerName}</span>
										<Icon name="arrow-up-right" height={14} width={14} />
									</a>
								) : null}
								{onCoinGecko === 'true' && gecko_id ? (
									<a
										href={`https://www.coingecko.com/en/coins/${gecko_id}`}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									>
										<span>CoinGecko</span>
										<Icon name="arrow-up-right" height={14} width={14} />
									</a>
								) : null}
								{gecko_id ? (
									<a
										href={`https://github.com/DefiLlama/peggedassets-server/tree/master/src/adapters/peggedAssets/${gecko_id}`}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									>
										<Icon name="github" className="h-3 w-3" />
										<span>Check the code</span>
									</a>
								) : null}
							</div>
						</div>
					</div>
				) : null}
			</div>

			<PeggedAssetByChainTable data={groupedChains} />
		</>
	)
}

const TOTAL_CIRC_CHARTS = [
	{ type: 'line' as const, name: 'Circulating', encode: { x: 'timestamp', y: 'Circulating' }, color: CHART_COLORS[0] }
]
