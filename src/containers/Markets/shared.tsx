import { BasicLink } from '~/components/Link'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum, slug } from '~/utils'
import { type Sentiment, SENTIMENT_TITLE } from './utils'

export { ChangeCell, renderUsd } from './marketMetrics'

export type KnownTokenSlugs = ReadonlySet<string>

function categoryHref(tag: string): string {
	return `/markets?category=${encodeURIComponent(tag)}`
}

export function tokenHref(base: string): string {
	return `/token/${encodeURIComponent(slug(base))}`
}

export function isKnownTokenSlug(base: string, knownTokenSlugs: KnownTokenSlugs | undefined): boolean {
	const tokenSlug = slug(base)
	return tokenSlug.length > 0 && Boolean(knownTokenSlugs?.has(tokenSlug))
}

function exchangeHref(exchange: string): string {
	return `/markets?exchange=${encodeURIComponent(exchange)}`
}

/** Exchange name linking to the exchange page. */
export function ExchangeName({ exchange }: { exchange: string }) {
	return (
		<BasicLink
			href={exchangeHref(exchange)}
			shallow
			className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) capitalize hover:underline"
		>
			{exchange}
		</BasicLink>
	)
}

const VENUE_BADGE_CLASS: Record<'cex' | 'dex', string> = {
	cex: 'border-[#4493f8] text-[#4493f8]',
	dex: 'border-[#c084fc] text-[#c084fc]'
}

/** Small colour-coded cex/dex venue-type badge. */
export function VenueBadge({ type }: { type: 'cex' | 'dex' }) {
	return (
		<span className={`rounded border px-1.5 py-0.5 text-[10px] tracking-wider uppercase ${VENUE_BADGE_CLASS[type]}`}>
			{type}
		</span>
	)
}

export function CategoryLink({ tag }: { tag: string }) {
	return (
		<BasicLink
			href={categoryHref(tag)}
			shallow
			className="text-sm font-medium text-(--link-text) capitalize hover:underline"
		>
			{tag}
		</BasicLink>
	)
}

/** Asset symbol linking to the token page. */
export function TokenName({ base, knownTokenSlugs }: { base: string; knownTokenSlugs?: KnownTokenSlugs }) {
	const label = (
		<span className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap uppercase">{base}</span>
	)

	if (!isKnownTokenSlug(base, knownTokenSlugs)) {
		return <span className="text-(--text-primary)">{label}</span>
	}

	return (
		<BasicLink
			href={tokenHref(base)}
			className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) uppercase hover:underline"
		>
			{label}
		</BasicLink>
	)
}

export function TagPills({ tags, max = 3 }: { tags: string[]; max?: number }) {
	if (!tags || tags.length === 0) return <span className="text-(--text-disabled)">–</span>
	return (
		<span className="flex flex-wrap gap-1">
			{tags.slice(0, max).map((tag) => (
				<BasicLink
					key={tag}
					href={categoryHref(tag)}
					shallow
					className="rounded border border-(--cards-border) px-1.5 py-0.5 text-[10px] text-(--text-label) hover:border-(--text-primary) hover:text-(--text-primary)"
				>
					{tag}
				</BasicLink>
			))}
		</span>
	)
}

/** USD value, dash when null. */
export function renderPrice(value: number | null | undefined): string {
	if (value == null) return '–'
	return formattedNum(value, true)
}

export function renderFunding8h(rate: number | null | undefined): string {
	if (rate == null) return '–'
	return `${(rate * 100).toFixed(4)}%`
}

export function renderLeverage(min: number | null | undefined, max: number | null | undefined): string {
	if (max == null || !(max > 0)) return '–'
	const fmt = (n: number) => (n >= 10 ? n.toFixed(0) : String(Math.round(n * 10) / 10))
	const text = min != null && min !== max ? `${fmt(min)}–${fmt(max)}` : fmt(max)
	return `${text}×`
}

const SENTIMENT_CLASS: Record<Sentiment, string> = {
	rising: 'border-(--success) text-(--success)',
	fading: 'border-(--error) text-(--error)',
	churn: 'border-(--cards-border) text-(--text-label)',
	building: 'border-(--cards-border) text-(--text-primary)',
	flat: 'border-(--cards-border) text-(--text-disabled)'
}

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
	return (
		<Tooltip content={SENTIMENT_TITLE[sentiment]}>
			<span
				className={`inline-block rounded border px-1.5 py-0.5 text-[10px] tracking-wider uppercase ${SENTIMENT_CLASS[sentiment]}`}
			>
				{sentiment}
			</span>
		</Tooltip>
	)
}
