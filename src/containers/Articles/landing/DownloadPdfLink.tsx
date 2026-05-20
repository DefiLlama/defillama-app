import React, { type MouseEvent, type ReactNode } from 'react'
import { pushResearchAnalyticsEvent } from '~/containers/Articles/landing/Analytics'
import type { ArticleDocument } from '~/containers/Articles/types'

interface DownloadPdfLinkProps {
	article: ArticleDocument
	pdfUrl: string
	widgetLabel: string
	className?: string
	stopPropagation?: boolean
	children?: ReactNode
}

export const DownloadPdfLink: React.FC<DownloadPdfLinkProps> = ({
	article,
	pdfUrl,
	widgetLabel,
	className,
	stopPropagation,
	children = 'Download PDF'
}) => {
	const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
		if (stopPropagation) e.stopPropagation()
		pushResearchAnalyticsEvent(article, 'export-pdf-research', widgetLabel)
	}

	return (
		<a href={pdfUrl} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>
			{children}
		</a>
	)
}
