import { lazy, Suspense, useMemo } from 'react'
import { useRouter } from 'next/router'
import dayjs from 'dayjs'
import { useGetTokenPrice } from '~/api/categories/protocols/client'
import { Bookmark } from '~/components/Bookmark'
import { feesOptionsMap, tvlOptionsMap } from '~/components/Filters/options'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Menu } from '~/components/Menu'
import { QuestionHelper } from '~/components/QuestionHelper'
import { LinkPreviewCard } from '~/components/SEO'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { DEFI_SETTINGS_KEYS_SET, FEES_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { definitions } from '~/public/definitions'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import { ProtocolChart } from './Chart/ProtocolChart'
import { Flag } from './Flag'
import { ProtocolOverviewLayout } from './Layout'
import { IProtocolOverviewPageData } from './types'

const IncomeStatement = lazy(() => import('./IncomeStatement').then((module) => ({ default: module.IncomeStatement })))

export const ProtocolOverview = (props: IProtocolOverviewPageData) => {
	const router = useRouter()

	const { tvl, tvlByChain, oracleTvs, oracleTvsByChain, toggleOptions } = useFinalTVL(props)

	const { data: chainPrice, isLoading: fetchingChainPrice } = useGetTokenPrice(props.chartDenominations?.[1]?.geckoId)

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
			category={props.category}
			otherProtocols={props.otherProtocols}
			toggleOptions={toggleOptions}
			metrics={props.metrics}
			warningBanners={props.warningBanners}
			tab="information"
			seoDescription={props.seoDescription}
			seoKeywords={props.seoKeywords}
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
					<h1 className="flex flex-wrap items-center gap-2 text-xl *:last:ml-auto">
						<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
						<span className="font-bold">
							{props.name ? props.name + `${props.deprecated ? ' (*Deprecated*)' : ''}` + ' ' : ''}
						</span>
						{props.token.symbol && props.token.symbol !== '-' ? (
							<span className="mr-auto font-normal">({props.token.symbol})</span>
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
							category={props.category === 'Oracle' ? null : props.category}
							valueByChain={tvlByChain}
							formatPrice={formatPrice}
						/>
					)}
					<KeyMetrics {...props} formatPrice={formatPrice} />
				</div>
				<div className="col-span-1 grid grid-cols-2 gap-2 xl:col-[2/-1]">
					<div className="col-span-full flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
						<div className="flex flex-col gap-6 xl:hidden">
							<h1 className="flex flex-wrap items-center gap-2 text-xl">
								<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
								<span className="font-bold">
									{props.name ? props.name + `${props.deprecated ? ' (*Deprecated*)' : ''}` + ' ' : ''}
								</span>
								{props.token.symbol && props.token.symbol !== '-' ? (
									<span className="mr-auto font-normal">({props.token.symbol})</span>
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
									category={props.category === 'Oracle' ? null : props.category}
									valueByChain={tvlByChain}
									formatPrice={formatPrice}
								/>
							)}
						</div>
						<ProtocolChart {...props} />
					</div>
					{props.hasKeyMetrics ? (
						<div className="col-span-full flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:hidden">
							<KeyMetrics {...props} formatPrice={formatPrice} />
						</div>
					) : null}
				</div>
				<AdditionalInfo {...props} />
				{props.incomeStatement?.data ? (
					<Suspense fallback={<></>}>
						<IncomeStatement {...props} />
					</Suspense>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}

function useFinalTVL(props: IProtocolOverviewPageData) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	return useMemo(() => {
		let tvl = 0
		const tvlByChainMap = {}
		let toggleOptions = []
		let oracleTvs = 0
		const oracleTvsByChainMap = {}

		for (const chain in props.currentTvlByChain ?? {}) {
			if (DEFI_SETTINGS_KEYS_SET.has(chain)) {
				const option = tvlOptionsMap.get(chain as any)
				if (option && chain !== 'offers') {
					toggleOptions.push(option)
				}
				continue
			}

			const [chainName, extraTvlKey] = chain.split('-')

			if (!extraTvlKey) {
				tvlByChainMap[chainName] = (tvlByChainMap[chainName] ?? 0) + props.currentTvlByChain[chain]
				continue
			}

			if (extraTvlsEnabled[extraTvlKey.toLowerCase()]) {
				tvlByChainMap[chainName] = (tvlByChainMap[chainName] ?? 0) + props.currentTvlByChain[chain]
				continue
			}
		}

		for (const chain in tvlByChainMap) {
			tvl += tvlByChainMap[chain]
		}

		// Process oracle TVS by chain
		for (const chain in props.oracleTvs ?? {}) {
			if (DEFI_SETTINGS_KEYS_SET.has(chain)) {
				const option = tvlOptionsMap.get(chain as any)
				if (option && chain !== 'offers') {
					if (!toggleOptions.some((o) => o.key === option.key)) {
						toggleOptions.push(option)
					}
				}
				continue
			}

			const [chainName, extraTvlKey] = chain.split('-')

			if (!extraTvlKey) {
				oracleTvsByChainMap[chainName] = (oracleTvsByChainMap[chainName] ?? 0) + props.oracleTvs[chain]
				continue
			}

			if (extraTvlsEnabled[extraTvlKey.toLowerCase()]) {
				oracleTvsByChainMap[chainName] = (oracleTvsByChainMap[chainName] ?? 0) + props.oracleTvs[chain]
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
			tvlByChain: Object.entries(tvlByChainMap).sort(
				(a, b) => (b as [string, number])[1] - (a as [string, number])[1]
			) as [string, number][],
			oracleTvs,
			oracleTvsByChain: Object.entries(oracleTvsByChainMap).sort(
				(a, b) => (b as [string, number])[1] - (a as [string, number])[1]
			) as [string, number][],
			toggleOptions
		}
	}, [extraTvlsEnabled, props])
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
				<span className="font-jetbrains min-h-8 text-2xl font-semibold" suppressHydrationWarning>
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
					<span className="font-jetbrains min-h-8 text-2xl font-semibold" suppressHydrationWarning>
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
}

export const KeyMetrics = (props: IKeyMetricsProps) => {
	if (!props.hasKeyMetrics) return null
	return (
		<div className="flex flex-1 flex-col gap-2">
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
			<div className="flex flex-col">
				{props.oracleTvs ? <TVL formatPrice={props.formatPrice} {...props} /> : null}
				<Fees formatPrice={props.formatPrice} {...props} />
				<Revenue formatPrice={props.formatPrice} {...props} />
				<HoldersRevenue formatPrice={props.formatPrice} {...props} />
				<Incentives formatPrice={props.formatPrice} {...props} />
				<Earnings formatPrice={props.formatPrice} {...props} />
				<DexVolume formatPrice={props.formatPrice} {...props} />
				<DexAggregatorVolume formatPrice={props.formatPrice} {...props} />
				<PerpVolume formatPrice={props.formatPrice} {...props} />
				<OpenInterest formatPrice={props.formatPrice} {...props} />
				<PerpAggregatorVolume formatPrice={props.formatPrice} {...props} />
				<BridgeAggregatorVolume formatPrice={props.formatPrice} {...props} />
				<BridgeVolume formatPrice={props.formatPrice} {...props} />
				<OptionsPremiumVolume formatPrice={props.formatPrice} {...props} />
				<OptionsNotionalVolume formatPrice={props.formatPrice} {...props} />
				<TokenCGData formatPrice={props.formatPrice} {...props} />
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
				<h2 className="group relative flex items-center gap-1 text-base font-semibold" id="dl-news">
					Latest from DL News
					<a
						aria-hidden="true"
						tabIndex={-1}
						href="#dl-news"
						className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
					/>
					<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
				</h2>
				<a href="https://www.dlnews.com">
					<svg width={72} height={18}>
						<use href={`/icons/dlnews.svg#dlnews-logo`} />
					</svg>
				</a>
			</div>

			{props.articles.map((article, idx) => (
				<a
					key={`news_card_${idx}`}
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

function Fees(props: IKeyMetricsProps) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const fees = props.fees
	const bribeRevenue = props.bribeRevenue
	const tokenTax = props.tokenTax
	const feesExists = fees?.totalAllTime != null || bribeRevenue?.totalAllTime != null || tokenTax?.totalAllTime != null

	if (!feesExists) return null

	const bribeRevenue24h = extraTvlsEnabled.bribes ? bribeRevenue?.total24h : 0
	const bribeRevenue7d = extraTvlsEnabled.bribes ? bribeRevenue?.total7d : 0
	const bribeRevenue30d = extraTvlsEnabled.bribes ? bribeRevenue?.total30d : 0
	const bribeRevenueAllTime = extraTvlsEnabled.bribes ? bribeRevenue?.totalAllTime : 0
	const tokenTax24h = extraTvlsEnabled.tokentax ? tokenTax?.total24h : 0
	const tokenTax7d = extraTvlsEnabled.tokentax ? tokenTax?.total7d : 0
	const tokenTax30d = extraTvlsEnabled.tokentax ? tokenTax?.total30d : 0
	const tokenTaxAllTime = extraTvlsEnabled.tokentax ? tokenTax?.totalAllTime : 0

	const fees24h = feesExists ? (fees?.total24h ?? 0) + (bribeRevenue24h ?? 0) + (tokenTax24h ?? 0) : null
	const fees7d = feesExists ? (fees?.total7d ?? 0) + (bribeRevenue7d ?? 0) + (tokenTax7d ?? 0) : null
	const fees30d = feesExists ? (fees?.total30d ?? 0) + (bribeRevenue30d ?? 0) + (tokenTax30d ?? 0) : null
	const feesAllTime = feesExists
		? (fees?.totalAllTime ?? 0) + (bribeRevenueAllTime ?? 0) + (tokenTaxAllTime ?? 0)
		: null

	const metrics = []

	if (fees30d != null) {
		metrics.push({
			name: 'Fees (Annualized)',
			tooltipContent: definitions.fees.protocol['annualized'],
			value: fees30d * 12.2
		})

		metrics.push({
			name: 'Fees 30d',
			tooltipContent: definitions.fees.protocol['30d'],
			value: fees30d
		})
	}

	if (fees7d != null) {
		metrics.push({
			name: 'Fees 7d',
			tooltipContent: definitions.fees.protocol['7d'],
			value: fees7d
		})
	}

	if (fees24h != null) {
		metrics.push({
			name: 'Fees 24h',
			tooltipContent: definitions.fees.protocol['24h'],
			value: fees24h
		})
	}

	if (feesAllTime != null) {
		metrics.push({
			name: 'Cumulative Fees',
			tooltipContent: definitions.fees.protocol['cumulative'],
			value: feesAllTime
		})
	}

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

	const revenue = props.revenue
	const bribeRevenue = props.bribeRevenue
	const tokenTax = props.tokenTax
	const revenueExists =
		revenue?.totalAllTime != null || bribeRevenue?.totalAllTime != null || tokenTax?.totalAllTime != null

	if (!revenueExists) return null

	const bribeRevenue24h = extraTvlsEnabled.bribes ? bribeRevenue?.total24h : 0
	const bribeRevenue7d = extraTvlsEnabled.bribes ? bribeRevenue?.total7d : 0
	const bribeRevenue30d = extraTvlsEnabled.bribes ? bribeRevenue?.total30d : 0
	const bribeRevenueAllTime = extraTvlsEnabled.bribes ? bribeRevenue?.totalAllTime : 0
	const tokenTax24h = extraTvlsEnabled.tokentax ? tokenTax?.total24h : 0
	const tokenTax7d = extraTvlsEnabled.tokentax ? tokenTax?.total7d : 0
	const tokenTax30d = extraTvlsEnabled.tokentax ? tokenTax?.total30d : 0
	const tokenTaxAllTime = extraTvlsEnabled.tokentax ? tokenTax?.totalAllTime : 0

	const revenue24h = revenueExists ? (revenue?.total24h ?? 0) + (bribeRevenue24h ?? 0) + (tokenTax24h ?? 0) : null
	const revenue7d = revenueExists ? (revenue?.total7d ?? 0) + (bribeRevenue7d ?? 0) + (tokenTax7d ?? 0) : null
	const revenue30d = revenueExists ? (revenue?.total30d ?? 0) + (bribeRevenue30d ?? 0) + (tokenTax30d ?? 0) : null
	const revenueAllTime = revenueExists
		? (revenue?.totalAllTime ?? 0) + (bribeRevenueAllTime ?? 0) + (tokenTaxAllTime ?? 0)
		: null

	const metrics = []

	if (revenue30d != null) {
		metrics.push({
			name: 'Revenue (Annualized)',
			tooltipContent: definitions.revenue.protocol['annualized'],
			value: revenue30d * 12.2
		})

		metrics.push({
			name: 'Revenue 30d',
			tooltipContent: definitions.revenue.protocol['30d'],
			value: revenue30d
		})
	}

	if (revenue7d != null) {
		metrics.push({
			name: 'Revenue 7d',
			tooltipContent: definitions.revenue.protocol['7d'],
			value: revenue7d
		})
	}

	if (revenue24h != null) {
		metrics.push({
			name: 'Revenue 24h',
			tooltipContent: definitions.revenue.protocol['24h'],
			value: revenue24h
		})
	}

	if (revenueAllTime != null) {
		metrics.push({
			name: 'Cumulative Revenue',
			tooltipContent: definitions.revenue.protocol['cumulative'],
			value: revenueAllTime
		})
	}

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

	const holdersRevenue = props.holdersRevenue
	const bribeRevenue = props.bribeRevenue
	const tokenTax = props.tokenTax
	const holdersRevenueExists =
		holdersRevenue?.totalAllTime != null || bribeRevenue?.totalAllTime != null || tokenTax?.totalAllTime != null

	if (!holdersRevenueExists) return null

	const bribeRevenue24h = extraTvlsEnabled.bribes ? bribeRevenue?.total24h : 0
	const bribeRevenue7d = extraTvlsEnabled.bribes ? bribeRevenue?.total7d : 0
	const bribeRevenue30d = extraTvlsEnabled.bribes ? bribeRevenue?.total30d : 0
	const bribeRevenueAllTime = extraTvlsEnabled.bribes ? bribeRevenue?.totalAllTime : 0
	const tokenTax24h = extraTvlsEnabled.tokentax ? tokenTax?.total24h : 0
	const tokenTax7d = extraTvlsEnabled.tokentax ? tokenTax?.total7d : 0
	const tokenTax30d = extraTvlsEnabled.tokentax ? tokenTax?.total30d : 0
	const tokenTaxAllTime = extraTvlsEnabled.tokentax ? tokenTax?.totalAllTime : 0

	const holdersRevenue24h = holdersRevenueExists
		? (holdersRevenue?.total24h ?? 0) + (bribeRevenue24h ?? 0) + (tokenTax24h ?? 0)
		: null
	const holdersRevenue7d = holdersRevenueExists
		? (holdersRevenue?.total7d ?? 0) + (bribeRevenue7d ?? 0) + (tokenTax7d ?? 0)
		: null
	const holdersRevenue30d = holdersRevenueExists
		? (holdersRevenue?.total30d ?? 0) + (bribeRevenue30d ?? 0) + (tokenTax30d ?? 0)
		: null
	const holdersRevenueAllTime = holdersRevenueExists
		? (holdersRevenue?.totalAllTime ?? 0) + (bribeRevenueAllTime ?? 0) + (tokenTaxAllTime ?? 0)
		: null

	const metrics = []

	if (holdersRevenue30d != null) {
		metrics.push({
			name: 'Holders Revenue (Annualized)',
			tooltipContent: definitions.holdersRevenue.protocol['annualized'],
			value: holdersRevenue30d * 12.2
		})

		metrics.push({
			name: 'Holders Revenue 30d',
			tooltipContent: definitions.holdersRevenue.protocol['30d'],
			value: holdersRevenue30d
		})
	}

	if (holdersRevenue7d != null) {
		metrics.push({
			name: 'Holders Revenue 7d',
			tooltipContent: definitions.holdersRevenue.protocol['7d'],
			value: holdersRevenue7d
		})
	}

	if (holdersRevenue24h != null) {
		metrics.push({
			name: 'Holders Revenue 24h',
			tooltipContent: definitions.holdersRevenue.protocol['24h'],
			value: holdersRevenue24h
		})
	}

	if (holdersRevenueAllTime != null) {
		metrics.push({
			name: 'Cumulative Holders Revenue',
			tooltipContent: definitions.holdersRevenue.protocol['cumulative'],
			value: holdersRevenueAllTime
		})
	}

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

	const metrics = []

	if (props.incentives.emissions30d != null) {
		metrics.push({
			name: 'Incentives (Annualized)',
			tooltipContent: definitions.incentives.protocol['annualized'],
			value: props.incentives.emissions30d * 12.2
		})

		metrics.push({
			name: 'Incentives 30d',
			tooltipContent: definitions.incentives.protocol['30d'],
			value: props.incentives.emissions30d
		})
	}

	if (props.incentives.emissions7d != null) {
		metrics.push({
			name: 'Incentives 7d',
			tooltipContent: definitions.incentives.protocol['7d'],
			value: props.incentives.emissions7d
		})
	}

	if (props.incentives.emissions24h != null) {
		metrics.push({
			name: 'Incentives 24h',
			tooltipContent: definitions.incentives.protocol['24h'],
			value: props.incentives.emissions24h
		})
	}

	if (props.incentives.emissionsAllTime != null) {
		metrics.push({
			name: 'Cumulative Incentives',
			tooltipContent: definitions.incentives.protocol['cumulative'],
			value: props.incentives.emissionsAllTime
		})
	}

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
	const bribeRevenue = props.bribeRevenue
	const tokenTax = props.tokenTax
	const incentivesData = props.incentives

	const bribeRevenue24h = extraTvlsEnabled.bribes ? bribeRevenue?.total24h : 0
	const bribeRevenue7d = extraTvlsEnabled.bribes ? bribeRevenue?.total7d : 0
	const bribeRevenue30d = extraTvlsEnabled.bribes ? bribeRevenue?.total30d : 0
	const bribeRevenueAllTime = extraTvlsEnabled.bribes ? bribeRevenue?.totalAllTime : 0
	const tokenTax24h = extraTvlsEnabled.tokentax ? tokenTax?.total24h : 0
	const tokenTax7d = extraTvlsEnabled.tokentax ? tokenTax?.total7d : 0
	const tokenTax30d = extraTvlsEnabled.tokentax ? tokenTax?.total30d : 0
	const tokenTaxAllTime = extraTvlsEnabled.tokentax ? tokenTax?.totalAllTime : 0

	const revenue24h = revenue?.total24h != null ? revenue.total24h + (bribeRevenue24h ?? 0) + (tokenTax24h ?? 0) : null
	const revenue7d = revenue?.total7d != null ? revenue.total7d + (bribeRevenue7d ?? 0) + (tokenTax7d ?? 0) : null
	const revenue30d = revenue?.total30d != null ? revenue.total30d + (bribeRevenue30d ?? 0) + (tokenTax30d ?? 0) : null
	const revenueAllTime =
		revenue?.totalAllTime != null ? revenue.totalAllTime + (bribeRevenueAllTime ?? 0) + (tokenTaxAllTime ?? 0) : null

	const earnings24h =
		revenue24h != null && incentivesData?.emissions24h != null ? revenue24h - incentivesData.emissions24h : null
	const earnings7d =
		revenue7d != null && incentivesData?.emissions7d != null ? revenue7d - incentivesData.emissions7d : null
	const earnings30d =
		revenue30d != null && incentivesData?.emissions30d != null ? revenue30d - incentivesData.emissions30d : null
	const earningsAllTime =
		revenueAllTime != null && incentivesData?.emissionsAllTime != null
			? revenueAllTime - incentivesData.emissionsAllTime
			: null

	if (!incentivesData && !revenue) return null

	const metrics = []

	if (earnings30d) {
		metrics.push({
			name: 'Earnings (Annualized)',
			tooltipContent: definitions.earnings.protocol['annualized'],
			value: earnings30d * 12.2
		})

		metrics.push({
			name: 'Earnings 30d',
			tooltipContent: definitions.earnings.protocol['30d'],
			value: earnings30d
		})
	}

	if (earnings7d != null) {
		metrics.push({
			name: 'Earnings 7d',
			tooltipContent: definitions.earnings.protocol['7d'],
			value: earnings7d
		})
	}

	if (earnings24h != null) {
		metrics.push({
			name: 'Earnings 24h',
			tooltipContent: definitions.earnings.protocol['24h'],
			value: earnings24h
		})
	}

	if (earningsAllTime != null) {
		metrics.push({
			name: 'Cumulative Earnings',
			tooltipContent: definitions.earnings.protocol['cumulative'],
			value: earningsAllTime
		})
	}

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

function DexVolume(props: IKeyMetricsProps) {
	if (!props.dexVolume) return null

	const metrics = []

	if (props.dexVolume.total30d != null) {
		metrics.push({
			name: 'DEX Volume 30d',
			tooltipContent: definitions.dexs.protocol['30d'],
			value: props.dexVolume.total30d
		})
	}
	if (props.dexVolume.total7d != null) {
		metrics.push({
			name: 'DEX Volume 7d',
			tooltipContent: definitions.dexs.protocol['7d'],
			value: props.dexVolume.total7d
		})
	}
	if (props.dexVolume.total24h != null) {
		metrics.push({
			name: 'DEX Volume 24h',
			tooltipContent: definitions.dexs.protocol['24h'],
			value: props.dexVolume.total24h
		})
	}
	if (props.dexVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative DEX Volume',
			tooltipContent: definitions.dexs.protocol['cumulative'],
			value: props.dexVolume.totalAllTime
		})
	}

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="DEX Volume"
		/>
	)
}

function DexAggregatorVolume(props: IKeyMetricsProps) {
	if (!props.dexAggregatorVolume) return null

	const metrics = []

	if (props.dexAggregatorVolume.total30d != null) {
		metrics.push({
			name: 'DEX Aggregator Volume 30d',
			tooltipContent: definitions.dexAggregators.protocol['30d'],
			value: props.dexAggregatorVolume.total30d
		})
	}
	if (props.dexAggregatorVolume.total7d != null) {
		metrics.push({
			name: 'DEX Aggregator Volume 7d',
			tooltipContent: definitions.dexAggregators.protocol['7d'],
			value: props.dexAggregatorVolume.total7d
		})
	}
	if (props.dexAggregatorVolume.total24h != null) {
		metrics.push({
			name: 'DEX Aggregator Volume 24h',
			tooltipContent: definitions.dexAggregators.protocol['24h'],
			value: props.dexAggregatorVolume.total24h
		})
	}
	if (props.dexAggregatorVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative DEX Aggregator Volume',
			tooltipContent: definitions.dexAggregators.protocol['cumulative'],
			value: props.dexAggregatorVolume.totalAllTime
		})
	}

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="DEX Aggregator Volume"
		/>
	)
}

function PerpVolume(props: IKeyMetricsProps) {
	if (!props.perpVolume) return null

	const metrics = []

	if (props.perpVolume.total30d != null) {
		metrics.push({
			name: 'Perp Volume 30d',
			tooltipContent: definitions.perps.protocol['30d'],
			value: props.perpVolume.total30d
		})
	}
	if (props.perpVolume.total7d != null) {
		metrics.push({
			name: 'Perp Volume 7d',
			tooltipContent: definitions.perps.protocol['7d'],
			value: props.perpVolume.total7d
		})
	}
	if (props.perpVolume.total24h != null) {
		metrics.push({
			name: 'Perp Volume 24h',
			tooltipContent: definitions.perps.protocol['24h'],
			value: props.perpVolume.total24h
		})
	}
	if (props.perpVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative Perp Volume',
			tooltipContent: definitions.perps.protocol['cumulative'],
			value: props.perpVolume.totalAllTime
		})
	}

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Perp Volume"
		/>
	)
}

function OpenInterest(props: IKeyMetricsProps) {
	if (!props.openInterest) return null

	const metrics = []

	if (props.openInterest.total24h != null) {
		metrics.push({
			name: 'Open Interest',
			tooltipContent: definitions.openInterest.protocol,
			value: props.openInterest.total24h
		})
	}

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Open Interest"
		/>
	)
}

function PerpAggregatorVolume(props: IKeyMetricsProps) {
	if (!props.perpAggregatorVolume) return null

	const metrics = []

	if (props.perpAggregatorVolume.total30d != null) {
		metrics.push({
			name: 'Perp Aggregator Volume 30d',
			tooltipContent: definitions.perpsAggregators.protocol['30d'],
			value: props.perpAggregatorVolume.total30d
		})
	}
	if (props.perpAggregatorVolume.total7d != null) {
		metrics.push({
			name: 'Perp Aggregator Volume 7d',
			tooltipContent: definitions.perpsAggregators.protocol['7d'],
			value: props.perpAggregatorVolume.total7d
		})
	}
	if (props.perpAggregatorVolume.total24h != null) {
		metrics.push({
			name: 'Perp Aggregator Volume 24h',
			tooltipContent: definitions.perpsAggregators.protocol['24h'],
			value: props.perpAggregatorVolume.total24h
		})
	}
	if (props.perpAggregatorVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative Perp Aggregator Volume',
			tooltipContent: definitions.perpsAggregators.protocol['cumulative'],
			value: props.perpAggregatorVolume.totalAllTime
		})
	}

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Perp Aggregator Volume"
		/>
	)
}

function BridgeAggregatorVolume(props: IKeyMetricsProps) {
	if (!props.bridgeAggregatorVolume) return null

	const metrics = []

	if (props.bridgeAggregatorVolume.total30d != null) {
		metrics.push({
			name: 'Bridge Aggregator Volume 30d',
			tooltipContent: definitions.bridgeAggregators.protocol['30d'],
			value: props.bridgeAggregatorVolume.total30d
		})
	}
	if (props.bridgeAggregatorVolume.total7d != null) {
		metrics.push({
			name: 'Bridge Aggregator Volume 7d',
			tooltipContent: definitions.bridgeAggregators.protocol['7d'],
			value: props.bridgeAggregatorVolume.total7d
		})
	}
	if (props.bridgeAggregatorVolume.total24h != null) {
		metrics.push({
			name: 'Bridge Aggregator Volume 24h',
			tooltipContent: definitions.bridgeAggregators.protocol['24h'],
			value: props.bridgeAggregatorVolume.total24h
		})
	}
	if (props.bridgeAggregatorVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative Bridge Aggregator Volume',
			tooltipContent: definitions.bridgeAggregators.protocol['cumulative'],
			value: props.bridgeAggregatorVolume.totalAllTime
		})
	}

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Bridge Aggregator Volume"
		/>
	)
}

function BridgeVolume(props: IKeyMetricsProps) {
	if (!props.bridgeVolume || props.bridgeVolume.length === 0) return null

	const metrics = []

	const now = Date.now()
	const oneDayAgo = now - 24 * 60 * 60 * 1000
	const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
	const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

	let total24h = 0
	let total7d = 0
	let total30d = 0
	let totalAllTime = 0

	props.bridgeVolume.forEach((item) => {
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
	})

	if (total30d > 0) {
		metrics.push({
			name: 'Bridge Volume 30d',
			tooltipContent: null,
			value: total30d
		})
	}
	if (total7d > 0) {
		metrics.push({
			name: 'Bridge Volume 7d',
			tooltipContent: null,
			value: total7d
		})
	}
	if (total24h > 0) {
		metrics.push({
			name: 'Bridge Volume 24h',
			tooltipContent: null,
			value: total24h
		})
	}
	if (totalAllTime > 0) {
		metrics.push({
			name: 'Cumulative Bridge Volume',
			tooltipContent: null,
			value: totalAllTime
		})
	}

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

function OptionsPremiumVolume(props: IKeyMetricsProps) {
	if (!props.optionsPremiumVolume) return null

	const metrics = []

	if (props.optionsPremiumVolume.total30d != null) {
		metrics.push({
			name: 'Options Premium Volume 30d',
			tooltipContent: definitions.optionsPremium.protocol['30d'],
			value: props.optionsPremiumVolume.total30d
		})
	}
	if (props.optionsPremiumVolume.total7d != null) {
		metrics.push({
			name: 'Options Premium Volume 7d',
			tooltipContent: definitions.optionsPremium.protocol['7d'],
			value: props.optionsPremiumVolume.total7d
		})
	}
	if (props.optionsPremiumVolume.total24h != null) {
		metrics.push({
			name: 'Options Premium Volume 24h',
			tooltipContent: definitions.optionsPremium.protocol['24h'],
			value: props.optionsPremiumVolume.total24h
		})
	}
	if (props.optionsPremiumVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative Options Premium Volume',
			tooltipContent: definitions.optionsPremium.protocol['cumulative'],
			value: props.optionsPremiumVolume.totalAllTime
		})
	}

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Options Premium Volume"
		/>
	)
}

function OptionsNotionalVolume(props: IKeyMetricsProps) {
	if (!props.optionsNotionalVolume) return null

	const metrics = []

	if (props.optionsNotionalVolume.total30d != null) {
		metrics.push({
			name: 'Options Notional Volume 30d',
			tooltipContent: definitions.optionsNotional.protocol['30d'],
			value: props.optionsNotionalVolume.total30d
		})
	}
	if (props.optionsNotionalVolume.total7d != null) {
		metrics.push({
			name: 'Options Notional Volume 7d',
			tooltipContent: definitions.optionsNotional.protocol['7d'],
			value: props.optionsNotionalVolume.total7d
		})
	}
	if (props.optionsNotionalVolume.total24h != null) {
		metrics.push({
			name: 'Options Notional Volume 24h',
			tooltipContent: definitions.optionsNotional.protocol['24h'],
			value: props.optionsNotionalVolume.total24h
		})
	}
	if (props.optionsNotionalVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative Options Notional Volume',
			tooltipContent: definitions.optionsNotional.protocol['cumulative'],
			value: props.optionsNotionalVolume.totalAllTime
		})
	}

	return (
		<SmolStats
			data={metrics}
			protocolName={props.name}
			category={props.category ?? ''}
			formatPrice={props.formatPrice}
			openSmolStatsSummaryByDefault={props.openSmolStatsSummaryByDefault}
			dataType="Options Notional Volume"
		/>
	)
}

const Expenses = (props: IKeyMetricsProps) => {
	if (!props.expenses) return null
	return (
		<details className="group">
			<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
				<span className="text-(--text-label)">Annual Operational Expenses</span>
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
				/>
				<Flag
					protocol={props.name}
					dataType="Expenses"
					isLending={props.category === 'Lending'}
					className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
				<span className="font-jetbrains ml-auto">{props.formatPrice(props.expenses.total)}</span>
			</summary>
			<div className="mb-3 flex flex-col">
				<p className="flex flex-wrap justify-between gap-4 border-b border-dashed border-(--cards-border) py-1 group-last:border-none">
					<span className="text-(--text-label)">Headcount</span>
					<span className="font-jetbrains">{formattedNum(props.expenses.headcount)}</span>
				</p>
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
			</div>
		</details>
	)
}

const TokenLiquidity = (props: IKeyMetricsProps) => {
	if (!props.tokenLiquidity) return null
	return (
		<details className="group">
			<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
				<Tooltip
					content="Sum of value locked in DEX pools that include that token across all DEXs for which DefiLlama tracks pool data."
					className="text-(--text-label) underline decoration-dotted"
				>
					{`${props.token?.symbol ? `$${props.token.symbol}` : 'Token'} Liquidity`}
				</Tooltip>
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
				/>
				<Flag
					protocol={props.name}
					dataType="Token Liquidity"
					isLending={props.category === 'Lending'}
					className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
				<span className="font-jetbrains ml-auto">{formattedNum(props.tokenLiquidity.total, true)}</span>
			</summary>
			<div className="mb-3 flex flex-col">
				{props.tokenLiquidity?.pools.map((pool) => (
					<p
						key={`${pool[0]}-${pool[1]}-${pool[2]}`}
						className="flex items-center justify-between gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none"
					>
						<span className="text-(--text-label)">{pool[0]}</span>
						<span className="font-jetbrains">{props.formatPrice(pool[2])}</span>
					</p>
				))}
			</div>
		</details>
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
							<span className="text-(--text-label)">{`${
								props.token?.symbol ? `$${props.token.symbol}` : 'Token'
							} Price`}</span>
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
							<span className="font-jetbrains ml-auto">{props.formatPrice(props.tokenCGData.price.current)}</span>
						</summary>
						<div className="mb-3 flex flex-col">
							<p className="flex items-center justify-between gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none">
								<span className="text-(--text-label)">All Time High</span>
								<span className="font-jetbrains">{props.formatPrice(props.tokenCGData.price.ath)}</span>
							</p>
							<p className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] py-1 group-last:border-none dark:border-[#222224]">
								<span className="text-(--text-label)">All Time Low</span>
								<span className="font-jetbrains">{props.formatPrice(props.tokenCGData.price.atl)}</span>
							</p>
						</div>
					</details>
				) : (
					<p className="group flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
						<span className="text-(--text-label)">{`${
							props.token?.symbol ? `$${props.token.symbol}` : 'Token'
						} Price`}</span>
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
						<span className="text-(--text-label)">{`${
							props.token?.symbol ? `$${props.token.symbol}` : 'Token'
						} Volume 24h`}</span>
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
						<span className="font-jetbrains ml-auto">{props.formatPrice(props.tokenCGData.volume24h.total)}</span>
					</summary>
					<div className="mb-3 flex flex-col">
						<p className="flex items-center justify-between gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none">
							<span className="text-(--text-label)">CEX Volume</span>
							<span className="font-jetbrains">
								{props.tokenCGData.volume24h.cex ? props.formatPrice(props.tokenCGData.volume24h.cex) : '-'}
							</span>
						</p>
						<p className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] py-1 group-last:border-none dark:border-[#222224]">
							<span className="text-(--text-label)">DEX Volume</span>
							<span className="flex items-center gap-1">
								<span className="font-jetbrains">
									{props.tokenCGData.volume24h.dex ? props.formatPrice(props.tokenCGData.volume24h.dex) : '-'}
								</span>
								<span className="text-xs text-(--text-label)">
									({formattedNum((props.tokenCGData.volume24h.dex / props.tokenCGData.volume24h.total) * 100)}% of
									total)
								</span>
							</span>
						</p>
					</div>
				</details>
			) : null}
		</>
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
				<span className="font-jetbrains ml-auto">{formatPrice(data[0].value)}</span>
			</p>
		)
	}

	return (
		<details className="group" open={openSmolStatsSummaryByDefault}>
			<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
				{data[0].tooltipContent ? (
					<Tooltip content={data[0].tooltipContent} className="text-(--text-label) underline decoration-dotted">
						{data[0].name}
					</Tooltip>
				) : (
					<span className="text-(--text-label)">{data[0].name}</span>
				)}
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
				<span className="font-jetbrains ml-auto">{formatPrice(data[0].value)}</span>
			</summary>
			<div className="mb-3 flex flex-col">
				{data.slice(1).map((metric) => (
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
						<span className="font-jetbrains ml-auto">{formatPrice(metric.value)}</span>
					</p>
				))}
			</div>
		</details>
	)
}

function Users(props: IProtocolOverviewPageData) {
	const users = props.users
	if (!users) return null
	return (
		<div>
			<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
				<Tooltip
					content="This only counts users that interact with protocol directly (so not through another contract, such as a DEX aggregator), and only on arbitrum, avax, bsc, ethereum, xdai, optimism, polygon."
					className="mr-auto font-semibold underline decoration-dotted"
					render={<h2 />}
				>
					User Activity
				</Tooltip>
				<div className="flex flex-col">
					{users.activeUsers != null ? (
						<p className="flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
							<span className="text-(--text-label)">Active Addresses (24h)</span>
							<span className="font-jetbrains">{formattedNum(users.activeUsers, false)}</span>
						</p>
					) : null}
					{users.newUsers != null ? (
						<p className="flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
							<span className="text-(--text-label)">New Addresses (24h)</span>
							<span className="font-jetbrains">{formattedNum(users.newUsers, false)}</span>
						</p>
					) : null}
					{users.transactions != null ? (
						<p className="flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
							<span className="text-(--text-label)">Transactions (24h)</span>
							<span className="font-jetbrains">{formattedNum(users.transactions, false)}</span>
						</p>
					) : null}
					{users.gasUsd != null ? (
						<p className="flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
							<span className="text-(--text-label)">Gas Used (24h)</span>
							<span className="font-jetbrains">{formattedNum(users.gasUsd, true)}</span>
						</p>
					) : null}
				</div>
			</div>
		</div>
	)
}

const Treasury = (props: IProtocolOverviewPageData) => {
	if (!props.treasury) return null
	return (
		<details className="group">
			<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
				<span className="text-(--text-label)">Treasury</span>
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
				/>
				<Flag
					protocol={props.name}
					dataType="Treasury"
					isLending={props.category === 'Lending'}
					className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
				<span className="font-jetbrains ml-auto">{formattedNum(props.treasury.total, true)}</span>
			</summary>
			<div className="mb-3 flex flex-col">
				{props.treasury.majors ? (
					<p className="flex items-center justify-between gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none">
						<span className="text-(--text-label)">
							<Tooltip content="BTC, ETH" className="underline decoration-dotted">
								Majors
							</Tooltip>
						</span>
						<span className="font-jetbrains">{formattedNum(props.treasury.majors, true)}</span>
					</p>
				) : null}
				{props.treasury.stablecoins ? (
					<p className="flex items-center justify-between gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none">
						<span className="text-(--text-label)">Stablecoins</span>
						<span className="font-jetbrains">{formattedNum(props.treasury.stablecoins, true)}</span>
					</p>
				) : null}
				{props.treasury.ownTokens ? (
					<p className="flex items-center justify-between gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none">
						<span className="text-(--text-label)">Own Tokens</span>
						<span className="font-jetbrains">{formattedNum(props.treasury.ownTokens, true)}</span>
					</p>
				) : null}
				{props.treasury.others ? (
					<p className="flex items-center justify-between gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none">
						<span className="text-(--text-label)">Others</span>
						<span className="font-jetbrains">{formattedNum(props.treasury.others, true)}</span>
					</p>
				) : null}
			</div>
		</details>
	)
}

const Raises = (props: IProtocolOverviewPageData) => {
	if (!props.raises) return null
	return (
		<details className="group">
			<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
				<span className="text-(--text-label)">Total Raised</span>
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
				/>
				<Flag
					protocol={props.name}
					dataType="Raises"
					isLending={props.category === 'Lending'}
					className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
				<span className="font-jetbrains ml-auto">
					{formattedNum(props.raises.reduce((sum, r) => sum + Number(r.amount), 0) * 1_000_000, true)}
				</span>
			</summary>
			<div className="mb-3 flex flex-col">
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
			</div>
		</details>
	)
}

const AdditionalInfo = (props: IProtocolOverviewPageData) => {
	const cardsToStackOnLeft =
		(props.fees?.childMethodologies?.length ? 1 : 0) +
		(props.revenue?.childMethodologies?.length ? 1 : 0) +
		(props.holdersRevenue?.childMethodologies?.length ? 1 : 0)

	if (cardsToStackOnLeft === 3) {
		// example pancakeswap has lots of child methodologies, so we stack other cards in one column
		return (
			<div className="col-span-full grid grid-cols-1 gap-2 xl:grid-cols-2">
				<div className="col-span-1 flex flex-col gap-2">
					<ProtocolInfo {...props} />
					<Articles {...props} />
					<Yields {...props} />
					<Users {...props} />
				</div>
				<Methodology {...props} />
				{/* <Unlocks {...props} />
		<Governance {...props} /> */}
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
			{/* <Unlocks {...props} />
			<Governance {...props} /> */}
			<Users {...props} />
			<Hacks {...props} />
			<Competitors {...props} />
		</div>
	)
}

const ProtocolInfo = (props: IProtocolOverviewPageData) => {
	return (
		<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<h2 className="group relative flex items-center gap-1 text-base font-semibold" id="protocol-information">
				{props.isCEX ? 'Exchange Information' : 'Protocol Information'}
				<a
					aria-hidden="true"
					tabIndex={-1}
					href="#protocol-information"
					className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
				/>
				<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
			</h2>
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
								<span>{props.github.length === 1 ? 'GitHub' : github}</span>
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
			<h2 className="group relative flex items-center gap-1 text-base font-semibold" id="methodology">
				Methodology
				<a
					aria-hidden="true"
					tabIndex={-1}
					href="#methodology"
					className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
				/>
				<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
			</h2>
			{props.methodologyURL ? (
				<a href={props.methodologyURL} target="_blank" rel="noopener noreferrer" className="hover:underline">
					<span className="font-medium">{props.isCEX ? 'Total Assets:' : 'TVL:'}</span>{' '}
					<span>{props.methodology ?? ''}</span>
					{props.methodologyURL ? (
						<span className="relative top-0.5 left-1 inline-block">
							<Icon name="external-link" className="h-3.5 w-3.5" />
							<span className="sr-only">View code on GitHub</span>
						</span>
					) : null}
				</a>
			) : props.methodology ? (
				<p>
					<span className="font-medium">{props.isCEX ? 'Total Assets:' : 'TVL:'}</span>{' '}
					<span>{props.methodology ?? ''}</span>
				</p>
			) : null}
			{props.oracleTvs ? (
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
						<span className="font-medium">{title}:</span> <span>{adapter.methodology}</span>
					</p>
				)
			) : null}
		</>
	)
}

function Unlocks(props: IProtocolOverviewPageData) {
	const unlocks = props.unlocks
	if (!unlocks) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<h2 className="group relative flex items-center gap-1 text-base font-semibold" id="unlocks">
				Unlocks
				<a
					aria-hidden="true"
					tabIndex={-1}
					href="#unlocks"
					className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
				/>
				<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
			</h2>
			<div className="flex flex-col">
				{unlocks.recent ? (
					<div className="flex flex-col gap-1">
						<h3 className="border-b border-(--cards-border) py-1">Last unlock event</h3>
						<p className="flex items-center justify-between gap-4">
							<span className="rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1">
								{unlocks.recent.timestamp}
							</span>
							<span className="font-jetbrains">{formattedNum(unlocks.recent.amount)}</span>
						</p>
					</div>
				) : null}
				{unlocks.upcoming ? (
					<div className="flex flex-col gap-1">
						<h3 className="border-b border-(--cards-border) py-1">Upcoming unlock event</h3>
						<p className="flex items-center justify-between gap-4">
							<span className="rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1">
								{unlocks.upcoming.timestamp}
							</span>
							<span className="font-jetbrains">{formattedNum(unlocks.upcoming.amount)}</span>
						</p>
					</div>
				) : null}
			</div>
		</div>
	)
}

function Governance(props: IProtocolOverviewPageData) {
	const governance = props.governance
	if (!governance) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<h2 className="group relative flex items-center gap-1 text-base font-semibold" id="governance">
				Governance
				<a
					aria-hidden="true"
					tabIndex={-1}
					href="#governance"
					className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
				/>
				<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
			</h2>
			<div className="flex flex-col gap-1">
				<h3 className="border-b border-(--cards-border) py-1">Last proposal</h3>
				<p className="flex items-center justify-between gap-4">
					<span>{governance.lastProposal.title}</span>
					<span
						className={`rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1 text-xs text-(--success) ${
							governance.lastProposal.status === 'Passed' ? 'text-(--success)' : 'text-(--error)'
						}`}
					>
						{governance.lastProposal.status}
					</span>
				</p>
			</div>
		</div>
	)
}

function Yields(props: IProtocolOverviewPageData) {
	const yields = props.yields
	if (!yields) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<h2 className="group relative flex items-center gap-1 text-base font-semibold" id="yields">
				Yields
				<a
					aria-hidden="true"
					tabIndex={-1}
					href="#yields"
					className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
				/>
				<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
			</h2>
			<div>
				<p className="flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
					<span className="text-(--text-label)">Pools Tracked</span>
					<span className="font-jetbrains">{yields.noOfPoolsTracked}</span>
				</p>
				<p className="flex flex-wrap justify-between gap-4 border-b border-(--cards-border) py-1 first:pt-0 last:border-none last:pb-0">
					<span className="text-(--text-label)">Average APY</span>
					<span className="font-jetbrains">{formattedNum(yields.averageAPY, false)}%</span>
				</p>
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
			<h2 className="group relative flex items-center gap-1 text-base font-semibold" id="hacks">
				Hacks
				<a
					aria-hidden="true"
					tabIndex={-1}
					href="#hacks"
					className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
				/>
				<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
			</h2>
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
	if (!props.competitors?.length) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<h2 className="group relative flex items-center gap-1 text-base font-semibold" id="competitors">
				Competitors
				<a
					aria-hidden="true"
					tabIndex={-1}
					href="#competitors"
					className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
				/>
				<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
			</h2>
			<div className="flex flex-wrap items-center gap-4">
				{props.competitors.map((similarProtocol) => (
					<a
						href={`/protocol/${slug(similarProtocol.name)}`}
						key={`${props.name}-competitors-${similarProtocol.name}`}
						target="_blank"
						rel="noopener noreferrer"
						className="underline"
					>{`${similarProtocol.name}${similarProtocol.tvl ? ` (${formattedNum(similarProtocol.tvl, true)})` : ''}`}</a>
				))}
			</div>
		</div>
	)
}

// unlocks
// governance
// % change tvl, mcap, token price, etc.
