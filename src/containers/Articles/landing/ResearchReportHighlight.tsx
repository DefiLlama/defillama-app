import React, { type CSSProperties } from 'react'
import { ReadMoreLink } from '~/containers/Articles/landing/ReadMoreLink'
import { useSharedHeight } from '~/containers/Articles/landing/ResearchSectionWithSharedHeight'
import { TitleLine } from '~/containers/Articles/landing/TitleLine'
import { articleHref } from '~/containers/Articles/landing/utils'
import type { ArticleDocument } from '~/containers/Articles/types'

interface ResearchReportHighlightProps {
	highlight: ArticleDocument
	sharedHeight?: number
}

interface ResearchReportHighlightWithHeightProps {
	highlight: ArticleDocument
}

export const ResearchReportHighlight: React.FC<ResearchReportHighlightProps> = ({ highlight, sharedHeight }) => {
	const coverUrl = highlight.coverImage?.url
	const excerpt = highlight.reportDescription?.trim() || highlight.excerpt?.trim() || highlight.subtitle?.trim() || ''
	const sponsorLogoUrl = highlight.sponsorLogo?.url
	const pdfUrl = highlight.reportPdf?.url ?? null

	return (
		<div>
			<div className="pb-[15px] lg:pb-[26px]">
				<TitleLine title="Report highlight" />
			</div>
			<div className="grid grid-cols-1 gap-[32px] lg:grid-cols-[397fr_719fr] lg:gap-[48px]">
				<div className="flex flex-col gap-[24px]">
					{sponsorLogoUrl ? (
						<div className="space-y-2">
							<div className="text-[9px] tracking-[0.18em] text-[#1D1D1D]/60 uppercase dark:text-white/60">
								Sponsored by
							</div>
							<img src={sponsorLogoUrl} alt="" className="h-7 w-auto max-w-[120px] object-contain" />
						</div>
					) : null}
					<h2 className="text-[24px] leading-[150%] font-medium text-[#0c2956] dark:text-white">{highlight.title}</h2>
					{coverUrl ? (
						<div className="w-full">
							<img
								src={coverUrl}
								alt=""
								className="h-full w-full rounded-[6px] object-cover"
								loading="lazy"
								decoding="async"
							/>
						</div>
					) : null}
				</div>

				<div className="flex flex-col">
					<div
						className="max-h-[270px] flex-1 overflow-y-auto lg:min-h-[var(--min-height)]"
						style={sharedHeight ? ({ '--min-height': `${sharedHeight}px` } as CSSProperties) : undefined}
					>
						<div className="flex flex-col justify-between gap-[24px]">
							{excerpt ? (
								<div className="text-[14px] leading-[150%] text-[#1D1D1D]/90 dark:text-white">
									<p className="mb-2 last:mb-0">{excerpt}</p>
								</div>
							) : null}
						</div>
					</div>

					<div className="mt-auto flex items-center justify-end gap-4 pt-[8px]">
						{pdfUrl ? (
							<a
								href={pdfUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-[13px] font-medium text-[#0c2956] underline-offset-4 hover:underline dark:text-white"
							>
								Download PDF
							</a>
						) : null}
						<ReadMoreLink url={articleHref(highlight)} title="Explore more" />
					</div>
				</div>
			</div>
		</div>
	)
}

export function ResearchReportHighlightWithHeight({ highlight }: ResearchReportHighlightWithHeightProps) {
	const context = useSharedHeight()
	const height = context?.height

	return <ResearchReportHighlight highlight={highlight} sharedHeight={height} />
}
