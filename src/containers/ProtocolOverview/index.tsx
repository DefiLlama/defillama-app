import { useRouter } from 'next/router'
import { lazy, Suspense } from 'react'
import { useGetTokenPrice } from '~/api/client'
import { Bookmark } from '~/components/Bookmark'
import { Icon } from '~/components/Icon'
import { LinkPreviewCard } from '~/components/SEO'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum, tokenIconUrl } from '~/utils'
import { AdditionalInfo } from './AdditionalInfo'
import { Flag } from './Flag'
import { getPrimaryValueLabelType, useFinalTVL } from './helpers'
import { KeyMetrics } from './KeyMetrics'
import { ProtocolOverviewLayout } from './Layout'
import { ProtocolChartPanel } from './ProtocolChartPanel'
import type { IProtocolOverviewPageData } from './types'

const IncomeStatement = lazy(() => import('./IncomeStatement').then((module) => ({ default: module.IncomeStatement })))

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
