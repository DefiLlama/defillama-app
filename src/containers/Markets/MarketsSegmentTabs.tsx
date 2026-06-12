import { SEGMENTS } from './segments'
import type { Segment } from './types'

interface MarketsSegmentTabsProps {
	activeSegment: Segment
	onChange: (segment: Segment) => void
	/** optional per-segment subtitle, e.g. "412 assets · $1.2B" */
	subtitleFor?: (segment: Segment) => string | null
	/** when provided, only these segments are shown (e.g. hide inverse perp when a venue has none) */
	availableSegments?: ReadonlyArray<Segment>
}

export function MarketsSegmentTabs({
	activeSegment,
	onChange,
	subtitleFor,
	availableSegments
}: MarketsSegmentTabsProps) {
	const tabs = availableSegments ? SEGMENTS.filter((s) => availableSegments.includes(s.id)) : SEGMENTS
	if (tabs.length === 0) return null
	return (
		<div
			className="flex items-center overflow-x-auto border-b border-(--cards-border)"
			role="tablist"
			aria-label="Market segment"
		>
			{tabs.map((segment) => {
				const isActive = segment.id === activeSegment
				const subtitle = subtitleFor?.(segment.id) ?? null
				return (
					<button
						key={segment.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						data-active={isActive}
						onClick={() => onChange(segment.id)}
						className="flex shrink-0 flex-col items-start gap-0.5 border-b-2 border-transparent px-4 py-2 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
					>
						<span
							data-active={isActive}
							className="text-xs font-semibold tracking-wider text-(--text-label) uppercase data-[active=true]:text-(--text-primary)"
						>
							{segment.label}
						</span>
						{subtitle ? <span className="font-jetbrains text-[11px] text-(--text-label)">{subtitle}</span> : null}
					</button>
				)
			})}
		</div>
	)
}
