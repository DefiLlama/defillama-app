import * as Ariakit from '@ariakit/react'
import dayjs from 'dayjs'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Menu } from '~/components/Menu'
import { MetricRow } from '~/components/MetricPrimitives'
import { QuestionHelper } from '~/components/QuestionHelper'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { formattedNum, slug } from '~/utils'
import type { IProtocolOverviewPageData } from './types'

const EMPTY_COMPETITORS: Array<{ name: string; tvl: number }> = []

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((module) => ({ default: module.SubscribeProModal }))
)

interface SectionHeaderProps {
	id: string
	children: React.ReactNode
}

const SectionHeader = ({ id, children }: SectionHeaderProps) => (
	<h2 className="group relative flex items-center gap-1 text-base font-semibold" id={id}>
		{children}
		<a
			aria-hidden="true"
			tabIndex={-1}
			href={`#${id}`}
			className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
		/>
		<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
	</h2>
)

export const AdditionalInfo = (props: IProtocolOverviewPageData) => {
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

function Users(props: IProtocolOverviewPageData) {
	const users = props.users
	if (!users) return null

	return (
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
				{users.activeUsers != null ? (
					<MetricRow label="Active Addresses (24h)" value={formattedNum(users.activeUsers, false)} />
				) : null}
				{users.newUsers != null ? (
					<MetricRow label="New Addresses (24h)" value={formattedNum(users.newUsers, false)} />
				) : null}
				{users.transactions != null ? (
					<MetricRow label="Transactions (24h)" value={formattedNum(users.transactions, false)} />
				) : null}
				{users.gasUsd != null ? <MetricRow label="Gas Used (24h)" value={formattedNum(users.gasUsd, true)} /> : null}
			</div>
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
