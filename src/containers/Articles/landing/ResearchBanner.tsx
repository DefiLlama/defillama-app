import Link from 'next/link'
import React from 'react'
import { InViewAnalytics, pushResearchAnalyticsEvent } from '~/containers/Articles/landing/Analytics'
import { useMedia } from '~/hooks/useMedia'

/** Hardcoded hero banner — replace URLs when ready. */
const BANNER_DESKTOP = 'https://placehold.co/2745x380/e4e4e4/237BFF/png?text=DefiLlama+Research'
const BANNER_MOBILE = 'https://placehold.co/800x400/e4e4e4/237BFF/png?text=Research'
const BANNER_HREF = 'https://defillama.com'

export const ResearchBanner: React.FC = () => {
	const isMobile = useMedia('(max-width: 768px)')

	return (
		<div>
			<InViewAnalytics eventParams={[null, 'widget_impression', 'DefiLlama Research banner']} />
			<Link
				href={BANNER_HREF}
				target="_blank"
				rel="noopener noreferrer"
				onClick={() => pushResearchAnalyticsEvent(null, 'widget_click', 'DefiLlama Research banner')}
			>
				<div
					className="flex aspect-[2/1] cursor-pointer flex-col items-center justify-between gap-4 bg-[#e4e4e4] bg-cover px-[22px] py-[24px] max-md:text-center md:aspect-[2745/380]"
					style={{
						backgroundImage: `url(${isMobile ? BANNER_MOBILE : BANNER_DESKTOP})`
					}}
				/>
			</Link>
		</div>
	)
}
