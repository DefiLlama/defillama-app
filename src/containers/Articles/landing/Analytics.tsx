import React, { useEffect, useRef } from 'react'
import { useIntersectionObserver } from '~/containers/Articles/landing/useIntersectionObserver'
import type { ArticleDocument } from '~/containers/Articles/types'
import { trackUmamiEvent } from '~/utils/analytics/umami'

export type ResearchAnalyticsEventParams = [
	article: ArticleDocument | null,
	eventName: string,
	widgetLabel: string,
	triggeredOn?: string
]

function umamiPayloadFromArticle(article: ArticleDocument | null) {
	if (!article) {
		return {
			article_id: '',
			article_title: '',
			author: '',
			publish_date: '',
			topics: ''
		}
	}
	return {
		article_id: article.id,
		article_title: article.title,
		author: article.brandByline ? 'DefiLlama Research' : (article.authorProfile?.displayName ?? ''),
		publish_date: article.publishedAt ?? '',
		topics: (article.tags ?? []).join(',')
	}
}

export function pushResearchAnalyticsEvent(...args: ResearchAnalyticsEventParams) {
	const [article, eventName, widgetLabel, triggeredOn] = args
	trackUmamiEvent(eventName, {
		page_type: 'research',
		page_widget: widgetLabel,
		triggered_on: triggeredOn,
		...umamiPayloadFromArticle(article)
	})
}

interface InViewAnalyticsProps {
	eventParams: ResearchAnalyticsEventParams
	intersectionOptions?: IntersectionObserverInit & { freezeOnceVisible?: boolean }
}

export const InViewAnalytics: React.FC<InViewAnalyticsProps> = (props) => {
	const {
		eventParams,
		intersectionOptions = {
			freezeOnceVisible: true
		}
	} = props

	const { ref, isIntersecting } = useIntersectionObserver(intersectionOptions)
	const paramsRef = useRef(eventParams)
	paramsRef.current = eventParams

	useEffect(() => {
		if (isIntersecting) {
			pushResearchAnalyticsEvent(...paramsRef.current)
		}
	}, [isIntersecting])

	return <div ref={ref} className="invisible" />
}
