import { SEO } from '~/components/SEO'
import { ProtocolOverviewLayout } from './Layout'
import { CardType, IProtocolOverviewPageData } from './types'
import { formattedNum, tokenIconUrl } from '~/utils'
import { useEffect, useMemo, useRef, useState } from 'react'
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
				<div className="hidden xl:flex flex-col gap-6 col-span-1 row-[2_/_3] xl:row-[1_/_2] bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 h-fit xl:min-h-[360px]">
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
					<KeyMetricsAndProtocolInfo {...props} formatPrice={formatPrice} />
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
						<div className="min-h-[360px]"></div>
					</div>
					<div className="col-span-full flex flex-col gap-6 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:hidden">
						<KeyMetricsAndProtocolInfo {...props} formatPrice={formatPrice} />
					</div>
					<div className="col-span-full">
						<MasonryLayout cards={props.cards} props={props} />
					</div>
				</div>
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
			<div className="flex flex-col text-xs my-3 max-h-[50vh] overflow-auto">
				{tvlByChain.map(([chain, tvl]) => (
					<p
						key={`${chain}-${tvl}-${name}`}
						className="flex items-center justify-between gap-1 border-b border-[#e6e6e6] dark:border-[#222224] last:border-none py-1"
					>
						<span className="text-[#545757] dark:text-[#cccccc]">{chain}</span>
						<span className="font-jetbrains">{formatPrice(tvl)}</span>
					</p>
				))}
			</div>
		</details>
	)
}
const KeyMetricsAndProtocolInfo = (
	props: IProtocolOverviewPageData & { formatPrice: (value: number | string | null) => string | number | null }
) => {
	if (!props.hasKeyMetrics) return null
	return (
		<>
			<div className="flex flex-col gap-2">
				<h2 className="font-semibold">Key Metrics</h2>
				<div className="flex flex-col">
					{props.tokenCGData?.marketCap?.current ? (
						<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
							<span className="text-[#545757] dark:text-[#cccccc]">Market Cap</span>
							<span className="font-jetbrains">{formattedNum(props.tokenCGData.marketCap.current, true)}</span>
						</p>
					) : null}
					{props.tokenCGData?.price?.current ? (
						props.tokenCGData.price.ath || props.tokenCGData.price.atl ? (
							<details className="group">
								<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
									<span className="text-[#545757] dark:text-[#cccccc]">{`${
										props.token?.symbol ? `$${props.token.symbol}` : 'Token'
									} Price`}</span>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
									/>
									<span className="font-jetbrains ml-auto">{formattedNum(props.tokenCGData.price.current, true)}</span>
								</summary>
								<div className="flex flex-col text-xs mb-3">
									<p className="flex items-center justify-between gap-1 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
										<span className="text-[#545757] dark:text-[#cccccc]">All Time High</span>
										<span className="font-jetbrains">{formattedNum(props.tokenCGData.price.ath, true)}</span>
									</p>
									<p className="flex items-center justify-between gap-1 border-b border-[#e6e6e6] dark:border-[#222224] last:border-none py-1">
										<span className="text-[#545757] dark:text-[#cccccc]">All Time Low</span>
										<span className="font-jetbrains">{formattedNum(props.tokenCGData.price.atl, true)}</span>
									</p>
								</div>
							</details>
						) : (
							<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
								<span className="text-[#545757] dark:text-[#cccccc]">{`${
									props.token?.symbol ? `$${props.token.symbol}` : 'Token'
								} Price`}</span>
								<span className="font-jetbrains">{formattedNum(props.tokenCGData.price.current, true)}</span>
							</p>
						)
					) : null}
					{props.tokenCGData?.fdv?.current ? (
						<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
							<Tooltip
								className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
								content={`Fully Diluted Valuation, this is calculated by taking the expected maximum supply of the token and multiplying it by the price. It's mainly used to calculate the hypothetical marketcap of the token if all the tokens were unlocked and circulating.\n\nData for this metric is imported directly from coingecko.`}
							>
								Fully Diluted Valuation
							</Tooltip>
							<span className="font-jetbrains">{formattedNum(props.tokenCGData.fdv.current, true)}</span>
						</p>
					) : null}
					{props.tokenCGData.volume24h?.total ? (
						<details className="group">
							<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
								<span className="text-[#545757] dark:text-[#cccccc]">{`24h ${
									props.token?.symbol ? `$${props.token.symbol}` : 'Token'
								} Volume`}</span>
								<Icon
									name="chevron-down"
									height={16}
									width={16}
									className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
								/>
								<span className="font-jetbrains ml-auto">{formattedNum(props.tokenCGData.volume24h.total, true)}</span>
							</summary>
							<div className="flex flex-col text-xs mb-3">
								<p className="flex items-center justify-between gap-1 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
									<span className="text-[#545757] dark:text-[#cccccc]">CEX Volume</span>
									<span className="font-jetbrains">
										{props.tokenCGData.volume24h.cex ? formattedNum(props.tokenCGData.volume24h.cex, true) : '-'}
									</span>
								</p>
								<p className="flex items-center justify-between gap-1 border-b border-[#e6e6e6] dark:border-[#222224] last:border-none py-1">
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
					{props.currentTvlByChain?.staking != null ? (
						<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
							<span className="text-[#545757] dark:text-[#cccccc]">Staked</span>
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
						<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
							<span className="text-[#545757] dark:text-[#cccccc]">Borrowed</span>
							<span className="font-jetbrains">{formattedNum(props.currentTvlByChain.borrowed, true)}</span>
						</p>
					) : null}
					{props.tokenLiquidity ? (
						<details className="group">
							<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
								<Tooltip
									content="Sum of value locked in DEX pools that include that token across all DEXs for which DefiLlama tracks pool data."
									className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
								>
									{`${props.token?.symbol ? `$${props.token.symbol}` : 'Token'} Liquidity`}
								</Tooltip>
								<Icon
									name="chevron-down"
									height={16}
									width={16}
									className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
								/>
								<span className="font-jetbrains ml-auto">{formattedNum(props.tokenLiquidity.total, true)}</span>
							</summary>
							<div className="flex flex-col text-xs mb-3">
								{props.tokenLiquidity?.pools.map((pool) => (
									<p
										key={`${pool[0]}-${pool[1]}-${pool[2]}`}
										className="flex items-center justify-between gap-1 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1"
									>
										<span className="text-[#545757] dark:text-[#cccccc]">{pool[0]}</span>
										<span className="font-jetbrains">{formattedNum(pool[2], true)}</span>
									</p>
								))}
							</div>
						</details>
					) : null}
					{props.raises?.length ? (
						<details className="group">
							<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
								<span className="text-[#545757] dark:text-[#cccccc]">Total Raised</span>
								<Icon
									name="chevron-down"
									height={16}
									width={16}
									className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
								/>
								<span className="font-jetbrains ml-auto">
									{formattedNum(props.raises.reduce((sum, r) => sum + Number(r.amount), 0) * 1_000_000, true)}
								</span>
							</summary>
							<div className="flex flex-col text-xs mb-3">
								{props.raises.map((raise) => (
									<p
										className="flex flex-col gap-1 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1"
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
					) : null}
					{props.expenses ? (
						<details className="group">
							<summary className="flex flex-wrap justify-start gap-4 border-b border-[#e6e6e6] dark:border-[#222324] group-last:border-none py-1">
								<span className="text-[#545757] dark:text-[#cccccc]">Annual Operational Expenses</span>
								<Icon
									name="chevron-down"
									height={16}
									width={16}
									className="group-open:rotate-180 transition-transform duration-100 relative top-[2px] -ml-3"
								/>
								<span className="font-jetbrains ml-auto">{formattedNum(props.expenses.total, true)}</span>
							</summary>
							<div className="flex flex-col text-xs mb-3">
								<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
									<span className="text-[#545757] dark:text-[#cccccc]">Headcount</span>
									<span className="font-jetbrains">{formattedNum(props.expenses.headcount)}</span>
								</p>
								{props.expenses.annualUsdCost.map(([category, amount]) => (
									<p
										className="flex flex-col gap-1 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1"
										key={`${props.name}-expenses-${category}-${amount}`}
									>
										<span className="flex flex-wrap justify-between">
											<span className="text-[#545757] dark:text-[#cccccc]">{category}</span>
											<span className="font-jetbrains">{formattedNum(amount, true)}</span>
										</span>
									</p>
								))}
								{props.expenses?.sources?.length ? (
									<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1 text-[#545757] dark:text-[#cccccc]">
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
									<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1 text-[#545757] dark:text-[#cccccc]">
										<span className="text-[#545757] dark:text-[#cccccc]">Notes</span>
										<span>{props.expenses.notes?.join(', ') ?? ''}</span>
									</p>
								) : null}
								{props.expenses?.lastUpdate ? (
									<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1 text-[#545757] dark:text-[#cccccc]">
										<span className="text-[#545757] dark:text-[#cccccc]">Last Update</span>
										<span>{dayjs(props.expenses.lastUpdate).format('MMM D, YYYY')}</span>
									</p>
								) : null}
							</div>
						</details>
					) : null}
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<h2 className="font-semibold">Protocol Information</h2>
				{props.description ? <p>{props.description}</p> : null}
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
			<div className="flex flex-col gap-2">
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
			<Articles {...props} />
		</>
	)
}

const Articles = (props: IProtocolOverviewPageData) => {
	if (!props.articles) return null

	return (
		<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-2">
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

function Treasury(props: IProtocolOverviewPageData) {
	const treasury = props.treasury
	if (!treasury) return null

	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Treasury</h2>
			<div className="flex flex-col">
				{treasury.majors ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">
							<Tooltip content="BTC, ETH" className="border-b border-[#e6e6e6] dark:border-[#222324] border-dashed">
								Majors
							</Tooltip>
						</span>
						<span className="font-jetbrains">{formattedNum(treasury.majors, true)}</span>
					</p>
				) : null}
				{treasury.stablecoins ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Stablecoins</span>
						<span className="font-jetbrains">{formattedNum(treasury.stablecoins, true)}</span>
					</p>
				) : null}
				{treasury.ownTokens ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Own Tokens</span>
						<span className="font-jetbrains">{formattedNum(treasury.ownTokens, true)}</span>
					</p>
				) : null}
				{treasury.others ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Others</span>
						<span className="font-jetbrains">{formattedNum(treasury.others, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/treasuries"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Treasury</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}

function Fees(props: IProtocolOverviewPageData) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const fees = props.fees
	const bribeRevenue = props.bribeRevenue
	const tokenTax = props.tokenTax
	const feesExists = fees?.totalAllTime != null || bribeRevenue?.totalAllTime != null || tokenTax?.totalAllTime != null

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

	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Fees</h2>
			<div className="flex flex-col">
				{fees30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Fees (Annualized)
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(fees30d * 12.2, true)}</span>
					</p>
				) : null}
				{fees30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total fees paid by users in the last 30 days, updated daily at 00:00UTC"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Fees 30d
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(fees30d, true)}</span>
					</p>
				) : null}
				{fees24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total fees paid by users in the last 24 hours, updated daily at 00:00UTC"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Fees 24h
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(fees24h, true)}</span>
					</p>
				) : null}
				{feesAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total fees paid by users since the protocol was launched"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#2222324] border-dashed"
						>
							Cumulative Fees
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(feesAllTime, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/fees"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Fees</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}
function Revenue(props: IProtocolOverviewPageData) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const revenue = props.revenue
	const bribeRevenue = props.bribeRevenue
	const tokenTax = props.tokenTax
	const revenueExists =
		revenue?.totalAllTime != null || bribeRevenue?.totalAllTime != null || tokenTax?.totalAllTime != null

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

	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Revenue</h2>
			<div className="flex flex-col">
				{revenue30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Revenue (Annualized)
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(revenue30d * 12.2, true)}</span>
					</p>
				) : null}
				{revenue30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total revenue earned by the protocol in the last 30 days, updated daily at 00:00UTC"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Revenue 30d
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(revenue30d, true)}</span>
					</p>
				) : null}
				{revenue24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total revenue earned by the protocol in the last 24 hours, updated daily at 00:00UTC"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Revenue 24h
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(revenue24h, true)}</span>
					</p>
				) : null}
				{revenueAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total revenue earned by the protocol since the protocol was launched"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#2222324] border-dashed"
						>
							Cumulative Revenue
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(revenueAllTime, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/revenue"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Revenue</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}
function HoldersRevenue(props: IProtocolOverviewPageData) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const holdersRevenue = props.holdersRevenue
	const bribeRevenue = props.bribeRevenue
	const tokenTax = props.tokenTax
	const holdersRevenueExists =
		holdersRevenue?.totalAllTime != null || bribeRevenue?.totalAllTime != null || tokenTax?.totalAllTime != null

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

	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Holders Revenue</h2>
			<div className="flex flex-col">
				{holdersRevenue30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Holders Revenue (Annualized)
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(holdersRevenue30d * 12.2, true)}</span>
					</p>
				) : null}
				{holdersRevenue30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total revenue that is distributed to protocol's token holders in the last 30 days, updated daily at 00:00UTC"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Holders Revenue 30d
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(holdersRevenue30d, true)}</span>
					</p>
				) : null}
				{holdersRevenue24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total revenue that is distributed to protocol's token holders in the last 24 hours, updated daily at 00:00UTC"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Holders Revenue 24h
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(holdersRevenue24h, true)}</span>
					</p>
				) : null}
				{holdersRevenueAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total revenue that is distributed to protocol's token holders since the protocol was launched"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#2222324] border-dashed"
						>
							Cumulative Holders Revenue
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(holdersRevenueAllTime, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/holders-revenue"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Holders Revenue</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}

function Incentives(props: IProtocolOverviewPageData) {
	const incentivesData = props.incentives
	if (!incentivesData) return null

	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Incentives</h2>
			<div className="flex flex-col">
				{incentivesData.emissions30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Incentives (Annualized)
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(incentivesData.emissions30d * 12.2, true)}</span>
					</p>
				) : null}
				{incentivesData.emissions30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total incentives distributed by the protocol in the last 30 days, updated daily at 00:00UTC"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Incentives 30d
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(incentivesData.emissions30d, true)}</span>
					</p>
				) : null}
				{incentivesData.emissions24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total incentives distributed by the protocol in the last 24 hours, updated daily at 00:00UTC"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Incentives 24h
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(incentivesData.emissions24h, true)}</span>
					</p>
				) : null}
				{incentivesData.emissionsAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total incentives distributed by the protocol since the protocol was launched"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#2222324] border-dashed"
						>
							Cumulative Incentives
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(incentivesData.emissionsAllTime, true)}</span>
					</p>
				) : null}
			</div>
		</div>
	)
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

	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Earnings</h2>
			<div className="flex flex-col">
				{earnings30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="This is calculated by taking data from the last 30 days and multiplying it by 12 to annualize it"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Earnings (Annualized)
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(earnings30d * 12.2, true)}</span>
					</p>
				) : null}
				{earnings30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total earnings (revenue - incentives) of the protocol in the last 30 days, updated daily at 00:00UTC"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Earnings 30d
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(earnings30d, true)}</span>
					</p>
				) : null}
				{earnings24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total earnings (revenue - incentives) of the protocol in the last 24 hours, updated daily at 00:00UTC"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#222324] border-dashed"
						>
							Earnings 24h
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(earnings24h, true)}</span>
					</p>
				) : null}
				{earningsAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<Tooltip
							content="Total earnings (revenue - incentives) of the protocol since the protocol was launched"
							className="text-[#545757] dark:text-[#cccccc] border-b border-[#e6e6e6] dark:border-[#2222324] border-dashed"
						>
							Cumulative Earnings
						</Tooltip>
						<span className="font-jetbrains">{formattedNum(earningsAllTime, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/earnings"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Earnings</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
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
							<span className="bg-[var(--app-bg)] rounded-md text-xs px-2 py-1 border border-[#e6e6e6] dark:border-[#222324]">
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
							<span className="bg-[var(--app-bg)] rounded-md text-xs px-2 py-1 border border-[#e6e6e6] dark:border-[#222324]">
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
				href="/yields"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Yields</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}

function DexVolume(props: IProtocolOverviewPageData) {
	const dexVolume = props.dexVolume
	if (!dexVolume) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">DEX Volume</h2>
			<div className="flex flex-col">
				{dexVolume.total30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 30d</span>
						<span className="font-jetbrains">{formattedNum(dexVolume.total30d, true)}</span>
					</p>
				) : null}
				{dexVolume.total24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 24h</span>
						<span className="font-jetbrains">{formattedNum(dexVolume.total24h, true)}</span>
					</p>
				) : null}
				{dexVolume.totalAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Cumulative Volume</span>
						<span className="font-jetbrains">{formattedNum(dexVolume.totalAllTime, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/dexs"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all DEX Volume</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}

function DexAggregatorVolume(props: IProtocolOverviewPageData) {
	const dexAggregatorVolume = props.dexAggregatorVolume
	if (!dexAggregatorVolume) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">DEX Volume</h2>
			<div className="flex flex-col">
				{dexAggregatorVolume.total30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 30d</span>
						<span className="font-jetbrains">{formattedNum(dexAggregatorVolume.total30d, true)}</span>
					</p>
				) : null}
				{dexAggregatorVolume.total24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 24h</span>
						<span className="font-jetbrains">{formattedNum(dexAggregatorVolume.total24h, true)}</span>
					</p>
				) : null}
				{dexAggregatorVolume.totalAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Cumulative Volume</span>
						<span className="font-jetbrains">{formattedNum(dexAggregatorVolume.totalAllTime, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/dex-aggregators"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all DEX Aggregator Volume</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}

function PerpVolume(props: IProtocolOverviewPageData) {
	const perpVolume = props.perpVolume
	if (!perpVolume) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Perp Volume</h2>
			<div className="flex flex-col">
				{perpVolume.total30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 30d</span>
						<span className="font-jetbrains">{formattedNum(perpVolume.total30d, true)}</span>
					</p>
				) : null}
				{perpVolume.total24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 24h</span>
						<span className="font-jetbrains">{formattedNum(perpVolume.total24h, true)}</span>
					</p>
				) : null}
				{perpVolume.totalAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Cumulative Volume</span>
						<span className="font-jetbrains">{formattedNum(perpVolume.totalAllTime, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/perps"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Perp Volume</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}

function PerpAggregatorVolume(props: IProtocolOverviewPageData) {
	const perpAggregatorVolume = props.perpAggregatorVolume
	if (!perpAggregatorVolume) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Perp Aggregator Volume</h2>
			<div className="flex flex-col">
				{perpAggregatorVolume.total30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 30d</span>
						<span className="font-jetbrains">{formattedNum(perpAggregatorVolume.total30d, true)}</span>
					</p>
				) : null}
				{perpAggregatorVolume.total24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 24h</span>
						<span className="font-jetbrains">{formattedNum(perpAggregatorVolume.total24h, true)}</span>
					</p>
				) : null}
				{perpAggregatorVolume.totalAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Cumulative Volume</span>
						<span className="font-jetbrains">{formattedNum(perpAggregatorVolume.totalAllTime, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/perps-aggregators"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Perp Aggregator Volume</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}

function BridgeAggregatorVolume(props: IProtocolOverviewPageData) {
	const bridgeAggregatorVolume = props.bridgeAggregatorVolume
	if (!bridgeAggregatorVolume) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Bridge Aggregator Volume</h2>
			<div className="flex flex-col">
				{bridgeAggregatorVolume.total30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 30d</span>
						<span className="font-jetbrains">{formattedNum(bridgeAggregatorVolume.total30d, true)}</span>
					</p>
				) : null}
				{bridgeAggregatorVolume.total24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 24h</span>
						<span className="font-jetbrains">{formattedNum(bridgeAggregatorVolume.total24h, true)}</span>
					</p>
				) : null}
				{bridgeAggregatorVolume.totalAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Cumulative Volume</span>
						<span className="font-jetbrains">{formattedNum(bridgeAggregatorVolume.totalAllTime, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/bridge-aggregators"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Bridge Aggregator Volume</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}

function OptionsPremiumVolume(props: IProtocolOverviewPageData) {
	const optionsPremiumVolume = props.optionsPremiumVolume
	if (!optionsPremiumVolume) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Options Premium Volume</h2>
			<div className="flex flex-col">
				{optionsPremiumVolume.total30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 30d</span>
						<span className="font-jetbrains">{formattedNum(optionsPremiumVolume.total30d, true)}</span>
					</p>
				) : null}
				{optionsPremiumVolume.total24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 24h</span>
						<span className="font-jetbrains">{formattedNum(optionsPremiumVolume.total24h, true)}</span>
					</p>
				) : null}
				{optionsPremiumVolume.totalAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Cumulative Volume</span>
						<span className="font-jetbrains">{formattedNum(optionsPremiumVolume.totalAllTime, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/options/premium-volume"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Options Premium Volume</span>
				<Icon name="arrow-right" className="w-4 h-4" />
			</BasicLink>
		</div>
	)
}
function OptionsNotionalVolume(props: IProtocolOverviewPageData) {
	const optionsNotionalVolume = props.optionsNotionalVolume
	if (!optionsNotionalVolume) return null
	return (
		<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
			<h2 className="font-semibold">Options Notional Volume</h2>
			<div className="flex flex-col">
				{optionsNotionalVolume.total30d != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 30d</span>
						<span className="font-jetbrains">{formattedNum(optionsNotionalVolume.total30d, true)}</span>
					</p>
				) : null}
				{optionsNotionalVolume.total24h != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Volume 24h</span>
						<span className="font-jetbrains">{formattedNum(optionsNotionalVolume.total24h, true)}</span>
					</p>
				) : null}
				{optionsNotionalVolume.totalAllTime != null ? (
					<p className="flex flex-wrap justify-between gap-4 border-b border-[#e6e6e6] dark:border-[#222324] last:border-none py-1">
						<span className="text-[#545757] dark:text-[#cccccc]">Cumulative Volume</span>
						<span className="font-jetbrains">{formattedNum(optionsNotionalVolume.totalAllTime, true)}</span>
					</p>
				) : null}
			</div>
			<BasicLink
				href="/options/notional-volume"
				className="text-xs mr-auto py-1 px-2 rounded-full border border-[var(--primary-color)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-1"
			>
				<span>View all Options Notional Volume</span>
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
						Updated at {dayjs(devActivity.updatedAt).format('DD/MM/YY')}
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

function Users(props: IProtocolOverviewPageData) {
	const users = props.users
	if (!users) return null
	return (
		<div>
			<div className="col-span-1 flex flex-col gap-2 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-2 xl:p-4">
				<Tooltip
					content="This only counts users that interact with protocol directly (so not through another contract, such as a dex aggregator), and only on arbitrum, avax, bsc, ethereum, xdai, optimism, polygon."
					className="font-semibold border-b border-[#e6e6e6] dark:border-[#222324] border-dashed mr-auto"
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

interface MasonryLayoutProps {
	cards: CardType[]
	props: IProtocolOverviewPageData
}

const MasonryLayout = ({ cards, props }: MasonryLayoutProps) => {
	const containerRef = useRef<HTMLDivElement>(null)
	const [columns, setColumns] = useState<CardType[][]>([])
	const [numColumns, setNumColumns] = useState(1)

	useEffect(() => {
		const calculateColumns = () => {
			if (!containerRef.current) return

			const containerWidth = containerRef.current.offsetWidth
			const cardWidth = 360 // Approximate card width
			const gap = 8

			// Calculate how many columns can fit
			const calculatedColumns = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)))
			setNumColumns(calculatedColumns)
		}

		calculateColumns()
		window.addEventListener('resize', calculateColumns)
		return () => window.removeEventListener('resize', calculateColumns)
	}, [])

	useEffect(() => {
		// Distribute cards into columns (left to right)
		const newColumns: CardType[][] = Array.from({ length: numColumns }, () => [])

		cards.forEach((card, index) => {
			const columnIndex = index % numColumns
			newColumns[columnIndex].push(card)
		})

		setColumns(newColumns)
	}, [cards, numColumns])

	const renderCard = (card: CardType) => {
		switch (card) {
			case 'fees':
				return <Fees {...props} />
			case 'revenue':
				return <Revenue {...props} />
			case 'holdersRevenue':
				return <HoldersRevenue {...props} />
			case 'incentives':
				return <Incentives {...props} />
			case 'earnings':
				return <Earnings {...props} />
			case 'treasury':
				return <Treasury {...props} />
			case 'unlocks':
				return <Unlocks {...props} />
			case 'governance':
				return <Governance {...props} />
			case 'yields':
				return <Yields {...props} />
			case 'dexVolume':
				return <DexVolume {...props} />
			case 'dexAggregatorVolume':
				return <DexAggregatorVolume {...props} />
			case 'perpVolume':
				return <PerpVolume {...props} />
			case 'perpAggregatorVolume':
				return <PerpAggregatorVolume {...props} />
			case 'bridgeAggregatorVolume':
				return <BridgeAggregatorVolume {...props} />
			case 'optionsPremiumVolume':
				return <OptionsPremiumVolume {...props} />
			case 'optionsNotionalVolume':
				return <OptionsNotionalVolume {...props} />
			case 'devActivity':
				return <DevActivity {...props} />
			case 'users':
				return <Users {...props} />
			default:
				return null
		}
	}

	return (
		<div ref={containerRef} className="flex gap-2">
			{columns.map((column, columnIndex) => (
				<div key={columnIndex} className="flex flex-col gap-2 flex-1">
					{column.map((card, cardIndex) => (
						<div key={`${columnIndex}-${cardIndex}-${card}`}>{renderCard(card)}</div>
					))}
				</div>
			))}
		</div>
	)
}

// unlocks
// governance
// token information

// hallmarks & total hacked
// hacks
