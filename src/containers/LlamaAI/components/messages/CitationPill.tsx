import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import type { FactCheckReference } from '~/containers/LlamaAI/types'
import { sanitizeUrl } from '~/containers/LlamaAI/utils/markdownHelpers'

interface CitationPillProps {
	reference: FactCheckReference
}

const WEB_SOURCE_PATTERN = /web|url|article|news|http/i
const DATA_SOURCE_PATTERN = /sql|warehouse|defillama|data/i

function sourceIcon(sourceType?: string): 'layers' | 'earth' | 'sparkles' {
	if (!sourceType) return 'sparkles'
	if (WEB_SOURCE_PATTERN.test(sourceType)) return 'earth'
	if (DATA_SOURCE_PATTERN.test(sourceType)) return 'layers'
	return 'sparkles'
}

function sourceBadge(sourceType?: string): string | null {
	if (!sourceType) return null
	if (WEB_SOURCE_PATTERN.test(sourceType)) return 'Web'
	if (/sql/i.test(sourceType)) return 'DB'
	if (/tweet|twitter|x_/i.test(sourceType)) return 'X'
	return sourceType.length <= 6 ? sourceType.toUpperCase() : 'Source'
}

export function CitationPill({ reference }: CitationPillProps) {
	const id = reference.id
	const hovercard = Ariakit.useHovercardStore({ placement: 'top', showTimeout: 120, hideTimeout: 180 })
	const iconName = sourceIcon(reference.sourceType)
	const badge = sourceBadge(reference.sourceType)
	const safeUrl =
		reference.url && WEB_SOURCE_PATTERN.test(reference.sourceType ?? '') ? sanitizeUrl(reference.url) : null

	return (
		<Ariakit.HovercardProvider store={hovercard}>
			<Ariakit.HovercardAnchor
				render={<button type="button" />}
				onClick={() => hovercard.toggle()}
				className="mx-px inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded-[4px] border border-[rgba(31,103,210,0.2)] bg-[rgba(31,103,210,0.08)] px-1 text-[11px] leading-none font-medium text-[#1f67d2] no-underline transition-colors hover:border-[rgba(31,103,210,0.45)] hover:bg-[rgba(31,103,210,0.18)] focus-visible:ring-2 focus-visible:ring-[#1f67d2]/40 focus-visible:outline-none"
				aria-label={reference.checked ? `Citation ${id ?? ''}: ${reference.checked}` : `Citation ${id ?? ''}`}
			>
				{id ?? '?'}
			</Ariakit.HovercardAnchor>
			<Ariakit.Hovercard
				portal
				gutter={6}
				className="z-50 flex max-w-[22rem] min-w-[18rem] flex-col gap-2.5 rounded-lg border border-[#e6e6e6] bg-white p-3 text-sm shadow-xl dark:border-[#222324] dark:bg-[#18181b]"
			>
				<div className="flex items-center gap-1.5">
					<Icon name={iconName} height={13} width={13} className="shrink-0 text-[#1f67d2]" />
					<span className="text-[11px] font-medium tracking-wide text-[#1f67d2] uppercase">{badge ?? 'Source'}</span>
					{reference.asOf ? (
						<span className="ml-auto text-[11px] text-[#888] dark:text-[#777]">As of {reference.asOf}</span>
					) : null}
				</div>

				{reference.checked ? (
					<p className="m-0 text-sm leading-snug font-medium text-[#111] dark:text-white">{reference.checked}</p>
				) : null}

				{reference.evidence && reference.evidence.length > 0 ? (
					<ul className="m-0 flex list-disc flex-col gap-0.5 pl-4 text-xs text-[#444] dark:text-[#ccc]">
						{reference.evidence.map((item, i) => (
							<li key={i}>{item}</li>
						))}
					</ul>
				) : null}

				{reference.label || reference.detail ? (
					<div className="border-t border-[#eee] pt-2 dark:border-[#222324]">
						{reference.label ? (
							<p className="m-0 text-[11px] font-medium text-[#555] dark:text-[#aaa]">{reference.label}</p>
						) : null}
						{reference.detail ? (
							<p className="m-0 text-[11px] text-[#888] dark:text-[#777]">{reference.detail}</p>
						) : null}
					</div>
				) : null}

				{safeUrl ? (
					<a
						href={safeUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="-mt-1 text-xs text-(--link-text) hover:underline"
					>
						Open source ↗
					</a>
				) : null}
			</Ariakit.Hovercard>
		</Ariakit.HovercardProvider>
	)
}
