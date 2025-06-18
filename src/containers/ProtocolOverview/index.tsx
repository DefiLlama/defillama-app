import { SEO } from '~/components/SEO'
import { ProtocolOverviewLayout } from './Layout'
import { IProtocolOverviewPageData } from './types'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import { useMemo } from 'react'
import { TokenLogo } from '~/components/TokenLogo'
import { Bookmark } from '~/components/Bookmark'
import { FEES_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { Flag } from './Flag'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { BasicLink } from '~/components/Link'
import { DLNewsLogo } from '~/components/News/Logo'
import dayjs from 'dayjs'
import { feesOptions, protocolsAndChainsOptions } from '~/components/Filters/options'
import { Menu } from '~/components/Menu'
import { ProtocolChart2 } from './Chart/ProtocolChartNew'

export const ProtocolOverview = (props: IProtocolOverviewPageData) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const { tvl, tvlByChain, hasTvl, toggleOptions } = useMemo(() => {
		let tvl = 0
		let hasTvl = false
		let toggleOptions = []

		const tvlByChain = {}

		for (const chain in props.currentTvlByChain ?? {}) {
			if (chain.toLowerCase() in extraTvlsEnabled || chain == 'offers') {
				const option = protocolsAndChainsOptions.find((e) => e.key === chain)
				if (option && chain !== 'offers') {
					toggleOptions.push(option)
				}
				continue
			}

			hasTvl = true

			const [chainName, extraTvlKey] = chain.split('-')

			if (extraTvlKey) {
				if (extraTvlsEnabled[extraTvlKey.toLowerCase()]) {
					tvlByChain[chainName] = (tvlByChain[chainName] ?? 0) + props.currentTvlByChain[chain]
				}
			} else {
				tvlByChain[chainName] = (tvlByChain[chainName] ?? 0) + props.currentTvlByChain[chain]
			}
		}

		for (const chain in tvlByChain) {
			tvl += tvlByChain[chain]
		}

		if (props.bribeRevenue?.totalAllTime != null) {
			toggleOptions.push(feesOptions.find((f) => f.key === FEES_SETTINGS.BRIBES))
		}

		if (props.tokenTax?.totalAllTime != null) {
			toggleOptions.push(feesOptions.find((f) => f.key === FEES_SETTINGS.TOKENTAX))
		}

		return {
			tvl,
			tvlByChain: Object.entries(tvlByChain).sort(
				(a, b) => (b as [string, number])[1] - (a as [string, number])[1]
			) as [string, number][],
			hasTvl,
			toggleOptions
		}
	}, [extraTvlsEnabled, props])

	const formatPrice = (value?: number | string | null): string | number | null => {
		if (Number.isNaN(Number(value))) return null

		// if (!fetchingChainPrice && chainPrice?.price && denomination && denomination !== 'USD') {
		// 	return formattedNum(Number(value) / chainPrice.price, false) + ` ${chainPrice.symbol}`
		// }

		return formattedNum(value, true)
	}

	return (
		<ProtocolOverviewLayout
			isCEX={props.isCEX}
			pageStyles={props.pageStyles}
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			toggleOptions={toggleOptions}
			metrics={props.metrics}
			tab="information"
		>
			<SEO
				cardName={props.name}
				token={props.name}
				logo={tokenIconUrl(props.name)}
				tvl={formattedNum(tvl, true)?.toString()}
				isCEX={props.isCEX}
			/>
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
				<div className="hidden xl:flex flex-col gap-6 col-span-1 row-[2_/_3] xl:row-[1_/_2] bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:min-h-[360px]">
					<h1 className="flex items-center flex-wrap gap-2 text-xl last:*:ml-auto">
						<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
						<span className="font-bold">
							{props.name ? props.name + `${props.deprecated ? ' (*Deprecated*)' : ''}` + ' ' : ''}
						</span>
						{props.token.symbol && props.token.symbol !== '-' ? (
							<span className="font-normal mr-auto">({props.token.symbol})</span>
						) : null}
						<Bookmark readableProtocolName={props.name} />
					</h1>
					<ProtocolTVL
						hasTvl={hasTvl}
						tvl={tvl}
						isCEX={props.isCEX}
						name={props.name}
						category={props.category}
						formatPrice={formatPrice}
						tvlByChain={tvlByChain}
					/>
					<KeyMetrics {...props} formatPrice={formatPrice} />
				</div>
				<div className="grid grid-cols-2 gap-2 col-span-1 xl:col-[2_/_-1]">
					<div className="col-span-full flex flex-col gap-6 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2">
						<div className="xl:hidden flex flex-col gap-6">
							<h1 className="flex items-center flex-wrap gap-2 text-xl">
								<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
								<span className="font-bold">
									{props.name ? props.name + `${props.deprecated ? ' (*Deprecated*)' : ''}` + ' ' : ''}
								</span>
								{props.token.symbol && props.token.symbol !== '-' ? (
									<span className="font-normal mr-auto">({props.token.symbol})</span>
								) : null}
								<Bookmark readableProtocolName={props.name} />
							</h1>
							<ProtocolTVL
								hasTvl={hasTvl}
								tvl={tvl}
								isCEX={props.isCEX}
								name={props.name}
								category={props.category}
								formatPrice={formatPrice}
								tvlByChain={tvlByChain}
							/>
						</div>
						<ProtocolChart2 {...props} />
					</div>
					<div className="col-span-full flex flex-col gap-6 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:hidden">
						<KeyMetrics {...props} formatPrice={formatPrice} />
					</div>
				</div>
				<AdditionalInfo {...props} />
			</div>
		</ProtocolOverviewLayout>
	)
}

const ProtocolTVL = ({
	hasTvl,
	tvl,
	isCEX,
	name,
	category,
	formatPrice,
	tvlByChain
}: {
	hasTvl: boolean
	tvl: number
	isCEX: boolean
	name: string
	category: string
	formatPrice: (value: number | string | null) => string | number | null
	tvlByChain: [string, number][]
}) => {
	if (!hasTvl) return null

	if (tvlByChain.length === 0) {
		return (
			<p className="flex flex-col">
				<span className="flex items-center flex-nowrap gap-2">
					{isCEX ? <span>Total Assets</span> : <span>Total Value Locked</span>}
					<Flag
						protocol={name}
						dataType="TVL"
						isLending={category === 'Lending'}
						className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
					/>
				</span>
				<span className="font-semibold text-2xl font-jetbrains min-h-8" suppressHydrationWarning>
					{formatPrice(tvl)}
				</span>
			</p>
		)
	}

	return (
		<details className="group">
			<summary className="flex flex-col">
				<span className="flex items-center flex-nowrap gap-2">
					<span className="text-[#545757] dark:text-[#cccccc]">{isCEX ? 'Total Assets' : 'Total Value Locked'}</span>
					<Flag
						protocol={name}
						dataType="TVL"
						isLending={category === 'Lending'}
						className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
					/>
				</span>
				<span className="flex items-center flex-nowrap gap-2">
					<span className="font-semibold text-2xl font-jetbrains min-h-8" suppressHydrationWarning>
						{formatPrice(tvl)}
					</span>
					<Icon
						name="chevron-down"
						height={16}
						width={16}
						className="group-open:rotate-180 transition-transform duration-100 relative top-[2px]"
					/>
				</span>
			</summary>
			<div className="flex flex-col my-3 max-h-[50vh] overflow-auto">
				{tvlByChain.map(([chain, tvl]) => (
					<p
						key={`${chain}-${tvl}-${name}`}
						className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222224] group-last:border-none py-1"
					>
						<span className="text-[#545757] dark:text-[#cccccc]">{chain}</span>
						<span className="font-jetbrains">{formatPrice(tvl)}</span>
					</p>
				))}
			</div>
		</details>
	)
}
const KeyMetrics = (
	props: IProtocolOverviewPageData & { formatPrice: (value: number | string | null) => string | number | null }
) => {
	if (!props.hasKeyMetrics) return null

	return (
		<div className="flex flex-col flex-1 gap-2">
			<h2 className="font-semibold">Key Metrics</h2>
			<div className="flex flex-col">
				<Fees {...props} />
				<Revenue {...props} />
				<HoldersRevenue {...props} />
				<Incentives {...props} />
				<Earnings {...props} />
				<DexVolume {...props} />
				<DexAggregatorVolume {...props} />
				<PerpVolume {...props} />
				<PerpAggregatorVolume {...props} />
				<BridgeAggregatorVolume {...props} />
				<OptionsPremiumVolume {...props} />
				<OptionsNotionalVolume {...props} />
				<TokenCGData {...props} />
				{props.currentTvlByChain?.staking != null ? (
					<p className="group flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Staked</span>
						<Flag
							protocol={props.name}
							dataType="Staked"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
						{props.tokenCGData?.marketCap?.current ? (
							<span className="flex items-center gap-1">
								<span className="font-jetbrains">{formattedNum(props.currentTvlByChain.staking, true)}</span>
								<span className="text-xs text-[#545757] dark:text-[#cccccc]">
									({formattedNum((props.currentTvlByChain.staking / props.tokenCGData.marketCap.current) * 100)}% of
									mcap)
								</span>
							</span>
						) : (
							<span className="font-jetbrains">{formattedNum(props.currentTvlByChain.staking, true)}</span>
						)}
					</p>
				) : null}
				{props.currentTvlByChain?.borrowed != null ? (
					<p className="group flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Borrowed</span>
						<Flag
							protocol={props.name}
							dataType="Borrowed"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
						<span className="font-jetbrains">{formattedNum(props.currentTvlByChain.borrowed, true)}</span>
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
		<div className="flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 col-span-1">
			<div className="flex items-center justify-between">
				<h3 className="font-semibold">Latest from DL News</h3>
				<a href="https://www.dlnews.com">
					<DLNewsLogo width={72} height={18} />
				</a>
			</div>

			{props.articles.map((article, idx) => (
				<a
					key={`news_card_${idx}`}
					href={article.href}
					target="_blank"
					rel="noreferrer noopener"
					className="p-2 flex flex-col gap-3 rounded-md bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
				>
					{article.imgSrc ? (
						<img
							className="object-cover rounded h-[100px] w-full flex-shrink-0"
							src={article.imgSrc}
							alt={article.headline}
						/>
					) : null}
					<div className="flex flex-col gap-3 justify-between">
						<p className="text-sm font-medium whitespace-pre-wrap break-keep">{article.headline}</p>
						<div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
							<p className="text-xs">{dayjs(article.date).format('MMMM D, YYYY')}</p>
							<p className="flex items-center justify-between flex-nowrap font-semibold rounded-md">
								<span>Read on DL News</span> <Icon name="arrow-up-right" height={14} width={14} />
							</p>
						</div>
					</div>
				</a>
			))}
		</div>
	)
}

function Fees(props: IProtocolOverviewPageData) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const fees = props.fees
	const bribeRevenue = props.bribeRevenue
	const tokenTax = props.tokenTax
	const feesExists = fees?.totalAllTime != null || bribeRevenue?.totalAllTime != null || tokenTax?.totalAllTime != null

	if (!feesExists) return null

	const bribeRevenue24h = extraTvlsEnabled.bribes ? bribeRevenue?.total24h : 0
	const bribeRevenue30d = extraTvlsEnabled.bribes ? bribeRevenue?.total30d : 0
	const bribeRevenueAllTime = extraTvlsEnabled.bribes ? bribeRevenue?.totalAllTime : 0
	const tokenTax24h = extraTvlsEnabled.tokentax ? tokenTax?.total24h : 0
	const tokenTax30d = extraTvlsEnabled.tokentax ? tokenTax?.total30d : 0
	const tokenTaxAllTime = extraTvlsEnabled.tokentax ? tokenTax?.totalAllTime : 0

	const fees24h = feesExists ? (fees?.total24h ?? 0) + (bribeRevenue24h ?? 0) + (tokenTax24h ?? 0) : null
	const fees30d = feesExists ? (fees?.total30d ?? 0) + (bribeRevenue30d ?? 0) + (tokenTax30d ?? 0) : null
	const feesAllTime = feesExists
		? (fees?.totalAllTime ?? 0) + (bribeRevenueAllTime ?? 0) + (tokenTaxAllTime ?? 0)
		: null

	const metrics = []

	if (fees30d != null) {
		metrics.push({
			name: 'Fees (Annualized)',
			tooltipContent:
				'This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it',
			value: fees30d * 12.2
		})

		metrics.push({
			name: 'Fees 30d',
			tooltipContent: 'Total fees paid by users in the last 30 days, updated daily at 00:00UTC',
			value: fees30d
		})
	}

	if (fees24h != null) {
		metrics.push({
			name: 'Fees 24h',
			tooltipContent: 'Total fees paid by users in the last 24 hours, updated daily at 00:00UTC',
			value: fees24h
		})
	}

	if (feesAllTime != null) {
		metrics.push({
			name: 'Cumulative Fees',
			tooltipContent: 'Total fees paid by users since the protocol was launched',
			value: feesAllTime
		})
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}

function Revenue(props: IProtocolOverviewPageData) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const revenue = props.revenue
	const bribeRevenue = props.bribeRevenue
	const tokenTax = props.tokenTax
	const revenueExists =
		revenue?.totalAllTime != null || bribeRevenue?.totalAllTime != null || tokenTax?.totalAllTime != null

	if (!revenueExists) return null

	const bribeRevenue24h = extraTvlsEnabled.bribes ? bribeRevenue?.total24h : 0
	const bribeRevenue30d = extraTvlsEnabled.bribes ? bribeRevenue?.total30d : 0
	const bribeRevenueAllTime = extraTvlsEnabled.bribes ? bribeRevenue?.totalAllTime : 0
	const tokenTax24h = extraTvlsEnabled.tokentax ? tokenTax?.total24h : 0
	const tokenTax30d = extraTvlsEnabled.tokentax ? tokenTax?.total30d : 0
	const tokenTaxAllTime = extraTvlsEnabled.tokentax ? tokenTax?.totalAllTime : 0

	const revenue24h = revenueExists ? (revenue?.total24h ?? 0) + (bribeRevenue24h ?? 0) + (tokenTax24h ?? 0) : null
	const revenue30d = revenueExists ? (revenue?.total30d ?? 0) + (bribeRevenue30d ?? 0) + (tokenTax30d ?? 0) : null
	const revenueAllTime = revenueExists
		? (revenue?.totalAllTime ?? 0) + (bribeRevenueAllTime ?? 0) + (tokenTaxAllTime ?? 0)
		: null

	const metrics = []

	if (revenue30d != null) {
		metrics.push({
			name: 'Revenue (Annualized)',
			tooltipContent:
				'This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it',
			value: revenue30d * 12.2
		})

		metrics.push({
			name: 'Revenue 30d',
			tooltipContent: 'Total revenue earned by the protocol in the last 30 days, updated daily at 00:00UTC',
			value: revenue30d
		})
	}

	if (revenue24h != null) {
		metrics.push({
			name: 'Revenue 24h',
			tooltipContent: 'Total revenue earned by the protocol in the last 24 hours, updated daily at 00:00UTC',
			value: revenue24h
		})
	}

	if (revenueAllTime != null) {
		metrics.push({
			name: 'Cumulative Revenue',
			tooltipContent: 'Total revenue earned by the protocol since the protocol was launched',
			value: revenueAllTime
		})
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}
function HoldersRevenue(props: IProtocolOverviewPageData) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const holdersRevenue = props.holdersRevenue
	const bribeRevenue = props.bribeRevenue
	const tokenTax = props.tokenTax
	const holdersRevenueExists =
		holdersRevenue?.totalAllTime != null || bribeRevenue?.totalAllTime != null || tokenTax?.totalAllTime != null

	if (!holdersRevenueExists) return null

	const bribeRevenue24h = extraTvlsEnabled.bribes ? bribeRevenue?.total24h : 0
	const bribeRevenue30d = extraTvlsEnabled.bribes ? bribeRevenue?.total30d : 0
	const bribeRevenueAllTime = extraTvlsEnabled.bribes ? bribeRevenue?.totalAllTime : 0
	const tokenTax24h = extraTvlsEnabled.tokentax ? tokenTax?.total24h : 0
	const tokenTax30d = extraTvlsEnabled.tokentax ? tokenTax?.total30d : 0
	const tokenTaxAllTime = extraTvlsEnabled.tokentax ? tokenTax?.totalAllTime : 0

	const holdersRevenue24h = holdersRevenueExists
		? (holdersRevenue?.total24h ?? 0) + (bribeRevenue24h ?? 0) + (tokenTax24h ?? 0)
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
			tooltipContent:
				'This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it',
			value: holdersRevenue30d * 12.2
		})

		metrics.push({
			name: 'Holders Revenue 30d',
			tooltipContent:
				"Total revenue that is distributed to protocol's token holders in the last 30 days, updated daily at 00:00UTC",
			value: holdersRevenue30d
		})
	}

	if (holdersRevenue24h != null) {
		metrics.push({
			name: 'Holders Revenue 24h',
			tooltipContent:
				"Total revenue that is distributed to protocol's token holders in the last 24 hours, updated daily at 00:00UTC",
			value: holdersRevenue24h
		})
	}

	if (holdersRevenueAllTime != null) {
		metrics.push({
			name: 'Cumulative Holders Revenue',
			tooltipContent: "Total revenue that is distributed to protocol's token holders since the protocol was launched",
			value: holdersRevenueAllTime
		})
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}

function Incentives(props: IProtocolOverviewPageData) {
	if (!props.incentives) return null

	const metrics = []

	if (props.incentives.emissions30d != null) {
		metrics.push({
			name: 'Incentives (Annualized)',
			tooltipContent:
				'This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it',
			value: props.incentives.emissions30d * 12.2
		})

		metrics.push({
			name: 'Incentives 30d',
			tooltipContent: 'Total incentives distributed by the protocol in the last 30 days, updated daily at 00:00UTC',
			value: props.incentives.emissions30d
		})
	}

	if (props.incentives.emissions24h != null) {
		metrics.push({
			name: 'Incentives 24h',
			tooltipContent: 'Total incentives distributed by the protocol in the last 24 hours, updated daily at 00:00UTC',
			value: props.incentives.emissions24h
		})
	}

	if (props.incentives.emissionsAllTime != null) {
		metrics.push({
			name: 'Cumulative Incentives',
			tooltipContent: 'Total incentives distributed by the protocol since the protocol was launched',
			value: props.incentives.emissionsAllTime
		})
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}

function Earnings(props: IProtocolOverviewPageData) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const revenue = props.revenue
	const bribeRevenue = props.bribeRevenue
	const tokenTax = props.tokenTax
	const incentivesData = props.incentives

	const bribeRevenue24h = extraTvlsEnabled.bribes ? bribeRevenue?.total24h : 0
	const bribeRevenue30d = extraTvlsEnabled.bribes ? bribeRevenue?.total30d : 0
	const bribeRevenueAllTime = extraTvlsEnabled.bribes ? bribeRevenue?.totalAllTime : 0
	const tokenTax24h = extraTvlsEnabled.tokentax ? tokenTax?.total24h : 0
	const tokenTax30d = extraTvlsEnabled.tokentax ? tokenTax?.total30d : 0
	const tokenTaxAllTime = extraTvlsEnabled.tokentax ? tokenTax?.totalAllTime : 0

	const revenue24h = revenue?.total24h != null ? revenue.total24h + (bribeRevenue24h ?? 0) + (tokenTax24h ?? 0) : null
	const revenue30d = revenue?.total30d != null ? revenue.total30d + (bribeRevenue30d ?? 0) + (tokenTax30d ?? 0) : null
	const revenueAllTime =
		revenue?.totalAllTime != null ? revenue.totalAllTime + (bribeRevenueAllTime ?? 0) + (tokenTaxAllTime ?? 0) : null

	const earnings24h =
		revenue24h != null && incentivesData?.emissions24h != null ? revenue24h - incentivesData.emissions24h : null
	const earnings30d =
		revenue30d != null && incentivesData?.emissions30d != null ? revenue30d - incentivesData.emissions30d : null
	const earningsAllTime =
		revenueAllTime != null && incentivesData?.emissionsAllTime != null
			? revenueAllTime - incentivesData.emissionsAllTime
			: null

	if (!incentivesData && !revenue) return null

	const metrics = []

	if (earnings30d != null) {
		metrics.push({
			name: 'Earnings (Annualized)',
			tooltipContent:
				'This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it',
			value: earnings30d * 12.2
		})

		metrics.push({
			name: 'Earnings 30d',
			tooltipContent:
				'Total earnings (revenue - incentives) of the protocol in the last 30 days, updated daily at 00:00UTC',
			value: earnings30d
		})
	}

	if (earnings24h != null) {
		metrics.push({
			name: 'Earnings 24h',
			tooltipContent:
				'Total earnings (revenue - incentives) of the protocol in the last 24 hours, updated daily at 00:00UTC',
			value: earnings24h
		})
	}

	if (earningsAllTime != null) {
		metrics.push({
			name: 'Cumulative Earnings',
			tooltipContent: 'Total earnings (revenue - incentives) of the protocol since the protocol was launched',
			value: earningsAllTime
		})
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}

function DexVolume(props: IProtocolOverviewPageData) {
	if (!props.dexVolume) return null

	const metrics = []

	if (props.dexVolume.total30d != null) {
		metrics.push({ name: 'DEX Volume 30d', tooltipContent: null, value: props.dexVolume.total30d })
	}
	if (props.dexVolume.total24h != null) {
		metrics.push({ name: 'DEX Volume 24h', tooltipContent: null, value: props.dexVolume.total24h })
	}
	if (props.dexVolume.totalAllTime != null) {
		metrics.push({ name: 'Cumulative DEX Volume', tooltipContent: null, value: props.dexVolume.totalAllTime })
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}

function DexAggregatorVolume(props: IProtocolOverviewPageData) {
	if (!props.dexAggregatorVolume) return null

	const metrics = []

	if (props.dexAggregatorVolume.total30d != null) {
		metrics.push({ name: 'DEX Aggregator Volume 30d', tooltipContent: null, value: props.dexAggregatorVolume.total30d })
	}
	if (props.dexAggregatorVolume.total24h != null) {
		metrics.push({ name: 'DEX Aggregator Volume 24h', tooltipContent: null, value: props.dexAggregatorVolume.total24h })
	}
	if (props.dexAggregatorVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative DEX Aggregator Volume',
			tooltipContent: null,
			value: props.dexAggregatorVolume.totalAllTime
		})
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}

function PerpVolume(props: IProtocolOverviewPageData) {
	if (!props.perpVolume) return null

	const metrics = []

	if (props.perpVolume.total30d != null) {
		metrics.push({ name: 'Perp Volume 30d', tooltipContent: null, value: props.perpVolume.total30d })
	}
	if (props.perpVolume.total24h != null) {
		metrics.push({ name: 'Perp Volume 24h', tooltipContent: null, value: props.perpVolume.total24h })
	}
	if (props.perpVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative Perp Volume',
			tooltipContent: null,
			value: props.perpVolume.totalAllTime
		})
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}

function PerpAggregatorVolume(props: IProtocolOverviewPageData) {
	if (!props.perpAggregatorVolume) return null

	const metrics = []

	if (props.perpAggregatorVolume.total30d != null) {
		metrics.push({
			name: 'Perp Aggregator Volume 30d',
			tooltipContent: null,
			value: props.perpAggregatorVolume.total30d
		})
	}
	if (props.perpAggregatorVolume.total24h != null) {
		metrics.push({
			name: 'Perp Aggregator Volume 24h',
			tooltipContent: null,
			value: props.perpAggregatorVolume.total24h
		})
	}
	if (props.perpAggregatorVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative Perp Aggregator Volume',
			tooltipContent: null,
			value: props.perpAggregatorVolume.totalAllTime
		})
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}

function BridgeAggregatorVolume(props: IProtocolOverviewPageData) {
	if (!props.bridgeAggregatorVolume) return null

	const metrics = []

	if (props.bridgeAggregatorVolume.total30d != null) {
		metrics.push({
			name: 'Bridge Aggregator Volume 30d',
			tooltipContent: null,
			value: props.bridgeAggregatorVolume.total30d
		})
	}
	if (props.bridgeAggregatorVolume.total24h != null) {
		metrics.push({
			name: 'Bridge Aggregator Volume 24h',
			tooltipContent: null,
			value: props.bridgeAggregatorVolume.total24h
		})
	}
	if (props.bridgeAggregatorVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative Bridge Aggregator Volume',
			tooltipContent: null,
			value: props.bridgeAggregatorVolume.totalAllTime
		})
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}

function OptionsPremiumVolume(props: IProtocolOverviewPageData) {
	if (!props.optionsPremiumVolume) return null

	const metrics = []

	if (props.optionsPremiumVolume.total30d != null) {
		metrics.push({
			name: 'Options Premium Volume 30d',
			tooltipContent: null,
			value: props.optionsPremiumVolume.total30d
		})
	}
	if (props.optionsPremiumVolume.total24h != null) {
		metrics.push({
			name: 'Options Premium Volume 24h',
			tooltipContent: null,
			value: props.optionsPremiumVolume.total24h
		})
	}
	if (props.optionsPremiumVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative Options Premium Volume',
			tooltipContent: null,
			value: props.optionsPremiumVolume.totalAllTime
		})
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}

function OptionsNotionalVolume(props: IProtocolOverviewPageData) {
	if (!props.optionsNotionalVolume) return null

	const metrics = []

	if (props.optionsNotionalVolume.total30d != null) {
		metrics.push({
			name: 'Options Notional Volume 30d',
			tooltipContent: null,
			value: props.optionsNotionalVolume.total30d
		})
	}
	if (props.optionsNotionalVolume.total24h != null) {
		metrics.push({
			name: 'Options Notional Volume 24h',
			tooltipContent: null,
			value: props.optionsNotionalVolume.total24h
		})
	}
	if (props.optionsNotionalVolume.totalAllTime != null) {
		metrics.push({
			name: 'Cumulative Options Notional Volume',
			tooltipContent: null,
			value: props.optionsNotionalVolume.totalAllTime
		})
	}

	return <SmolStats data={metrics} protocolName={props.name} category={props.category ?? ''} />
}

function Users(props: IProtocolOverviewPageData) {
	const users = props.users
	if (!users) return null
	return (
		<div>
			<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
				<Tooltip
					content="This only counts users that interact with protocol directly (so not through another contract, such as a dex aggregator), and only on arbitrum, avax, bsc, ethereum, xdai, optimism, polygon."
					className="font-semibold underline decoration-dotted mr-auto"
					render={<h2 />}
				>
					User Activity
				</Tooltip>
				<div className="flex flex-col">
					{users.activeUsers != null ? (
						<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
							<span className="text-[#545757] dark:text-[#cccccc]">Active Addresses (24h)</span>
							<span className="font-jetbrains">{formattedNum(users.activeUsers, false)}</span>
						</p>
					) : null}
					{users.newUsers != null ? (
						<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
							<span className="text-[#545757] dark:text-[#cccccc]">New Addresses (24h)</span>
							<span className="font-jetbrains">{formattedNum(users.newUsers, false)}</span>
						</p>
					) : null}
					{users.transactions != null ? (
						<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
							<span className="text-[#545757] dark:text-[#cccccc]">Transactions (24h)</span>
							<span className="font-jetbrains">{formattedNum(users.transactions, false)}</span>
						</p>
					) : null}
					{users.gasUsd != null ? (
						<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
							<span className="text-[#545757] dark:text-[#cccccc]">Gas Used (24h)</span>
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
			<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-open:font-semibold group-open:border-none group-last:border-none py-1">
				<span className="text-[#545757] dark:text-[#cccccc]">Treasury</span>
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
				/>
				<Flag
					protocol={props.name}
					dataType="Treasury"
					isLending={props.category === 'Lending'}
					className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
				<span className="font-jetbrains ml-auto">{formattedNum(props.treasury.total, true)}</span>
			</summary>
			<div className="flex flex-col mb-3">
				{props.treasury.majors ? (
					<p className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">
							<Tooltip content="BTC, ETH" className="underline decoration-dotted">
								Majors
							</Tooltip>
						</span>
						<span className="font-jetbrains">{formattedNum(props.treasury.majors, true)}</span>
					</p>
				) : null}
				{props.treasury.stablecoins ? (
					<p className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Stablecoins</span>
						<span className="font-jetbrains">{formattedNum(props.treasury.stablecoins, true)}</span>
					</p>
				) : null}
				{props.treasury.ownTokens ? (
					<p className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Own Tokens</span>
						<span className="font-jetbrains">{formattedNum(props.treasury.ownTokens, true)}</span>
					</p>
				) : null}
				{props.treasury.others ? (
					<p className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Others</span>
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
			<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-open:font-semibold group-open:border-none group-last:border-none py-1">
				<span className="text-[#545757] dark:text-[#cccccc]">Total Raised</span>
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
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
			<div className="flex flex-col mb-3">
				{props.raises.map((raise) => (
					<p
						className="flex flex-col gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1"
						key={`${raise.date}-${raise.amount}-${props.name}`}
					>
						<span className="flex flex-wrap justify-between">
							<span className="text-[#545757] dark:text-[#cccccc]">
								{dayjs(raise.date * 1000).format('MMM D, YYYY')}
							</span>
							<span className="font-jetbrains">{formattedNum(raise.amount * 1_000_000, true)}</span>
						</span>
						<span className="flex gap-1 flex-wrap justify-between text-[#545757] dark:text-[#cccccc]">
							<span>Round: {raise.round}</span>
							{raise.investors?.length ? <span>Investors: {raise.investors.join(', ')}</span> : null}
						</span>
					</p>
				))}
			</div>
		</details>
	)
}

const Expenses = (props: IProtocolOverviewPageData) => {
	if (!props.expenses) return null
	return (
		<details className="group">
			<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-open:font-semibold group-open:border-none group-last:border-none py-1">
				<span className="text-[#545757] dark:text-[#cccccc]">Annual Operational Expenses</span>
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
				/>
				<Flag
					protocol={props.name}
					dataType="Expenses"
					isLending={props.category === 'Lending'}
					className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
				<span className="font-jetbrains ml-auto">{formattedNum(props.expenses.total, true)}</span>
			</summary>
			<div className="flex flex-col mb-3">
				<p className="flex flex-wrap justify-between gap-4 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
					<span className="text-[#545757] dark:text-[#cccccc]">Headcount</span>
					<span className="font-jetbrains">{formattedNum(props.expenses.headcount)}</span>
				</p>
				{props.expenses.annualUsdCost.map(([category, amount]) => (
					<p
						className="flex flex-col gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1"
						key={`${props.name}-expenses-${category}-${amount}`}
					>
						<span className="flex flex-wrap justify-between">
							<span className="text-[#545757] dark:text-[#cccccc]">{category}</span>
							<span className="font-jetbrains">{formattedNum(amount, true)}</span>
						</span>
					</p>
				))}
				{props.expenses?.sources?.length ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1 text-[#545757] dark:text-[#cccccc]">
						<span className="text-[#545757] dark:text-[#cccccc]">Sources</span>
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
					<p className="flex flex-wrap justify-between gap-4 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1 text-[#545757] dark:text-[#cccccc]">
						<span className="text-[#545757] dark:text-[#cccccc]">Notes</span>
						<span>{props.expenses.notes?.join(', ') ?? ''}</span>
					</p>
				) : null}
				{props.expenses?.lastUpdate ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1 text-[#545757] dark:text-[#cccccc]">
						<span className="text-[#545757] dark:text-[#cccccc]">Last Update</span>
						<span>{dayjs(props.expenses.lastUpdate).format('MMM D, YYYY')}</span>
					</p>
				) : null}
			</div>
		</details>
	)
}

const TokenLiquidity = (props: IProtocolOverviewPageData) => {
	if (!props.tokenLiquidity) return null
	return (
		<details className="group">
			<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-open:font-semibold group-open:border-none group-last:border-none py-1">
				<Tooltip
					content="Sum of value locked in DEX pools that include that token across all DEXs for which DefiLlama tracks pool data."
					className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
				>
					{`${props.token?.symbol ? `$${props.token.symbol}` : 'Token'} Liquidity`}
				</Tooltip>
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
				/>
				<Flag
					protocol={props.name}
					dataType="Token Liquidity"
					isLending={props.category === 'Lending'}
					className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
				<span className="font-jetbrains ml-auto">{formattedNum(props.tokenLiquidity.total, true)}</span>
			</summary>
			<div className="flex flex-col mb-3">
				{props.tokenLiquidity?.pools.map((pool) => (
					<p
						key={`${pool[0]}-${pool[1]}-${pool[2]}`}
						className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1"
					>
						<span className="text-[#545757] dark:text-[#cccccc]">{pool[0]}</span>
						<span className="font-jetbrains">{formattedNum(pool[2], true)}</span>
					</p>
				))}
			</div>
		</details>
	)
}

const TokenCGData = (props: IProtocolOverviewPageData) => {
	if (!props.tokenCGData) return null
	return (
		<>
			{props.tokenCGData?.marketCap?.current ? (
				<p className="group flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
					<span className="text-[#545757] dark:text-[#cccccc]">Market Cap</span>
					<Flag
						protocol={props.name}
						dataType="Market Cap"
						isLending={props.category === 'Lending'}
						className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
					/>
					<span className="font-jetbrains">{formattedNum(props.tokenCGData.marketCap.current, true)}</span>
				</p>
			) : null}
			{props.tokenCGData?.price?.current ? (
				props.tokenCGData.price.ath || props.tokenCGData.price.atl ? (
					<details className="group">
						<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-open:font-semibold group-open:border-none group-last:border-none py-1">
							<span className="text-[#545757] dark:text-[#cccccc]">{`${
								props.token?.symbol ? `$${props.token.symbol}` : 'Token'
							} Price`}</span>
							<Icon
								name="chevron-down"
								height={16}
								width={16}
								className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
							/>
							<Flag
								protocol={props.name}
								dataType="Token Price"
								isLending={props.category === 'Lending'}
								className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
							/>
							<span className="font-jetbrains ml-auto">{formattedNum(props.tokenCGData.price.current, true)}</span>
						</summary>
						<div className="flex flex-col mb-3">
							<p className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
								<span className="text-[#545757] dark:text-[#cccccc]">All Time High</span>
								<span className="font-jetbrains">{formattedNum(props.tokenCGData.price.ath, true)}</span>
							</p>
							<p className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222224] group-last:border-none py-1">
								<span className="text-[#545757] dark:text-[#cccccc]">All Time Low</span>
								<span className="font-jetbrains">{formattedNum(props.tokenCGData.price.atl, true)}</span>
							</p>
						</div>
					</details>
				) : (
					<p className="group flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">{`${
							props.token?.symbol ? `$${props.token.symbol}` : 'Token'
						} Price`}</span>
						<Flag
							protocol={props.name}
							dataType="Token Price"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
						<span className="font-jetbrains">{formattedNum(props.tokenCGData.price.current, true)}</span>
					</p>
				)
			) : null}
			{props.tokenCGData?.fdv?.current ? (
				<p className="group flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
					<Tooltip
						className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
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
					<span className="font-jetbrains">{formattedNum(props.tokenCGData.fdv.current, true)}</span>
				</p>
			) : null}
			{props.tokenCGData.volume24h?.total ? (
				<details className="group">
					<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-open:font-semibold group-open:border-none group-last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">{`24h ${
							props.token?.symbol ? `$${props.token.symbol}` : 'Token'
						} Volume`}</span>
						<Icon
							name="chevron-down"
							height={16}
							width={16}
							className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
						/>
						<Flag
							protocol={props.name}
							dataType="Token Volume"
							isLending={props.category === 'Lending'}
							className="mr-auto opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
						/>
						<span className="font-jetbrains ml-auto">{formattedNum(props.tokenCGData.volume24h.total, true)}</span>
					</summary>
					<div className="flex flex-col mb-3">
						<p className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
							<span className="text-[#545757] dark:text-[#cccccc]">CEX Volume</span>
							<span className="font-jetbrains">
								{props.tokenCGData.volume24h.cex ? formattedNum(props.tokenCGData.volume24h.cex, true) : '-'}
							</span>
						</p>
						<p className="flex items-center justify-between gap-1 border-b border-dashed border-[#e6e6e6] dark:border-[#222224] group-last:border-none py-1">
							<span className="text-[#545757] dark:text-[#cccccc]">DEX Volume</span>
							<span className="flex items-center gap-1">
								<span className="font-jetbrains">
									{props.tokenCGData.volume24h.dex ? formattedNum(props.tokenCGData.volume24h.dex, true) : '-'}
								</span>
								<span className="text-xs text-[#545757] dark:text-[#cccccc]">
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
	category
}: {
	data: Array<{
		name: string
		tooltipContent?: string | null
		value: string | number
	}>
	protocolName: string
	category: string
}) => {
	if (data.length === 0) return null

	if (data.length === 1) {
		return (
			<p className="group flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
				{data[0].tooltipContent ? (
					<Tooltip
						content={data[0].tooltipContent}
						className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
					>
						{data[0].name}
					</Tooltip>
				) : (
					<span className="text-[#545757] dark:text-[#cccccc]">{data[0].name}</span>
				)}
				<Flag
					protocol={protocolName}
					dataType={data[0].name}
					isLending={category === 'Lending'}
					className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
				<span className="font-jetbrains ml-auto">{formattedNum(data[0].value, true)}</span>
			</p>
		)
	}

	return (
		<details className="group">
			<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-open:font-semibold group-open:border-none group-last:border-none py-1">
				{data[0].tooltipContent ? (
					<Tooltip
						content={data[0].tooltipContent}
						className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
					>
						{data[0].name}
					</Tooltip>
				) : (
					<span className="text-[#545757] dark:text-[#cccccc]">{data[0].name}</span>
				)}
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
				/>
				<Flag
					protocol={protocolName}
					dataType={data[0].name.split(' ').slice(0, -1).join(' ')}
					isLending={category === 'Lending'}
					className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
				<span className="font-jetbrains ml-auto">{formattedNum(data[0].value, true)}</span>
			</summary>
			<div className="flex flex-col mb-3">
				{data.slice(1).map((metric) => (
					<p
						className="flex flex-wrap justify-stat gap-4 border-b border-dashed border-[#e6e6e6] dark:border-[#222324] last:border-none py-1"
						key={`dex-aggregator-${metric.name}`}
					>
						{metric.tooltipContent ? (
							<Tooltip
								content={metric.tooltipContent}
								className="text-[#545757] dark:text-[#cccccc] underline decoration-dotted"
							>
								{metric.name}
							</Tooltip>
						) : (
							<span className="text-[#545757] dark:text-[#cccccc]">{metric.name}</span>
						)}
						<span className="font-jetbrains ml-auto">{formattedNum(metric.value, true)}</span>
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
			<div className="col-span-full grid grid-cols-1 xl:grid-cols-2 gap-2">
				<div className="col-span-1 flex flex-col gap-2">
					<ProtocolInfo {...props} />
					<Articles {...props} />
					<Yields {...props} />
					<DevActivity {...props} />
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
		<div className="col-span-full grid grid-cols-1 xl:grid-cols-2 min-[1536px]:grid-cols-3 min-[1792px]:grid-cols-3 gap-2">
			<ProtocolInfo {...props} />
			<Articles {...props} />
			<Methodology {...props} />
			<Yields {...props} />
			{/* <Unlocks {...props} />
			<Governance {...props} /> */}
			<DevActivity {...props} />
			<Users {...props} />
			<Hacks {...props} />
			<Competitors {...props} />
		</div>
	)
}

const ProtocolInfo = (props: IProtocolOverviewPageData) => {
	return (
		<div className="flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4 col-span-1">
			<h2 className="font-semibold">Protocol Information</h2>
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
						<span className="flex-shrink-0">Audits:</span>
						{props.audits.auditLinks.length > 0 ? (
							<Menu
								name="Yes"
								options={props.audits.auditLinks}
								isExternal
								className="flex items-center text-xs gap-1 font-medium py-1 px-2 rounded-full whitespace-nowrap border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
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
						className="flex items-center gap-1 text-xs font-medium py-1 px-2 rounded-full whitespace-nowrap border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icon name="earth" className="w-3 h-3" />
						<span>Website</span>
					</a>
				) : null}
				{props.github?.length
					? props.github.map((github) => (
							<a
								href={`https://github.com/${github}`}
								className="flex items-center gap-1 text-xs font-medium py-1 px-2 rounded-full whitespace-nowrap border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
								target="_blank"
								rel="noopener noreferrer"
								key={`${props.name}-github-${github}`}
							>
								<Icon name="github" className="w-3 h-3" />
								<span>{props.github.length === 1 ? 'GitHub' : github}</span>
							</a>
					  ))
					: null}
				{props.twitter ? (
					<a
						href={`https://twitter.com/${props.twitter}`}
						className="flex items-center gap-1 text-xs font-medium py-1 px-2 rounded-full whitespace-nowrap border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icon name="twitter" className="w-3 h-3" />
						<span>Twitter</span>
					</a>
				) : null}
			</div>
		</div>
	)
}
const Methodology = (props: IProtocolOverviewPageData) => {
	return (
		<div className="flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4 col-span-1">
			<h2 className="font-semibold">Methodology</h2>
			{props.methodologyURL ? (
				<a href={props.methodologyURL} target="_blank" rel="noopener noreferrer" className="hover:underline">
					<span className="font-medium">TVL:</span> <span>{props.methodology ?? ''}</span>
					{props.methodologyURL ? (
						<span className="inline-block relative left-1 top-[2px]">
							<Icon name="external-link" className="w-[14px] h-[14px]" />
							<span className="sr-only">View code on GitHub</span>
						</span>
					) : null}
				</a>
			) : props.methodology ? (
				<p>
					<span className="font-medium">TVL:</span> <span>{props.methodology ?? ''}</span>
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
			<p>
				<span className="font-medium">{title}:</span>
				<br />
				<span className="flex flex-col gap-1">
					{adapter.childMethodologies.map((child) =>
						child[2] ? (
							<a
								key={`${title}-${child[0]}-${child[1] ?? ''}-${child[2] ?? ''}`}
								href={child[2]}
								target="_blank"
								rel="noopener noreferrer"
								className="hover:underline"
							>
								<span>{child[0]}:</span> <span>{child[1]}</span>
								{child[2] ? (
									<span className="inline-block relative left-1 top-[2px]">
										<Icon name="external-link" className="w-[14px] h-[14px]" />
										<span className="sr-only">View code on GitHub</span>
									</span>
								) : null}
							</a>
						) : (
							<span key={`${title}-${child[0]}-${child[1] ?? ''}`}>
								{child[0]}: {child[1]}
							</span>
						)
					)}
				</span>
			</p>
		)
	}

	return (
		<>
			{adapter?.methodology ? (
				adapter?.methodologyURL ? (
					<a href={adapter.methodologyURL} target="_blank" rel="noopener noreferrer" className="hover:underline">
						<span className="font-medium">{title}:</span> <span>{adapter.methodology}</span>
						{adapter.methodologyURL ? (
							<span className="inline-block relative left-1 top-[2px]">
								<Icon name="external-link" className="w-[14px] h-[14px]" />
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
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Unlocks</h2>
			<div className="flex flex-col">
				{unlocks.recent ? (
					<div className="flex flex-col gap-1">
						<h3 className="py-1 border-b border-[#e6e6e6] dark:border-[#222324]">Last unlock event</h3>
						<p className="flex items-center justify-between gap-4">
							<span className="bg-[var(--app-bg)] rounded-md px-2 py-1 border border-[#e6e6e6] dark:border-[#222324]">
								{unlocks.recent.timestamp}
							</span>
							<span className="font-jetbrains">{formattedNum(unlocks.recent.amount)}</span>
						</p>
					</div>
				) : null}
				{unlocks.upcoming ? (
					<div className="flex flex-col gap-1">
						<h3 className="py-1 border-b border-[#e6e6e6] dark:border-[#222324]">Upcoming unlock event</h3>
						<p className="flex items-center justify-between gap-4">
							<span className="bg-[var(--app-bg)] rounded-md px-2 py-1 border border-[#e6e6e6] dark:border-[#222324]">
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
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Governance</h2>
			<div className="flex flex-col gap-1">
				<h3 className="py-1 border-b border-[#e6e6e6] dark:border-[#222324]">Last proposal</h3>
				<p className="flex items-center justify-between gap-4">
					<span>{governance.lastProposal.title}</span>
					<span
						className={`bg-[var(--app-bg)] rounded-md text-xs px-2 py-1 border border-[#e6e6e6] dark:border-[#222324] text-[var(--pct-green)] ${
							governance.lastProposal.status === 'Passed' ? 'text-[var(--pct-green)]' : 'text-[var(--pct-red)]'
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
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Yields</h2>
			<div>
				<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
					<span className="text-[#545757] dark:text-[#cccccc]">Pools Tracked</span>
					<span className="font-jetbrains">{yields.noOfPoolsTracked}</span>
				</p>
				<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
					<span className="text-[#545757] dark:text-[#cccccc]">Average APY</span>
					<span className="font-jetbrains">{formattedNum(yields.averageAPY, false)}%</span>
				</p>
			</div>
			<BasicLink
				href={`/yields?project=${
					props.otherProtocols ? props.otherProtocols.slice(1).join('&project=') : slug(props.name)
				}`}
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Yields</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}

function DevActivity(props: IProtocolOverviewPageData) {
	const devActivity = props.devMetrics
	if (!devActivity) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<div>
				<h2 className="font-semibold">Development Activity</h2>
				{devActivity.updatedAt != null ? (
					<p className="text-xs text-[#545757] dark:text-[#cccccc]">
						Updated at {dayjs(devActivity.updatedAt).format('MMM D, YYYY')}
					</p>
				) : null}
			</div>
			<div className="flex flex-col">
				{devActivity.weeklyCommits != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Weekly commits</span>
						<span className="font-jetbrains">{devActivity.weeklyCommits}</span>
					</p>
				) : null}
				{devActivity.monthlyCommits != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Monthly commits</span>
						<span className="font-jetbrains">{devActivity.monthlyCommits}</span>
					</p>
				) : null}
				{devActivity.weeklyDevelopers != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Weekly developers</span>
						<span className="font-jetbrains">{devActivity.weeklyDevelopers}</span>
					</p>
				) : null}
				{devActivity.monthlyDevelopers != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Monthly developers</span>
						<span className="font-jetbrains">{devActivity.monthlyDevelopers}</span>
					</p>
				) : null}
				{devActivity.lastCommit != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Last commit</span>
						<span className="font-jetbrains">{`${dayjs(devActivity.lastCommit).format('DD/MM/YY')} (${dayjs(
							devActivity.lastCommit
						).fromNow()})`}</span>
					</p>
				) : null}
			</div>
		</div>
	)
}

const Hacks = (props: IProtocolOverviewPageData) => {
	if (!props.hacks?.length) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Hacks</h2>
			<div className="flex items-center gap-4 flex-wrap">
				{props.hacks.map((hack) => (
					<div
						key={`${props.name}-hack-${hack.date}`}
						className="flex flex-col gap-1 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1 first:pt-0 last:pb-0"
					>
						{hack.date ? (
							<p>
								<span>Date: </span>
								<span>{dayjs(hack.date * 1e3).format('MMM D, YYYY')}</span>
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
						{hack.chain.length ? (
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
								className="underline flex items-center gap-1"
							>
								<span>Source</span>
								<Icon name="external-link" className="w-[14px] h-[14px]" />
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
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Competitors</h2>
			<div className="flex items-center gap-4 flex-wrap">
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

// hallmarks & total hacked

// % change tvl, mcap, token price, etc.
