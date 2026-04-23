import { useState } from 'react'
import { Icon } from '~/components/Icon'
import type {
	RiskTimelineAsset,
	RiskTimelineAssetDirection,
	RiskTimelineEntry,
	RiskTimelineResponse,
	RiskTimelineTag
} from './tokenRiskTimeline.types'

const TOKEN_RISK_TIMELINE_SECTION_ID = 'token-risk-timeline'
const INITIAL_ENTRY_LIMIT = 10

const FIRM_LABELS: Record<string, string> = {
	'llama-risk': 'Llama Risk',
	gauntlet: 'Gauntlet',
	'chaos-labs': 'Chaos Labs',
	credora: 'Credora',
	metrika: 'Metrika',
	'block-analitica': 'Block Analitica',
	openzeppelin: 'OpenZeppelin'
}

const DIRECTION_ARROW: Record<RiskTimelineAssetDirection, { symbol: string; className: string; label: string }> = {
	increase: { symbol: '↑', className: 'text-(--success)', label: 'Increase' },
	decrease: { symbol: '↓', className: 'text-(--error)', label: 'Decrease' },
	neutral: { symbol: '→', className: 'text-(--text-tertiary)', label: 'Neutral' }
}

const TAG_PILL: Record<RiskTimelineTag, string> = {
	'risk-manager': 'bg-(--primary)/15 text-(--primary)',
	contributor: 'bg-(--text-tertiary)/15 text-(--text-secondary)',
	community: 'border border-dashed border-(--cards-border) text-(--text-tertiary)'
}

const TAG_LABEL: Record<RiskTimelineTag, string> = {
	'risk-manager': 'risk manager',
	contributor: 'contributor',
	community: 'community'
}

function normalizeSymbol(symbol: string): string {
	return symbol.replace(/^\$/, '').toUpperCase()
}

function getAttribution(entry: RiskTimelineEntry): string {
	if (entry.firm && FIRM_LABELS[entry.firm]) return FIRM_LABELS[entry.firm]
	if (entry.firm === 'community' && entry.author) return `@${entry.author}`
	if (entry.author) return `@${entry.author}`
	return entry.firm || ''
}

const RELATIVE_UNITS: Array<{ ms: number; singular: string; plural: string }> = [
	{ ms: 365 * 24 * 60 * 60 * 1000, singular: 'year', plural: 'years' },
	{ ms: 30 * 24 * 60 * 60 * 1000, singular: 'month', plural: 'months' },
	{ ms: 7 * 24 * 60 * 60 * 1000, singular: 'week', plural: 'weeks' },
	{ ms: 24 * 60 * 60 * 1000, singular: 'day', plural: 'days' },
	{ ms: 60 * 60 * 1000, singular: 'hour', plural: 'hours' },
	{ ms: 60 * 1000, singular: 'minute', plural: 'minutes' }
]

function formatRelativeTime(iso: string): string {
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
	const diff = Date.now() - date.getTime()
	if (diff < 60 * 1000) return 'just now'
	for (const unit of RELATIVE_UNITS) {
		if (diff >= unit.ms) {
			const value = Math.floor(diff / unit.ms)
			return `${value} ${value === 1 ? unit.singular : unit.plural} ago`
		}
	}
	return 'just now'
}

function formatAbsoluteDate(iso: string): string {
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return iso
	return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function TimelineEntry({ entry, matchingAsset }: { entry: RiskTimelineEntry; matchingAsset: RiskTimelineAsset }) {
	const attribution = getAttribution(entry)
	const relativeDate = formatRelativeTime(entry.publishedAt)
	const absoluteDate = formatAbsoluteDate(entry.publishedAt)
	const arrow = DIRECTION_ARROW[matchingAsset.direction]

	return (
		<article className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--app-bg) p-3">
			<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-(--text-secondary)">
				<div className="flex flex-wrap items-center gap-2">
					<span
						className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${TAG_PILL[entry.tag]}`}
					>
						{TAG_LABEL[entry.tag]}
					</span>
					{attribution ? <span className="font-medium text-(--text-primary)">{attribution}</span> : null}
					{entry.source ? (
						<>
							<span aria-hidden="true">·</span>
							<span>{entry.source}</span>
						</>
					) : null}
				</div>
				<time dateTime={entry.publishedAt} title={absoluteDate} className="cursor-help">
					{relativeDate}
				</time>
			</div>

			<h3 className="flex items-baseline gap-2 text-base leading-snug font-semibold text-(--text-primary)">
				<span className={`shrink-0 font-bold ${arrow.className}`} aria-label={arrow.label} title={arrow.label}>
					{arrow.symbol}
				</span>
				{entry.url ? (
					<a
						href={entry.url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-baseline gap-1 hover:underline"
					>
						<span>{entry.title}</span>
						<Icon name="external-link" className="h-3 w-3 shrink-0 translate-y-[2px] text-(--text-tertiary)" />
					</a>
				) : (
					<span>{entry.title}</span>
				)}
			</h3>

			<p className="text-sm text-(--text-primary)">{matchingAsset.reasoning}</p>
		</article>
	)
}

type MatchedEntry = { entry: RiskTimelineEntry; matchingAsset: RiskTimelineAsset }

function pickMatchingEntries(entries: RiskTimelineEntry[], tokenSymbol: string): MatchedEntry[] {
	const target = normalizeSymbol(tokenSymbol)
	const result: MatchedEntry[] = []
	for (const entry of entries) {
		const matchingAsset = entry.assets.find((asset) => normalizeSymbol(asset.symbol) === target)
		if (matchingAsset) result.push({ entry, matchingAsset })
	}
	return result
}

export function TokenRiskTimelineSection({
	tokenSymbol,
	timelineData
}: {
	tokenSymbol: string
	timelineData: RiskTimelineResponse
}) {
	const [expanded, setExpanded] = useState(false)
	const matched = pickMatchingEntries(timelineData.entries, tokenSymbol)

	if (matched.length === 0) return null

	const visible = expanded ? matched : matched.slice(0, INITIAL_ENTRY_LIMIT)
	const remaining = matched.length - visible.length

	return (
		<section className="flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--cards-border) p-3">
				<div className="min-w-0">
					<h2
						className="group relative flex min-w-0 scroll-mt-24 items-center gap-1 text-xl font-bold"
						id={TOKEN_RISK_TIMELINE_SECTION_ID}
					>
						Risk Timeline
						<a
							aria-hidden="true"
							tabIndex={-1}
							href={`#${TOKEN_RISK_TIMELINE_SECTION_ID}`}
							className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
						/>
						<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
					</h2>
					<p className="mt-1 max-w-4xl text-sm text-(--text-secondary)">
						Risk-management actions published about {tokenSymbol} by tracked risk managers and governance contributors,
						newest first.
					</p>
				</div>
				<span className="rounded-full bg-(--app-bg) px-2.5 py-1 text-xs font-medium text-(--text-secondary)">
					{matched.length} action{matched.length === 1 ? '' : 's'}
				</span>
			</div>

			<div className="flex flex-col gap-3 p-3">
				{visible.map(({ entry, matchingAsset }, index) => (
					<TimelineEntry
						key={`${entry.url || entry.publishedAt}-${index}`}
						entry={entry}
						matchingAsset={matchingAsset}
					/>
				))}

				{remaining > 0 ? (
					<button
						type="button"
						onClick={() => setExpanded(true)}
						className="self-center rounded-md border border-(--cards-border) bg-(--app-bg) px-4 py-2 text-sm font-medium text-(--text-secondary) hover:bg-(--btn-hover-bg) hover:text-(--text-primary)"
					>
						Show {remaining} more action{remaining === 1 ? '' : 's'}
					</button>
				) : null}
			</div>
		</section>
	)
}
