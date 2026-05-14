import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import React from 'react'
import { getLandingBanner } from '~/containers/Articles/api'
import { InViewAnalytics, pushResearchAnalyticsEvent } from '~/containers/Articles/landing/Analytics'
import type { BannerLookupResult } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useMedia } from '~/hooks/useMedia'

export const ResearchBanner: React.FC = () => {
	const { authorizedFetch } = useAuthContext()
	const isMobile = useMedia('(max-width: 768px)')

	const { data } = useQuery<BannerLookupResult>({
		queryKey: ['research', 'banner', 'landing'],
		queryFn: () => getLandingBanner(authorizedFetch),
		retry: false,
		staleTime: 60_000
	})

	if (!data) {
		return null
	}

	return (
		<div>
			<InViewAnalytics eventParams={[null, 'widget_impression', 'DefiLlama Research banner']} />
			<Link
				href={isMobile ? data.imageHorizontal.linkUrl : data.image.linkUrl}
				target="_blank"
				rel="noopener noreferrer"
				onClick={() => pushResearchAnalyticsEvent(null, 'widget_click', 'DefiLlama Research banner')}
			>
				<div
					className="flex aspect-[2/1] cursor-pointer flex-col items-center justify-between gap-4 bg-[#e4e4e4] bg-cover px-[22px] py-[24px] max-md:text-center md:aspect-[2745/380]"
					style={{
						backgroundImage: `url(${isMobile ? data.imageHorizontal.imageUrl : data.image.imageUrl})`
					}}
				/>
			</Link>
		</div>
	)
}
