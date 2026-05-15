import { useRouter } from 'next/router'
import React, { useEffect, useRef } from 'react'
import { useIntersectionObserver } from '~/containers/Articles/landing/useIntersectionObserver'
import type { LightweightArticleDocument } from '~/containers/Articles/types'
import { trackUmamiEvent } from '~/utils/analytics/umami'

export type ResearchAnalyticsEventParams = [
	article: LightweightArticleDocument | null,
	eventName: string,
	widgetLabel: string,
	triggeredOn?: string
]

function umamiPayloadFromArticle(article: LightweightArticleDocument | null) {
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
		topics: article.section ?? ''
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

interface PageAnalyticsProps {
	article: LightweightArticleDocument | null
}

/** Optional: fires when the route or article id changes; extend if you need richer virtual page views. */
export const PageAnalytics: React.FC<PageAnalyticsProps> = ({ article }) => {
	const router = useRouter()
	const asPath = router.asPath
	const articleId = article?.id
	const articleRef = useRef(article)
	articleRef.current = article

	useEffect(() => {
		trackUmamiEvent('research_page_view', {
			path: asPath,
			...umamiPayloadFromArticle(articleRef.current)
		})
	}, [asPath, articleId])

	return null
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
