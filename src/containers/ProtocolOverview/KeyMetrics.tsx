import dayjs from 'dayjs'
import { useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { MetricRow, MetricSection, SubMetricRow } from '~/components/MetricPrimitives'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { definitions } from '~/public/definitions'
import { formattedNum } from '~/utils'
import { Flag } from './Flag'
import { getAdjustedTotals, getPrimaryValueLabelType } from './helpers'
import { KeyMetricsPngExportButton } from './KeyMetricsPngExport'
import type { IProtocolOverviewPageData } from './types'

export interface IKeyMetricsProps extends IProtocolOverviewPageData {
	formatPrice: (value: number | string | null) => string | number | null
	tvl?: number
	tvlByChain?: [string, number][]
	computedOracleTvs?: number
}

type AdapterOverviewKey =
	| 'dexVolume'
	| 'dexAggregatorVolume'
	| 'perpVolume'
	| 'perpAggregatorVolume'
	| 'bridgeAggregatorVolume'
	| 'optionsPremiumVolume'
	| 'optionsNotionalVolume'

interface StandardMetricConfig {
	dataProp: AdapterOverviewKey
	definitionKey: string
	label: string
	dataType: string
}

const STANDARD_METRICS: StandardMetricConfig[] = [
	{ dataProp: 'dexVolume', definitionKey: 'dexs', label: 'DEX Volume', dataType: 'DEX Volume' },
	{
		dataProp: 'dexAggregatorVolume',
		definitionKey: 'dexAggregators',
		label: 'DEX Aggregator Volume',
		dataType: 'DEX Aggregator Volume'
	},
	{ dataProp: 'perpVolume', definitionKey: 'perps', label: 'Perp Volume', dataType: 'Perp Volume' },
	{
		dataProp: 'perpAggregatorVolume',
		definitionKey: 'perpsAggregators',
		label: 'Perp Aggregator Volume',
		dataType: 'Perp Aggregator Volume'
	},
	{
		dataProp: 'bridgeAggregatorVolume',
		definitionKey: 'bridgeAggregators',
		label: 'Bridge Aggregator Volume',
		dataType: 'Bridge Aggregator Volume'
	},
	{
		dataProp: 'optionsPremiumVolume',
		definitionKey: 'optionsPremium',
		label: 'Options Premium Volume',
		dataType: 'Options Premium Volume'
	},
	{
		dataProp: 'optionsNotionalVolume',
		definitionKey: 'optionsNotional',
		label: 'Options Notional Volume',
		dataType: 'Options Notional Volume'
	}
]

const ANNUALIZATION_FACTOR = 12.2

function buildStandardVolumeMetrics(
	data: { total30d?: number | null; total7d?: number | null; total24h?: number | null; totalAllTime?: number | null },
	definitionKey: string,
	label: string
) {
	const entry = (definitions as Record<string, unknown>)[definitionKey]
	const defs =
		typeof entry === 'object' && entry !== null && 'protocol' in entry
			? (entry as { protocol: Record<string, string> }).protocol
			: undefined
	const metrics = []

	if (data.total30d != null) {
		metrics.push({ name: `${label} 30d`, tooltipContent: defs?.['30d'], value: data.total30d })
	}
	if (data.total7d != null) {
		metrics.push({ name: `${label} 7d`, tooltipContent: defs?.['7d'], value: data.total7d })
	}
	if (data.total24h != null) {
		metrics.push({ name: `${label} 24h`, tooltipContent: defs?.['24h'], value: data.total24h })
	}
	if (data.totalAllTime != null) {
		metrics.push({ name: `Cumulative ${label}`, tooltipContent: defs?.['cumulative'], value: data.totalAllTime })
	}

	return metrics
}

export const KeyMetrics = (props: IKeyMetricsProps) => {
	const containerRef = useRef<HTMLDivElement>(null)

	if (!props.hasKeyMetrics) return null

	const isOracleProtocol = props.oracleTvs != null
	const primaryValue = isOracleProtocol ? props.computedOracleTvs : props.tvl
	const { title: primaryLabel } = getPrimaryValueLabelType(isOracleProtocol ? 'Oracle' : (props.category ?? ''))

	const hasTvlData = isOracleProtocol
		? props.oracleTvs != null
		: (() => {
				if (!props.metrics.tvl || props.currentTvlByChain == null) return false
				for (const _chain in props.currentTvlByChain) return true
				return false
			})()

	return (
		<div className="flex flex-1 flex-col gap-2">
			<div className="flex items-center justify-between">
				<h2 className="group relative flex items-center gap-1 font-semibold" id="key-metrics">
					Key Metrics
					<a
						aria-hidden="true"
						tabIndex={-1}
						href="#key-metrics"
						className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
					/>
					<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
				</h2>
				<KeyMetricsPngExportButton
					containerRef={containerRef}
					protocolName={props.name}
					primaryValue={primaryValue}
					primaryLabel={primaryLabel}
					formatPrice={props.formatPrice}
					hasTvlData={hasTvlData}
				/>
			</div>
			<div className="flex flex-col" ref={containerRef}>
				{props.oracleTvs ? <TVL {...props} /> : null}
				<Fees {...props} />
				<Revenue {...props} />
				<HoldersRevenue {...props} />
				<Incentives {...props} />
				<Earnings {...props} />
				{STANDARD_METRICS.map((config) => {
					const data = props[config.dataProp]
					if (!data) return null
					const metrics = buildStandardVolumeMetrics(data, config.definitionKey, config.label)
					if (metrics.length === 0) return null
					return (
						<SmolStats
							key={config.dataType}
							data={metrics}
							protocolName={props.name}
							category={props.category ?? ''}
							formatPrice={props.formatPrice}
							openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
							dataType={config.dataType}
						/>
					)
				})}
				{props.openInterest?.total24h != null ? (
					<SmolStats
						data={[
							{
								name: 'Open Interest',
								tooltipContent: definitions.openInterest.protocol,
								value: props.openInterest.total24h
							}
						]}
						protocolName={props.name}
						category={props.category ?? ''}
						formatPrice={props.formatPrice}
						openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
						dataType="Open Interest"
					/>
				) : null}
				<BridgeVolume {...props} />
				<TokenCGData {...props} />
				{props.currentTvlByChain?.staking != null ? (
					<MetricRow
						label="Staked"
						extra={
							<Flag
								protocol={props.name}
								dataType="Staked"
								isLending={props.category === 'Lending'}
								className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
							/>
						}
						valueClassName="ml-auto"
						value={
							props.tokenCGData?.marketCap?.current ? (
								<span className="flex items-center gap-1">
									<span className="font-jetbrains">{props.formatPrice(props.currentTvlByChain.staking)}</span>
									<span className="text-xs text-(--text-label)">
										({formattedNum((props.currentTvlByChain.staking / props.tokenCGData.marketCap.current) * 100)}% of
										mcap)
									</span>
								</span>
							) : (
								<span className="font-jetbrains">{props.formatPrice(props.currentTvlByChain.staking)}</span>
							)
						}
					/>
				) : null}
				{props.currentTvlByChain?.borrowed != null ? (
					<MetricRow
						label="Borrowed"
						extra={
							<Flag
								protocol={props.name}
								dataType="Borrowed"
								isLending={props.category === 'Lending'}
								className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
							/>
						}
						value={props.formatPrice(props.currentTvlByChain.borrowed)}
					/>
				) : null}
				<TokenLiquidity {...props} />
				<Treasury {...props} />
				<Raises {...props} />
				<Expenses {...props} />
			</div>
			<Flag protocol={props.name} isLending={props.category === 'Lending'} />
		</div>
	)
}

function TVL(props: IKeyMetricsProps) {
	const tvl = props.tvl ?? 0
	const tvlByChain = props.tvlByChain

	const metrics = useMemo(() => {
		const metrics = []
		metrics.push({
			name: 'Total Value Locked',
			tooltipContent: "Total value locked in protocol's smart contracts",
			value: tvl
		})

		for (const [chain, tvl] of tvlByChain ?? []) {
			metrics.push({
				name: chain,
				value: tvl
			})
		}

		return metrics
	}, [tvl, tvlByChain])

	if (metrics.length === 0) return null

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="TVL"
		/>
	)
}

// ============================================
// Metric Builders
// ============================================

interface MetricDefinition {
	annualized?: string
	'30d'?: string
	'7d'?: string
	'24h'?: string
	cumulative?: string
}

interface MetricConfig {
	total30d?: number | null
	total7d?: number | null
	total24h?: number | null
	totalAllTime?: number | null
	emissions30d?: number | null
	emissions7d?: number | null
	emissions24h?: number | null
	emissionsAllTime?: number | null
}

const buildMetrics = (
	data: MetricConfig,
	defs: MetricDefinition,
	label: string,
	isIncentives = false
): Array<{ name: string; tooltipContent?: string; value: number }> => {
	const metrics = []
	const prefix = isIncentives ? 'Incentives' : label

	if (isIncentives) {
		if (data.emissions30d != null) {
			metrics.push({
				name: `${prefix} (Annualized)`,
				tooltipContent: defs?.annualized,
				value: data.emissions30d * ANNUALIZATION_FACTOR
			})
			metrics.push({ name: `${prefix} 30d`, tooltipContent: defs?.['30d'], value: data.emissions30d })
		}
		if (data.emissions7d != null) {
			metrics.push({ name: `${prefix} 7d`, tooltipContent: defs?.['7d'], value: data.emissions7d })
		}
		if (data.emissions24h != null) {
			metrics.push({ name: `${prefix} 24h`, tooltipContent: defs?.['24h'], value: data.emissions24h })
		}
		if (data.emissionsAllTime != null) {
			metrics.push({ name: `Cumulative ${prefix}`, tooltipContent: defs?.cumulative, value: data.emissionsAllTime })
		}
	} else {
		if (data.total30d != null) {
			metrics.push({
				name: `${label} (Annualized)`,
				tooltipContent: defs?.annualized,
				value: data.total30d * ANNUALIZATION_FACTOR
			})
			metrics.push({ name: `${label} 30d`, tooltipContent: defs?.['30d'], value: data.total30d })
		}
		if (data.total7d != null) {
			metrics.push({ name: `${label} 7d`, tooltipContent: defs?.['7d'], value: data.total7d })
		}
		if (data.total24h != null) {
			metrics.push({ name: `${label} 24h`, tooltipContent: defs?.['24h'], value: data.total24h })
		}
		if (data.totalAllTime != null) {
			metrics.push({ name: `Cumulative ${label}`, tooltipContent: defs?.cumulative, value: data.totalAllTime })
		}
	}

	return metrics
}

function Fees(props: IKeyMetricsProps) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const adjusted = getAdjustedTotals(props.fees, props.bribeRevenue, props.tokenTax, extraTvlsEnabled)
	if (!adjusted) return null

	const metrics = buildMetrics(adjusted, definitions.fees.protocol, 'Fees')
	if (metrics.length === 0) return null

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Fees"
		/>
	)
}

function Revenue(props: IKeyMetricsProps) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const adjusted = getAdjustedTotals(props.revenue, props.bribeRevenue, props.tokenTax, extraTvlsEnabled)
	if (!adjusted) return null

	const metrics = buildMetrics(adjusted, definitions.revenue.protocol, 'Revenue')
	if (metrics.length === 0) return null

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Revenue"
		/>
	)
}

function HoldersRevenue(props: IKeyMetricsProps) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const adjusted = getAdjustedTotals(props.holdersRevenue, props.bribeRevenue, props.tokenTax, extraTvlsEnabled)
	if (!adjusted) return null

	const metrics = buildMetrics(adjusted, definitions.holdersRevenue.protocol, 'Holders Revenue')
	if (metrics.length === 0) return null

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Holders Revenue"
		/>
	)
}

function Incentives(props: IKeyMetricsProps) {
	if (!props.incentives) return null

	const metrics = buildMetrics(props.incentives, definitions.incentives.protocol, 'Incentives', true)
	if (metrics.length === 0) return null

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Incentives"
		/>
	)
}

function Earnings(props: IKeyMetricsProps) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const revenue = props.revenue
	const incentivesData = props.incentives

	if (!incentivesData && !revenue) return null

	const adjustedRevenue = getAdjustedTotals(revenue, props.bribeRevenue, props.tokenTax, extraTvlsEnabled)

	const earnings24h =
		adjustedRevenue && revenue?.total24h != null && incentivesData?.emissions24h != null
			? adjustedRevenue.total24h - incentivesData.emissions24h
			: null
	const earnings7d =
		adjustedRevenue && revenue?.total7d != null && incentivesData?.emissions7d != null
			? adjustedRevenue.total7d - incentivesData.emissions7d
			: null
	const earnings30d =
		adjustedRevenue && revenue?.total30d != null && incentivesData?.emissions30d != null
			? adjustedRevenue.total30d - incentivesData.emissions30d
			: null
	const earningsAllTime =
		adjustedRevenue && revenue?.totalAllTime != null && incentivesData?.emissionsAllTime != null
			? adjustedRevenue.totalAllTime - incentivesData.emissionsAllTime
			: null

	const metrics = []

	if (earnings30d != null) {
		metrics.push({
			name: 'Earnings (Annualized)',
			tooltipContent: definitions.earnings.protocol.annualized,
			value: earnings30d * ANNUALIZATION_FACTOR
		})
		metrics.push({ name: 'Earnings 30d', tooltipContent: definitions.earnings.protocol['30d'], value: earnings30d })
	}
	if (earnings7d != null) {
		metrics.push({ name: 'Earnings 7d', tooltipContent: definitions.earnings.protocol['7d'], value: earnings7d })
	}
	if (earnings24h != null) {
		metrics.push({ name: 'Earnings 24h', tooltipContent: definitions.earnings.protocol['24h'], value: earnings24h })
	}
	if (earningsAllTime != null) {
		metrics.push({
			name: 'Cumulative Earnings',
			tooltipContent: definitions.earnings.protocol.cumulative,
			value: earningsAllTime
		})
	}

	if (metrics.length === 0) return null

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Earnings"
		/>
	)
}

function BridgeVolume(props: IKeyMetricsProps) {
	const [now] = useState(() => Date.now())

	if (!props.bridgeVolume || props.bridgeVolume.length === 0) return null

	const metrics = []
	const oneDayAgo = now - 24 * 60 * 60 * 1000
	const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
	const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

	let total24h = 0
	let total7d = 0
	let total30d = 0
	let totalAllTime = 0

	for (const item of props.bridgeVolume) {
		const volume = (item.depositUSD + item.withdrawUSD) / 2
		const timestamp = Number(item.date) * 1000

		totalAllTime += volume

		if (timestamp >= thirtyDaysAgo) {
			total30d += volume
		}

		if (timestamp >= sevenDaysAgo) {
			total7d += volume
		}

		if (timestamp >= oneDayAgo) {
			total24h += volume
		}
	}

	if (total30d > 0) {
		metrics.push({ name: 'Bridge Volume 30d', tooltipContent: null, value: total30d })
	}
	if (total7d > 0) {
		metrics.push({ name: 'Bridge Volume 7d', tooltipContent: null, value: total7d })
	}
	if (total24h > 0) {
		metrics.push({ name: 'Bridge Volume 24h', tooltipContent: null, value: total24h })
	}
	if (totalAllTime > 0) {
		metrics.push({ name: 'Cumulative Bridge Volume', tooltipContent: null, value: totalAllTime })
	}

	if (metrics.length === 0) return null

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Bridge Volume"
		/>
	)
}

const SmolStats = ({
	data,
	protocolName,
	category,
	formatPrice,
	openSmolStatsSummaryByDefault = false,
	dataType
}: {
	data: Array<{
		name: string
		tooltipContent?: string | null
		value: string | number
	}>
	protocolName: string
	category: string
	formatPrice: (value: number | string | null) => string | number | null
	openSmolStatsSummaryByDefault?: boolean
	dataType: string
}) => {
	const restOfData = useMemo(() => data.slice(1), [data])

	if (data.length === 0) return null

	if (data.length === 1) {
		return (
			<MetricRow
				label={data[0].name}
				tooltip={data[0].tooltipContent ?? undefined}
				extra={
					<Flag
						protocol={protocolName}
						dataType={dataType}
						isLending={category === 'Lending'}
						className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
					/>
				}
				value={formatPrice(data[0].value)}
			/>
		)
	}

	return (
		<MetricSection
			label={data[0].name}
			tooltip={data[0].tooltipContent ?? undefined}
			value={formatPrice(data[0].value)}
			defaultOpen={openSmolStatsSummaryByDefault}
			extra={
				<Flag
					protocol={protocolName}
					dataType={dataType}
					isLending={category === 'Lending'}
					className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
			}
		>
			{restOfData.map((metric) => (
				<SubMetricRow
					key={`${metric.name}-${metric.value}-${protocolName}`}
					label={metric.name}
					tooltip={metric.tooltipContent ?? undefined}
					value={formatPrice(metric.value)}
				/>
			))}
		</MetricSection>
	)
}

const Treasury = (props: IProtocolOverviewPageData) => {
	if (!props.treasury) return null
	return (
		<MetricSection
			label="Treasury"
			value={formattedNum(props.treasury.total, true)}
			extra={
				<Flag
					protocol={props.name}
					dataType="Treasury"
					isLending={props.category === 'Lending'}
					className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
			}
		>
			{props.treasury.majors != null ? (
				<SubMetricRow label="Majors" tooltip="BTC, ETH" value={formattedNum(props.treasury.majors, true)} />
			) : null}
			{props.treasury.stablecoins != null ? (
				<SubMetricRow label="Stablecoins" value={formattedNum(props.treasury.stablecoins, true)} />
			) : null}
			{props.treasury.ownTokens != null ? (
				<SubMetricRow label="Own Tokens" value={formattedNum(props.treasury.ownTokens, true)} />
			) : null}
			{props.treasury.others != null ? (
				<SubMetricRow label="Others" value={formattedNum(props.treasury.others, true)} />
			) : null}
		</MetricSection>
	)
}

const Expenses = (props: IKeyMetricsProps) => {
	if (!props.expenses) return null
	return (
		<MetricSection
			label="Annual Operational Expenses"
			value={props.formatPrice(props.expenses.total)}
			extra={
				<Flag
					protocol={props.name}
					dataType="Expenses"
					isLending={props.category === 'Lending'}
					className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
			}
		>
			<MetricRow
				label="Headcount"
				value={props.expenses.headcount != null ? formattedNum(props.expenses.headcount) : '\u2014'}
			/>
			{props.expenses.annualUsdCost.map(([category, amount]) => (
				<p
					className="flex flex-col gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none"
					key={`${props.name}-expenses-${category}-${amount}`}
				>
					<span className="flex flex-wrap justify-between">
						<span className="text-(--text-label)">{category}</span>
						<span className="font-jetbrains">{props.formatPrice(amount)}</span>
					</span>
				</p>
			))}
			{props.expenses?.sources?.length ? (
				<p className="flex flex-wrap justify-between gap-4 border-b border-dashed border-(--cards-border) py-1 text-(--text-label) group-last:border-none">
					<span className="text-(--text-label)">Sources</span>
					{props.expenses.sources?.map((source) => (
						<a
							href={source}
							target="_blank"
							rel="noopener noreferrer"
							key={`${props.name}-expenses-source-${source}`}
							className="hover:underline"
						>
							{source}
						</a>
					))}
				</p>
			) : null}
			{props.expenses?.notes?.length ? (
				<p className="flex flex-wrap justify-between gap-4 border-b border-dashed border-(--cards-border) py-1 text-(--text-label) group-last:border-none">
					<span className="text-(--text-label)">Notes</span>
					<span>{props.expenses.notes?.join(', ') ?? ''}</span>
				</p>
			) : null}
			{props.expenses?.lastUpdate ? (
				<p className="flex flex-wrap justify-between gap-4 border-b border-dashed border-(--cards-border) py-1 text-(--text-label) group-last:border-none">
					<span className="text-(--text-label)">Last Update</span>
					<span>{dayjs.utc(props.expenses.lastUpdate).format('MMM D, YYYY')}</span>
				</p>
			) : null}
		</MetricSection>
	)
}

const TokenLiquidity = (props: IKeyMetricsProps) => {
	if (!props.tokenLiquidity) return null
	return (
		<MetricSection
			label={`${props.token?.symbol ? `$${props.token.symbol}` : 'Token'} Liquidity`}
			tooltip="Sum of value locked in DEX pools that include that token across all DEXs for which DefiLlama tracks pool data."
			value={formattedNum(props.tokenLiquidity.total, true)}
			extra={
				<Flag
					protocol={props.name}
					dataType="Token Liquidity"
					isLending={props.category === 'Lending'}
					className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
			}
		>
			{props.tokenLiquidity?.pools.map((pool) => (
				<p
					key={`${pool[0]}-${pool[1]}-${pool[2]}`}
					className="flex items-center justify-between gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none"
				>
					<span className="text-(--text-label)">{pool[0]}</span>
					<span className="font-jetbrains">{props.formatPrice(pool[2])}</span>
				</p>
			))}
		</MetricSection>
	)
}

const TokenCGData = (props: IKeyMetricsProps) => {
	if (!props.tokenCGData) return null
	return (
		<>
			{props.tokenCGData?.marketCap?.current ? (
				<MetricRow
					label="Market Cap"
					extra={
						<Flag
							protocol={props.name}
							dataType="Market Cap"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
					}
					value={props.formatPrice(props.tokenCGData.marketCap.current)}
				/>
			) : null}
			{props.tokenCGData?.price?.current ? (
				props.tokenCGData.price.ath || props.tokenCGData.price.atl ? (
					<MetricSection
						label={`${props.token?.symbol ? `$${props.token.symbol}` : 'Token'} Price`}
						value={props.formatPrice(props.tokenCGData.price.current)}
						extra={
							<Flag
								protocol={props.name}
								dataType="Token Price"
								isLending={props.category === 'Lending'}
								className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
							/>
						}
					>
						<SubMetricRow label="All Time High" value={props.formatPrice(props.tokenCGData.price.ath)} />
						<SubMetricRow label="All Time Low" value={props.formatPrice(props.tokenCGData.price.atl)} />
					</MetricSection>
				) : (
					<MetricRow
						label={`${props.token?.symbol ? `$${props.token.symbol}` : 'Token'} Price`}
						extra={
							<Flag
								protocol={props.name}
								dataType="Token Price"
								isLending={props.category === 'Lending'}
								className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
							/>
						}
						value={props.formatPrice(props.tokenCGData.price.current)}
					/>
				)
			) : null}
			{props.tokenCGData?.fdv?.current ? (
				<MetricRow
					label="Fully Diluted Valuation"
					tooltip={
						"Fully Diluted Valuation, this is calculated by taking the expected maximum supply of the token and multiplying it by the price. It's mainly used to calculate the hypothetical marketcap of the token if all the tokens were unlocked and circulating.\n\nData for this metric is imported directly from coingecko."
					}
					extra={
						<Flag
							protocol={props.name}
							dataType="FDV"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
					}
					value={props.formatPrice(props.tokenCGData.fdv.current)}
				/>
			) : null}
			{props.outstandingFDV ? (
				<MetricRow
					label="Outstanding FDV"
					tooltip={
						'Outstanding FDV is calculated by taking the outstanding supply of the token and multiplying it by the price.\n\nOutstanding supply is the total supply minus the supply that is not yet allocated to anything (eg coins in treasury or reserve).'
					}
					extra={
						<Flag
							protocol={props.name}
							dataType="Outstanding FDV"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
					}
					value={props.formatPrice(props.outstandingFDV)}
				/>
			) : null}
			{props.tokenCGData.volume24h?.total ? (
				<MetricSection
					label={`${props.token?.symbol ? `$${props.token.symbol}` : 'Token'} Volume 24h`}
					value={props.formatPrice(props.tokenCGData.volume24h.total)}
					extra={
						<Flag
							protocol={props.name}
							dataType="Token Volume"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
					}
				>
					<SubMetricRow
						label="CEX Volume"
						value={props.tokenCGData.volume24h.cex ? props.formatPrice(props.tokenCGData.volume24h.cex) : '-'}
					/>
					<SubMetricRow
						label="DEX Volume"
						valueClassName="ml-auto"
						value={
							<span className="flex items-center gap-1">
								<span className="font-jetbrains">
									{props.tokenCGData.volume24h.dex ? props.formatPrice(props.tokenCGData.volume24h.dex) : '-'}
								</span>
								<span className="text-xs text-(--text-label)">
									(
									{formattedNum(
										((props.tokenCGData.volume24h.dex ?? 0) / (props.tokenCGData.volume24h.total ?? 1)) * 100
									)}
									% of total)
								</span>
							</span>
						}
					/>
				</MetricSection>
			) : null}
		</>
	)
}

const Raises = (props: IProtocolOverviewPageData) => {
	if (!props.raises || props.raises.length === 0) return null
	return (
		<MetricSection
			label="Total Raised"
			value={formattedNum(props.raises.reduce((sum, r) => sum + Number(r.amount), 0) * 1_000_000, true)}
			extra={
				<Flag
					protocol={props.name}
					dataType="Raises"
					isLending={props.category === 'Lending'}
					className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
			}
		>
			{props.raises.map((raise) => (
				<p
					className="flex flex-col gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none"
					key={`${raise.date}-${raise.amount}-${props.name}`}
				>
					<span className="flex flex-wrap justify-between">
						<span className="text-(--text-label)">{dayjs.utc(raise.date * 1000).format('MMM D, YYYY')}</span>
						{raise.amount ? (
							<span className="font-jetbrains">{formattedNum(raise.amount * 1_000_000, true)}</span>
						) : null}
					</span>
					<span className="flex flex-wrap justify-between gap-1 text-(--text-label)">
						<span>Round: {raise.round}</span>
						{raise.investors?.length ? <span>Investors: {raise.investors.join(', ')}</span> : null}
					</span>
					{raise.source ? (
						<span className="flex flex-wrap justify-between gap-1 text-(--text-label)">
							<span className="flex flex-nowrap items-center gap-1">
								Source:{' '}
								<a
									href={raise.source}
									target="_blank"
									rel="noopener noreferrer"
									className="overflow-hidden text-ellipsis whitespace-nowrap underline"
								>
									{raise.source}
								</a>
							</span>
						</span>
					) : null}
				</p>
			))}
		</MetricSection>
	)
}
