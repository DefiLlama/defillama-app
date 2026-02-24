import * as Ariakit from '@ariakit/react'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { useGetTokenPrice } from '~/api/client'
import { Bookmark } from '~/components/Bookmark'
import { feesOptionsMap, tvlOptionsMap } from '~/components/Filters/options'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Menu } from '~/components/Menu'
import { QuestionHelper } from '~/components/QuestionHelper'
import { LinkPreviewCard } from '~/components/SEO'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { FEES_SETTINGS, isTvlSettingsKey, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { definitions } from '~/public/definitions'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import { Flag } from './Flag'
import { KeyMetricsPngExportButton } from './KeyMetricsPngExport'
import { ProtocolOverviewLayout } from './Layout'
import { SectionHeader, MetricRow, MetricSection } from './MetricComponents'
import { ProtocolChartPanel } from './ProtocolChartPanel'
import type { IProtocolOverviewPageData } from './types'

const EMPTY_COMPETITORS: Array<{ name: string; tvl: number }> = []

const IncomeStatement = lazy(() => import('./IncomeStatement').then((module) => ({ default: module.IncomeStatement })))
const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((module) => ({ default: module.SubscribeProModal }))
)

// ============================================
// Main Component
// ============================================

export const ProtocolOverview = (props: IProtocolOverviewPageData) => {
	const router = useRouter()

	const { tvl, tvlByChain, oracleTvs, oracleTvsByChain, toggleOptions } = useFinalTVL(props)

	const { data: chainPrice, isLoading: fetchingChainPrice } = useGetTokenPrice(
		props.chartDenominations?.[1]?.geckoId ?? undefined
	)

	const formatPrice = (value?: number | string | null): string | number | null => {
		if (Number.isNaN(Number(value))) return null

		if (
			!fetchingChainPrice &&
			chainPrice?.price &&
			typeof router.query.denomination === 'string' &&
			props.chartDenominations?.[1]?.symbol &&
			props.chartDenominations[1].symbol === router.query.denomination
		) {
			return formattedNum(Number(value) / chainPrice.price, false) + ` ${chainPrice.symbol}`
		}

		return formattedNum(value, true)
	}

	return (
		<ProtocolOverviewLayout
			isCEX={props.isCEX}
			name={props.name}
			category={props.category ?? ''}
			otherProtocols={props.otherProtocols ?? undefined}
			toggleOptions={toggleOptions}
			metrics={props.metrics}
			warningBanners={props.warningBanners}
			tab="information"
			seoDescription={props.seoDescription}
			seoKeywords={props.seoKeywords}
			entityQuestions={props.entityQuestions}
		>
			<LinkPreviewCard
				cardName={props.name}
				token={props.name}
				logo={tokenIconUrl(props.name)}
				tvl={formattedNum(tvl, true)?.toString()}
				isCEX={props.isCEX}
			/>
			<div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
				<div className="col-span-1 row-[2/3] hidden flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:row-[1/2] xl:flex xl:min-h-[360px]">
					<ProtocolHeader
						props={props}
						oracleTvs={oracleTvs}
						tvl={tvl}
						tvlByChain={tvlByChain}
						oracleTvsByChain={oracleTvsByChain}
						formatPrice={formatPrice}
						h1ClassName="flex flex-wrap items-center gap-2 text-xl *:last:ml-auto"
					/>
					<KeyMetrics {...props} formatPrice={formatPrice} tvl={tvl} computedOracleTvs={oracleTvs} />
				</div>
				<div className="col-span-1 grid grid-cols-2 gap-2 xl:col-[2/-1]">
					<div className="col-span-full flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
						<div className="flex flex-col gap-6 xl:hidden">
							<ProtocolHeader
								props={props}
								oracleTvs={oracleTvs}
								tvl={tvl}
								tvlByChain={tvlByChain}
								oracleTvsByChain={oracleTvsByChain}
								formatPrice={formatPrice}
								h1ClassName="flex flex-wrap items-center gap-2 text-xl"
							/>
						</div>
						<Suspense
							fallback={<div className="min-h-[400px] rounded-md border border-(--cards-border) bg-(--cards-bg)" />}
						>
							<ProtocolChartPanel {...props} />
						</Suspense>
					</div>
					{props.hasKeyMetrics ? (
						<div className="col-span-full flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:hidden">
							<KeyMetrics {...props} formatPrice={formatPrice} tvl={tvl} computedOracleTvs={oracleTvs} />
						</div>
					) : null}
				</div>
				<AdditionalInfo {...props} />
				{props.incomeStatement?.data ? (
					<Suspense fallback={<></>}>
						<IncomeStatement
							name={props.name}
							incomeStatement={props.incomeStatement}
							hasIncentives={props.metrics?.incentives}
						/>
					</Suspense>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}

// ============================================
// Sub Components
// ============================================

function ProtocolHeader({
	props,
	oracleTvs,
	tvl,
	tvlByChain,
	oracleTvsByChain,
	formatPrice,
	h1ClassName
}: {
	props: IProtocolOverviewPageData
	oracleTvs: number
	tvl: number
	tvlByChain: [string, number][]
	oracleTvsByChain: [string, number][]
	formatPrice: (value?: number | string | null) => string | number | null
	h1ClassName: string
}) {
	return (
		<>
			<h1 className={h1ClassName}>
				<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
				<span className="font-bold">{props.name}</span>
				{props.token?.symbol && props.token.symbol !== '-' ? (
					<span className="font-normal">({props.token.symbol})</span>
				) : null}
				{props.deprecated ? (
					<Tooltip content="Deprecated protocol" className="text-(--error)">
						<Icon name="alert-triangle" height={18} width={18} />
					</Tooltip>
				) : null}
				<Bookmark readableName={props.name} />
			</h1>
			{props.oracleTvs ? (
				<PrimaryValue
					hasTvl={true}
					value={oracleTvs}
					name={props.name}
					category={'Oracle'}
					valueByChain={oracleTvsByChain}
					formatPrice={formatPrice}
				/>
			) : (
				<PrimaryValue
					hasTvl={props.metrics.tvl}
					value={tvl}
					name={props.name}
					category={props.category === 'Oracle' ? '' : (props.category ?? '')}
					valueByChain={tvlByChain}
					formatPrice={formatPrice}
				/>
			)}
		</>
	)
}

function useFinalTVL(props: IProtocolOverviewPageData) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	return useMemo(() => {
		let tvl = 0
		const tvlByChainMap: Record<string, number> = {}
		let toggleOptions: Array<{ name: string; key: string }> = []
		let oracleTvs = 0
		const oracleTvsByChainMap: Record<string, number> = {}

		const currentTvlByChain = props.currentTvlByChain ?? {}
		for (const chain in currentTvlByChain) {
			if (isTvlSettingsKey(chain)) {
				const option = tvlOptionsMap.get(chain)
				if (option) {
					toggleOptions.push(option)
				}
				continue
			}

			const [chainName, extraTvlKey] = chain.split('-')

			if (!extraTvlKey) {
				tvlByChainMap[chainName] = (tvlByChainMap[chainName] ?? 0) + currentTvlByChain[chain]
				continue
			}

			const normalizedExtraKey = extraTvlKey.toLowerCase()
			if (isTvlSettingsKey(normalizedExtraKey) && extraTvlsEnabled[normalizedExtraKey]) {
				tvlByChainMap[chainName] = (tvlByChainMap[chainName] ?? 0) + currentTvlByChain[chain]
				continue
			}
		}

		for (const chain in tvlByChainMap) {
			tvl += tvlByChainMap[chain]
		}

		// Process oracle TVS by chain
		const oracleTvsData = props.oracleTvs ?? {}
		for (const chain in oracleTvsData) {
			if (isTvlSettingsKey(chain)) {
				const option = tvlOptionsMap.get(chain)
				if (option) {
					if (!toggleOptions.some((o) => o.key === option.key)) {
						toggleOptions.push(option)
					}
				}
				continue
			}

			const [chainName, extraTvlKey] = chain.split('-')

			if (!extraTvlKey) {
				oracleTvsByChainMap[chainName] = (oracleTvsByChainMap[chainName] ?? 0) + oracleTvsData[chain]
				continue
			}

			const normalizedExtraKey = extraTvlKey.toLowerCase()
			if (isTvlSettingsKey(normalizedExtraKey) && extraTvlsEnabled[normalizedExtraKey]) {
				oracleTvsByChainMap[chainName] = (oracleTvsByChainMap[chainName] ?? 0) + oracleTvsData[chain]
				continue
			}
		}

		for (const chain in oracleTvsByChainMap) {
			oracleTvs += oracleTvsByChainMap[chain]
		}

		if (props.bribeRevenue?.totalAllTime != null) {
			const option = feesOptionsMap.get(FEES_SETTINGS.BRIBES)
			if (option) {
				toggleOptions.push(option)
			}
		}

		if (props.tokenTax?.totalAllTime != null) {
			const option = feesOptionsMap.get(FEES_SETTINGS.TOKENTAX)
			if (option) {
				toggleOptions.push(option)
			}
		}

		return {
			tvl,
			tvlByChain: Object.entries(tvlByChainMap).sort((a, b) => b[1] - a[1]),
			oracleTvs,
			oracleTvsByChain: Object.entries(oracleTvsByChainMap).sort((a, b) => b[1] - a[1]),
			toggleOptions
		}
	}, [extraTvlsEnabled, props.currentTvlByChain, props.oracleTvs, props.bribeRevenue, props.tokenTax])
}

const getPrimaryValueLabelType = (category: string) => {
	switch (category) {
		case 'CEX':
			return { title: 'Total Assets', byChainTitle: 'Total Assets by Chain', dataType: 'TotalAssets' }
		case 'Oracle':
			return { title: 'Total Value Secured', byChainTitle: 'TVS by Chain', dataType: 'TVS' }
		default:
			return { title: 'Total Value Locked', byChainTitle: 'TVL by Chain', dataType: 'TVL' }
	}
}

const PrimaryValue = ({
	hasTvl,
	value,
	name,
	category,
	formatPrice,
	valueByChain
}: {
	hasTvl: boolean
	value: number
	name: string
	category: string
	formatPrice: (value: number | string | null) => string | number | null
	valueByChain?: [string, number][]
}) => {
	if (!hasTvl) return null

	const { title, byChainTitle, dataType } = getPrimaryValueLabelType(category)

	if (!valueByChain || valueByChain.length === 0) {
		return (
			<p className="flex flex-col">
				<span className="flex flex-nowrap items-center gap-2">
					<span>{title}</span>
					<Flag
						protocol={name}
						dataType={dataType}
						isLending={category === 'Lending'}
						className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
					/>
				</span>
				<span className="min-h-8 font-jetbrains text-2xl font-semibold" suppressHydrationWarning>
					{formatPrice(value)}
				</span>
			</p>
		)
	}

	return (
		<details className="group">
			<summary className="flex flex-col">
				<span className="flex flex-nowrap items-center gap-2">
					<span className="text-(--text-label)">{title}</span>
					<Flag
						protocol={name}
						dataType={dataType}
						isLending={category === 'Lending'}
						className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
					/>
				</span>
				<span className="flex flex-nowrap items-center gap-2">
					<span className="min-h-8 font-jetbrains text-2xl font-semibold" suppressHydrationWarning>
						{formatPrice(value)}
					</span>
					<Icon
						name="chevron-down"
						height={16}
						width={16}
						className="relative top-0.5 transition-transform duration-100 group-open:rotate-180"
					/>
				</span>
			</summary>
			<div className="my-3 flex max-h-[50dvh] flex-col overflow-auto">
				<h2 className="font-semibold">{byChainTitle}</h2>
				{valueByChain.map(([chain, tvl]) => (
					<p
						key={`${chain}-${tvl}-${name}`}
						className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] py-1 group-last:border-none dark:border-[#222224]"
					>
						<span className="text-(--text-label)">{chain}</span>
						<span className="font-jetbrains">{formatPrice(tvl)}</span>
					</p>
				))}
			</div>
		</details>
	)
}

interface IKeyMetricsProps extends IProtocolOverviewPageData {
	formatPrice: (value: number | string | null) => string | number | null
	tvl?: number
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

function getAdjustedTotals(
	base:
		| { total24h?: number | null; total7d?: number | null; total30d?: number | null; totalAllTime?: number | null }
		| null
		| undefined,
	bribeRevenue:
		| { total24h?: number | null; total7d?: number | null; total30d?: number | null; totalAllTime?: number | null }
		| null
		| undefined,
	tokenTax:
		| { total24h?: number | null; total7d?: number | null; total30d?: number | null; totalAllTime?: number | null }
		| null
		| undefined,
	extraTvlsEnabled: Record<string, boolean>
) {
	const exists = base?.totalAllTime != null || bribeRevenue?.totalAllTime != null || tokenTax?.totalAllTime != null
	if (!exists) return null

	const b24h = extraTvlsEnabled.bribes ? bribeRevenue?.total24h : 0
	const b7d = extraTvlsEnabled.bribes ? bribeRevenue?.total7d : 0
	const b30d = extraTvlsEnabled.bribes ? bribeRevenue?.total30d : 0
	const bAll = extraTvlsEnabled.bribes ? bribeRevenue?.totalAllTime : 0
	const t24h = extraTvlsEnabled.tokentax ? tokenTax?.total24h : 0
	const t7d = extraTvlsEnabled.tokentax ? tokenTax?.total7d : 0
	const t30d = extraTvlsEnabled.tokentax ? tokenTax?.total30d : 0
	const tAll = extraTvlsEnabled.tokentax ? tokenTax?.totalAllTime : 0

	return {
		total24h: (base?.total24h ?? 0) + (b24h ?? 0) + (t24h ?? 0),
		total7d: (base?.total7d ?? 0) + (b7d ?? 0) + (t7d ?? 0),
		total30d: (base?.total30d ?? 0) + (b30d ?? 0) + (t30d ?? 0),
		totalAllTime: (base?.totalAllTime ?? 0) + (bAll ?? 0) + (tAll ?? 0)
	}
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
					<p className="group flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
						<span className="text-(--text-label)">Staked</span>
						<Flag
							protocol={props.name}
							dataType="Staked"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
						{props.tokenCGData?.marketCap?.current ? (
							<span className="flex items-center gap-1">
								<span className="font-jetbrains">{props.formatPrice(props.currentTvlByChain.staking)}</span>
								<span className="text-xs text-(--text-label)">
									({formattedNum((props.currentTvlByChain.staking / props.tokenCGData.marketCap.current) * 100)}% of
									mcap)
								</span>
							</span>
						) : (
							<span className="font-jetbrains">{props.formatPrice(props.currentTvlByChain.staking)}</span>
						)}
					</p>
				) : null}
				{props.currentTvlByChain?.borrowed != null ? (
					<p className="group flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
						<span className="text-(--text-label)">Borrowed</span>
						<Flag
							protocol={props.name}
							dataType="Borrowed"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
						<span className="font-jetbrains">{props.formatPrice(props.currentTvlByChain.borrowed)}</span>
					</p>
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

const Articles = (props: IProtocolOverviewPageData) => {
	if (!props.articles?.length) return null

	return (
		<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<div className="flex items-center justify-between">
				<SectionHeader id="dl-news">Latest from DL News</SectionHeader>
				<a href="https://www.dlnews.com">
					<svg width={72} height={18}>
						<use href={`/assets/dlnews.svg#dlnews-logo`} />
					</svg>
				</a>
			</div>

			{props.articles.map((article) => (
				<a
					key={`news_card_${article.href}`}
					href={article.href}
					target="_blank"
					rel="noreferrer noopener"
					className="flex flex-col gap-3 rounded-md bg-(--btn2-bg) p-2 hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
				>
					{article.imgSrc ? (
						<img
							className="h-[100px] w-full shrink-0 rounded-sm object-cover"
							src={article.imgSrc}
							alt={article.headline}
						/>
					) : null}
					<div className="flex flex-col justify-between gap-3">
						<p className="text-sm font-medium break-keep whitespace-pre-wrap">{article.headline}</p>
						<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
							<p className="text-xs">{dayjs.utc(article.date).format('MMMM D, YYYY')}</p>
							<p className="flex flex-nowrap items-center justify-between rounded-md font-semibold">
								<span>Read on DL News</span> <Icon name="arrow-up-right" height={14} width={14} />
							</p>
						</div>
					</div>
				</a>
			))}
		</div>
	)
}

function TVL(props: IKeyMetricsProps) {
	const { tvl, tvlByChain } = useFinalTVL(props)

	const metrics = useMemo(() => {
		const metrics = []
		metrics.push({
			name: 'Total Value Locked',
			tooltipContent: "Total value locked in protocol's smart contracts",
			value: tvl
		})

		for (const [chain, tvl] of tvlByChain) {
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
				value: data.emissions30d * 12.2
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
				value: data.total30d * 12.2
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
			value: earnings30d * 12.2
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
		const timestamp = new Date(+item.date * 1000).getTime()

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
			<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
				{data[0].tooltipContent ? (
					<Tooltip content={data[0].tooltipContent} className="text-(--text-label) underline decoration-dotted">
						{data[0].name}
					</Tooltip>
				) : (
					<span className="text-(--text-label)">{data[0].name}</span>
				)}
				<Flag
					protocol={protocolName}
					dataType={dataType}
					isLending={category === 'Lending'}
					className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
				<span className="ml-auto font-jetbrains">{formatPrice(data[0].value)}</span>
			</p>
		)
	}

	return (
		<details className="group" open={openSmolStatsSummaryByDefault}>
			<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
				<span
					title={data[0].tooltipContent ?? undefined}
					className={`text-(--text-label)${data[0].tooltipContent ? ' underline decoration-dotted' : ''}`}
				>
					{data[0].name}
				</span>
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
				/>
				<Flag
					protocol={protocolName}
					dataType={dataType}
					isLending={category === 'Lending'}
					className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
				<span className="ml-auto font-jetbrains">{formatPrice(data[0].value)}</span>
			</summary>
			<div className="mb-3 flex flex-col">
				{restOfData.map((metric) => (
					<p
						className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none"
						key={`${metric.name}-${metric.value}-${protocolName}`}
					>
						{metric.tooltipContent ? (
							<Tooltip content={metric.tooltipContent} className="text-(--text-label) underline decoration-dotted">
								{metric.name}
							</Tooltip>
						) : (
							<span className="text-(--text-label)">{metric.name}</span>
						)}
						<span className="ml-auto font-jetbrains">{formatPrice(metric.value)}</span>
					</p>
				))}
			</div>
		</details>
	)
}

// ============================================
// Info Sections
// ============================================

function Users(props: IProtocolOverviewPageData) {
	const users = props.users
	if (!users) return null

	return (
		<div>
			<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
				<h2 className="mr-auto font-semibold underline decoration-dotted">
					<Tooltip
						content="This only counts users that interact with protocol directly (so not through another contract, such as a DEX aggregator), and only on arbitrum, avax, bsc, ethereum, xdai, optimism, polygon."
						className="mr-auto font-semibold underline decoration-dotted"
					>
						User Activity
					</Tooltip>
				</h2>
				<div className="flex flex-col">
					{users.activeUsers != null && (
						<MetricRow label="Active Addresses (24h)" value={formattedNum(users.activeUsers, false)} />
					)}
					{users.newUsers != null && (
						<MetricRow label="New Addresses (24h)" value={formattedNum(users.newUsers, false)} />
					)}
					{users.transactions != null && (
						<MetricRow label="Transactions (24h)" value={formattedNum(users.transactions, false)} />
					)}
					{users.gasUsd != null && <MetricRow label="Gas Used (24h)" value={formattedNum(users.gasUsd, true)} />}
				</div>
			</div>
		</div>
	)
}

const Treasury = (props: IProtocolOverviewPageData) => {
	if (!props.treasury) return null
	return (
		<MetricSection
			title="Treasury"
			value={formattedNum(props.treasury.total, true)}
			dataType="Treasury"
			protocolName={props.name}
			category={props.category ?? ''}
		>
			{props.treasury.majors && (
				<MetricRow
					label={
						<Tooltip content="BTC, ETH" className="underline decoration-dotted">
							Majors
						</Tooltip>
					}
					value={formattedNum(props.treasury.majors, true)}
				/>
			)}
			{props.treasury.stablecoins && (
				<MetricRow label="Stablecoins" value={formattedNum(props.treasury.stablecoins, true)} />
			)}
			{props.treasury.ownTokens && (
				<MetricRow label="Own Tokens" value={formattedNum(props.treasury.ownTokens, true)} />
			)}
			{props.treasury.others && <MetricRow label="Others" value={formattedNum(props.treasury.others, true)} />}
		</MetricSection>
	)
}

const Expenses = (props: IKeyMetricsProps) => {
	if (!props.expenses) return null
	return (
		<MetricSection
			title="Annual Operational Expenses"
			value={props.formatPrice(props.expenses.total)}
			dataType="Expenses"
			protocolName={props.name}
			category={props.category ?? ''}
		>
			<MetricRow label="Headcount" value={formattedNum(props.expenses.headcount)} />
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
			title={
				<Tooltip
					content="Sum of value locked in DEX pools that include that token across all DEXs for which DefiLlama tracks pool data."
					className="text-(--text-label) underline decoration-dotted"
				>
					{`${props.token?.symbol ? `$${props.token.symbol}` : 'Token'} Liquidity`}
				</Tooltip>
			}
			value={formattedNum(props.tokenLiquidity.total, true)}
			dataType="Token Liquidity"
			protocolName={props.name}
			category={props.category ?? ''}
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
				<p className="group flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
					<span className="text-(--text-label)">Market Cap</span>
					<Flag
						protocol={props.name}
						dataType="Market Cap"
						isLending={props.category === 'Lending'}
						className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
					/>
					<span className="font-jetbrains">{props.formatPrice(props.tokenCGData.marketCap.current)}</span>
				</p>
			) : null}
			{props.tokenCGData?.price?.current ? (
				props.tokenCGData.price.ath || props.tokenCGData.price.atl ? (
					<details className="group">
						<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
							<span className="text-(--text-label)">{`${props.token?.symbol ? `$${props.token.symbol}` : 'Token'} Price`}</span>
							<Icon
								name="chevron-down"
								height={16}
								width={16}
								className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
							/>
							<Flag
								protocol={props.name}
								dataType="Token Price"
								isLending={props.category === 'Lending'}
								className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
							/>
							<span className="ml-auto font-jetbrains">{props.formatPrice(props.tokenCGData.price.current)}</span>
						</summary>
						<div className="mb-3 flex flex-col">
							<MetricRow label="All Time High" value={props.formatPrice(props.tokenCGData.price.ath)} />
							<MetricRow label="All Time Low" value={props.formatPrice(props.tokenCGData.price.atl)} />
						</div>
					</details>
				) : (
					<p className="group flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
						<span className="text-(--text-label)">{`${props.token?.symbol ? `$${props.token.symbol}` : 'Token'} Price`}</span>
						<Flag
							protocol={props.name}
							dataType="Token Price"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
						<span className="font-jetbrains">{props.formatPrice(props.tokenCGData.price.current)}</span>
					</p>
				)
			) : null}
			{props.tokenCGData?.fdv?.current ? (
				<p className="group flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
					<Tooltip
						className="text-(--text-label) underline decoration-dotted"
						content={`Fully Diluted Valuation, this is calculated by taking the expected maximum supply of the token and multiplying it by the price. It's mainly used to calculate the hypothetical marketcap of the token if all the tokens were unlocked and circulating.\n\nData for this metric is imported directly from coingecko.`}
					>
						Fully Diluted Valuation
					</Tooltip>
					<Flag
						protocol={props.name}
						dataType="FDV"
						isLending={props.category === 'Lending'}
						className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
					/>
					<span className="font-jetbrains">{props.formatPrice(props.tokenCGData.fdv.current)}</span>
				</p>
			) : null}
			{props.outstandingFDV ? (
				<p className="group flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
					<Tooltip
						className="text-(--text-label) underline decoration-dotted"
						content={`Outstanding FDV is calculated by taking the outstanding supply of the token and multiplying it by the price.\n\nOutstanding supply is the total supply minus the supply that is not yet allocated to anything (eg coins in treasury or reserve).`}
					>
						Outstanding FDV
					</Tooltip>
					<Flag
						protocol={props.name}
						dataType="Outstanding FDV"
						isLending={props.category === 'Lending'}
						className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
					/>
					<span className="font-jetbrains">{props.formatPrice(props.outstandingFDV)}</span>
				</p>
			) : null}
			{props.tokenCGData.volume24h?.total ? (
				<details className="group">
					<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
						<span className="text-(--text-label)">{`${props.token?.symbol ? `$${props.token.symbol}` : 'Token'} Volume 24h`}</span>
						<Icon
							name="chevron-down"
							height={16}
							width={16}
							className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
						/>
						<Flag
							protocol={props.name}
							dataType="Token Volume"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
						<span className="ml-auto font-jetbrains">{props.formatPrice(props.tokenCGData.volume24h.total)}</span>
					</summary>
					<div className="mb-3 flex flex-col">
						<MetricRow
							label="CEX Volume"
							value={props.tokenCGData.volume24h.cex ? props.formatPrice(props.tokenCGData.volume24h.cex) : '-'}
						/>
						<p className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] py-1 group-last:border-none dark:border-[#222224]">
							<span className="text-(--text-label)">DEX Volume</span>
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
						</p>
					</div>
				</details>
			) : null}
		</>
	)
}

const Raises = (props: IProtocolOverviewPageData) => {
	if (!props.raises) return null
	return (
		<MetricSection
			title="Total Raised"
			value={formattedNum(props.raises.reduce((sum, r) => sum + Number(r.amount), 0) * 1_000_000, true)}
			dataType="Raises"
			protocolName={props.name}
			category={props.category ?? ''}
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

const AdditionalInfo = (props: IProtocolOverviewPageData) => {
	const cardsToStackOnLeft =
		(props.fees?.childMethodologies?.length ? 1 : 0) +
		(props.revenue?.childMethodologies?.length ? 1 : 0) +
		(props.holdersRevenue?.childMethodologies?.length ? 1 : 0)

	if (cardsToStackOnLeft === 3) {
		return (
			<div className="col-span-full grid grid-cols-1 gap-2 xl:grid-cols-2">
				<div className="col-span-1 flex flex-col gap-2">
					<ProtocolInfo {...props} />
					<Articles {...props} />
					<Yields {...props} />
					<Users {...props} />
				</div>
				<Methodology {...props} />
				<Hacks {...props} />
				<Competitors {...props} />
			</div>
		)
	}

	return (
		<div className="col-span-full grid grid-cols-1 gap-2 min-[1536px]:grid-cols-3 min-[1792px]:grid-cols-3 xl:grid-cols-2">
			<ProtocolInfo {...props} />
			<Articles {...props} />
			<Methodology {...props} />
			<Yields {...props} />
			<Users {...props} />
			<Hacks {...props} />
			<Competitors {...props} />
		</div>
	)
}

const ProtocolInfo = (props: IProtocolOverviewPageData) => {
	return (
		<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<SectionHeader id="protocol-information">
				{props.isCEX ? 'Exchange Information' : 'Protocol Information'}
			</SectionHeader>
			{props.description ? <p>{props.description}</p> : null}
			{props.category ? (
				<p className="flex items-center gap-1">
					<span>Category:</span>
					<BasicLink href={`/protocols/${slug(props.category)}`} className="hover:underline">
						{props.category}
					</BasicLink>
				</p>
			) : null}
			{props.tags?.length ? <p className="flex items-center gap-1">Sub Category: {props.tags.join(', ')}</p> : null}

			{props.audits ? (
				<>
					<p className="flex items-center gap-1">
						<span className="flex flex-nowrap items-center gap-1">
							<span>Audits</span>
							<QuestionHelper text="Audits are not a security guarantee" />
							<span>:</span>
						</span>
						{props.audits.auditLinks.length > 0 ? (
							<Menu
								name="Yes"
								options={props.audits.auditLinks}
								isExternal
								className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
							/>
						) : (
							<span>No</span>
						)}
					</p>
					{props.audits.note ? <p>Audit Note: {props.audits.note}</p> : null}
				</>
			) : null}
			<div className="flex flex-wrap gap-2">
				{props.website ? (
					<a
						href={props.website}
						className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icon name="earth" className="h-3 w-3" />
						<span>Website</span>
					</a>
				) : null}
				{props.github?.length
					? props.github.map((github) => (
							<a
								href={`https://github.com/${github}`}
								className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
								target="_blank"
								rel="noopener noreferrer"
								key={`${props.name}-github-${github}`}
							>
								<Icon name="github" className="h-3 w-3" />
								<span>{props.github?.length === 1 ? 'GitHub' : github}</span>
							</a>
						))
					: null}
				{props.twitter ? (
					<a
						href={`https://x.com/${props.twitter}`}
						className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icon name="twitter" className="h-3 w-3" />
						<span>Twitter</span>
					</a>
				) : null}
				{props.safeHarbor ? (
					<a
						href={`https://safeharbor.securityalliance.org/database/${slug(props.name)}`}
						className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
						target="_blank"
						rel="noopener noreferrer"
					>
						Safe Harbor Agreement
					</a>
				) : null}
			</div>
		</div>
	)
}

const Methodology = (props: IProtocolOverviewPageData) => {
	return (
		<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<SectionHeader id="methodology">Methodology</SectionHeader>
			{!props.oracleTvs && props.methodologyURL ? (
				<a href={props.methodologyURL} target="_blank" rel="noopener noreferrer" className="hover:underline">
					<span className="font-medium">{props.isCEX ? 'Total Assets:' : 'TVL:'}</span>{' '}
					<span>{props.methodology ?? ''}</span>
					<span className="relative top-0.5 left-1 inline-block">
						<Icon name="external-link" className="h-3.5 w-3.5" />
						<span className="sr-only">View code on GitHub</span>
					</span>
				</a>
			) : !props.oracleTvs && props.methodology ? (
				<p>
					<span className="font-medium">{props.isCEX ? 'Total Assets:' : 'TVL:'}</span>{' '}
					<span>{props.methodology ?? ''}</span>
				</p>
			) : null}
			{props.oracleTvs && props.methodologyURL ? (
				<a href={props.methodologyURL} target="_blank" rel="noopener noreferrer" className="hover:underline">
					<span className="font-medium">TVS:</span>{' '}
					<span>Total value secured by an oracle, where oracle failure would lead to a loss equal to TVS</span>
					<span className="relative top-0.5 left-1 inline-block">
						<Icon name="external-link" className="h-3.5 w-3.5" />
						<span className="sr-only">View code on GitHub</span>
					</span>
				</a>
			) : props.oracleTvs ? (
				<p>
					<span className="font-medium">TVS:</span>{' '}
					<span>Total value secured by an oracle, where oracle failure would lead to a loss equal to TVS</span>
				</p>
			) : null}
			<MethodologyByAdapter adapter={props.fees} title="Fees" />
			<MethodologyByAdapter adapter={props.revenue} title="Revenue" />
			<MethodologyByAdapter adapter={props.holdersRevenue} title="Holders Revenue" />
			<MethodologyByAdapter adapter={props.bribeRevenue} title="Bribe Revenue" />
			<MethodologyByAdapter adapter={props.tokenTax} title="Token Tax" />
			<MethodologyByAdapter adapter={props.dexVolume} title="DEX Volume" />
			<MethodologyByAdapter adapter={props.dexAggregatorVolume} title="DEX Aggregator Volume" />
			<MethodologyByAdapter adapter={props.perpVolume} title="Perp Volume" />
			<MethodologyByAdapter adapter={props.perpAggregatorVolume} title="Perp Aggregator Volume" />
			<MethodologyByAdapter adapter={props.bridgeAggregatorVolume} title="Bridge Aggregator Volume" />
			<MethodologyByAdapter adapter={props.optionsPremiumVolume} title="Options Premium Volume" />
			<MethodologyByAdapter adapter={props.optionsNotionalVolume} title="Options Notional Volume" />
			{props.incentives?.methodology ? (
				<>
					<p>
						<span className="font-medium">Incentives:</span> <span>{props.incentives.methodology}</span>
					</p>
					{props.revenue ? (
						<p>
							<span className="font-medium">Earnings:</span>{' '}
							<span>Revenue of the protocol minus the incentives distributed to users</span>
						</p>
					) : null}
				</>
			) : null}
		</div>
	)
}

const MethodologyByAdapter = ({
	adapter,
	title
}: {
	adapter: IProtocolOverviewPageData['fees'] | null
	title: string
}) => {
	if (adapter?.childMethodologies?.length) {
		return (
			<div className="flex flex-col">
				<h3 className="font-medium">{title}:</h3>
				<div className="flex flex-col gap-0.5 text-(--text-label)">
					{adapter.childMethodologies.map((child) =>
						child[1] ? (
							child[2] ? (
								<a
									key={`${title}-${child[0]}-${child[1] ?? ''}-${child[2] ?? ''}`}
									href={child[2]}
									target="_blank"
									rel="noopener noreferrer"
									className="hover:underline"
								>
									<span>{child[0]} - </span> <span>{child[1]}</span>
									{child[2] ? (
										<span className="relative top-0.5 left-1 inline-block">
											<Icon name="external-link" className="h-3.5 w-3.5" />
											<span className="sr-only">View code on GitHub</span>
										</span>
									) : null}
								</a>
							) : (
								<p key={`${title}-${child[0]}-${child[1] ?? ''}`}>
									{child[0]}: {child[1]}
								</p>
							)
						) : null
					)}
				</div>
			</div>
		)
	}

	return (
		<>
			{adapter?.methodology || adapter?.methodologyURL ? (
				adapter?.methodologyURL ? (
					<a href={adapter.methodologyURL} target="_blank" rel="noopener noreferrer" className="hover:underline">
						<span className="font-medium">{title}:</span>{' '}
						{adapter.methodology ? <span>{adapter.methodology}</span> : null}
						{adapter.methodologyURL ? (
							<span className="relative top-0.5 left-1 inline-block">
								<Icon name="external-link" className="h-3.5 w-3.5" />
								<span className="sr-only">View code on GitHub</span>
							</span>
						) : null}
					</a>
				) : (
					<p>
						<span className="font-medium">{title}:</span> <span>{adapter?.methodology}</span>
					</p>
				)
			) : null}
		</>
	)
}

function Yields(props: IProtocolOverviewPageData) {
	const yields = props.yields
	if (!yields) return null
	const averageApy = yields.averageAPY == null ? '-' : `${formattedNum(yields.averageAPY, false)}%`
	return (
		<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<SectionHeader id="yields">Yields</SectionHeader>
			<div>
				<MetricRow label="Pools Tracked" value={yields.noOfPoolsTracked} />
				<MetricRow label="Average APY" value={averageApy} />
			</div>
			<BasicLink
				href={`/yields?project=${props.otherProtocols ? props.otherProtocols.slice(1).join('&project=') : props.name}`}
				className="mr-auto flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
			>
				<span>View all Yields</span>
				<Icon name="arrow-right" className="h-4 w-4" />
			</BasicLink>
		</div>
	)
}

const Hacks = (props: IProtocolOverviewPageData) => {
	if (!props.hacks?.length) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<SectionHeader id="hacks">Hacks</SectionHeader>
			<div className="flex flex-col">
				{props.hacks.map((hack) => (
					<div
						key={`${props.name}-hack-${hack.date}`}
						className="flex flex-col gap-1 border-b border-(--cards-border) py-2 first:pt-0 last:border-none last:pb-0"
					>
						{hack.date ? (
							<p>
								<span>Date: </span>
								<span>{dayjs.utc(hack.date * 1e3).format('MMM D, YYYY')}</span>
							</p>
						) : null}
						{props.id.startsWith('parent#') ? (
							<p>
								<span>Protocol: </span>
								<span>{hack.name}</span>
							</p>
						) : null}
						{hack.amount ? (
							<p>
								<span>Amount: </span>
								<span>{formattedNum(hack.amount, true)}</span>
							</p>
						) : null}
						{hack.classification ? <p>Classification: {hack.classification}</p> : null}
						{hack.technique ? <p>Technique: {hack.technique}</p> : null}
						{hack.chain?.length ? (
							<p>
								<span>Chains: </span>
								<span>{hack.chain.join(', ')}</span>
							</p>
						) : null}
						{hack.bridgeHack ? <p>Bridge Hack</p> : null}
						{hack.language ? <p>Language: {hack.language}</p> : null}
						{hack.targetType ? (
							<p>
								<span>Target Type: </span>
								<span>{hack.targetType}</span>
							</p>
						) : null}
						{hack.returnedFunds ? (
							<p>
								<span>Returned Funds: </span>
								<span>{formattedNum(hack.returnedFunds, true)}</span>
							</p>
						) : null}
						{hack.source ? (
							<a
								href={hack.source}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1 underline"
							>
								<span>Source</span>
								<Icon name="external-link" className="h-3.5 w-3.5" />
							</a>
						) : null}
					</div>
				))}
			</div>
		</div>
	)
}

const Competitors = (props: IProtocolOverviewPageData) => {
	const competitors = props.competitors ?? EMPTY_COMPETITORS
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })
	const { isAuthenticated, hasActiveSubscription, loaders } = useAuthContext()
	const baseChartForComparison = useMemo(
		() =>
			props.isCEX
				? (props.initialMultiSeriesChartData['Total Assets'] ?? props.initialMultiSeriesChartData['TVL'] ?? [])
				: (props.initialMultiSeriesChartData['TVL'] ?? []),
		[props.initialMultiSeriesChartData, props.isCEX]
	)
	const comparisonHref = useMemo(() => {
		const latestTvl = baseChartForComparison[baseChartForComparison.length - 1]?.[1]
		const entries = [
			{
				slug: slug(props.name),
				tvl: typeof latestTvl === 'number' ? latestTvl : 0
			},
			...competitors.map((similarProtocol) => ({
				slug: slug(similarProtocol.name),
				tvl: typeof similarProtocol.tvl === 'number' ? similarProtocol.tvl : 0
			}))
		]
		const bySlug = new Map<string, number>()
		for (const entry of entries) {
			const prev = bySlug.get(entry.slug)
			if (prev === undefined || entry.tvl > prev) {
				bySlug.set(entry.slug, entry.tvl)
			}
		}
		const slugs = Array.from(bySlug, ([itemSlug, tvl]) => ({ slug: itemSlug, tvl }))
			.sort((a, b) => b.tvl - a.tvl)
			.slice(0, 10)
			.map((item) => item.slug)
		if (slugs.length === 0) return null
		const params = new URLSearchParams({
			comparison: 'protocols',
			items: slugs.join(','),
			step: 'select-metrics'
		})
		return `/pro?${params.toString()}`
	}, [baseChartForComparison, competitors, props.name])
	const canOpenComparison = !loaders.userLoading && isAuthenticated && hasActiveSubscription
	if (competitors.length === 0) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<div className="flex items-center justify-between gap-2">
				<SectionHeader id="competitors">Competitors</SectionHeader>
				{comparisonHref ? (
					<BasicLink
						href={comparisonHref}
						onClick={(event) => {
							if (canOpenComparison) return
							event.preventDefault()
							subscribeModalStore.show()
						}}
						className="rounded-md border border-(--primary) px-2 py-1.5 text-xs text-(--primary) hover:bg-(--primary)/10 focus-visible:bg-(--primary)/10"
					>
						Create comparison dashboard
					</BasicLink>
				) : null}
			</div>
			<div className="flex flex-wrap items-center gap-4">
				{competitors.map((similarProtocol) => (
					<a
						href={`/protocol/${slug(similarProtocol.name)}`}
						key={`${props.name}-competitors-${similarProtocol.name}`}
						target="_blank"
						rel="noopener noreferrer"
						className="underline"
					>{`${similarProtocol.name}${similarProtocol.tvl ? ` (${formattedNum(similarProtocol.tvl, true)})` : ''}`}</a>
				))}
			</div>
			{shouldRenderModal ? (
				<Suspense fallback={<></>}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
			) : null}
		</div>
	)
}

// unlocks
// governance
// % change tvl, mcap, token price, etc.
