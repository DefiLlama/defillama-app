import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { useMedia } from '~/hooks/useMedia'

interface MentionQuote {
	quote: string
	username: string
	social_media_name: string
	social_media_link: string
	x_post_id: string
}

type MentionBlock = MentionQuote[]

const BLOCKS: MentionBlock[] = [
	[
		{
			quote: 'our media partner published an in-depth look',
			username: 'mpostio',
			social_media_name: 'X',
			social_media_link: 'https://x.com/mpost_io/status/2018686524913590684',
			x_post_id: '2021009011378880997'
		},
		{
			quote: 'DeFi will win, and oracles will contribute to its success. Have a look below at why',
			username: 'RedStone',
			social_media_name: 'X',
			social_media_link: 'https://x.com/PacificMeta_ja/status/2008293046429818924',
			x_post_id: '2018686524913590684'
		},
		{
			quote:
				'these samurai warrior chads over at @dl_research are at it again. this is an incredibly well done report and katana is happy to be listed as a sponsor',
			username: 'Katana',
			social_media_name: 'X',
			social_media_link: 'https://x.com/MarcinRedStone/status/2003518298248609865',
			x_post_id: '2018285464944324652'
		}
	],
	[
		{
			quote: 'drive the DeFi industry forward Llamas',
			username: 'Katana',
			social_media_name: 'X',
			social_media_link: 'https://x.com/MarcinRedStone/status/2003518298248609865',
			x_post_id: '2003518298248609865'
		},
		{
			quote: "Here's a good starting point from @dl_research",
			username: 'Katana',
			social_media_name: 'X',
			social_media_link: 'https://x.com/Crypto_Texan/status/2021009011378880997',
			x_post_id: '2021009011378880997'
		},
		{
			quote:
				'Join us tomorrow at 11am EST for a discussion about RWAs and tokenization. Hosted by @patfscott and @themetaisok',
			username: 'DeFiLlama',
			social_media_name: 'X',
			social_media_link: 'https://x.com/DefiLlama/status/2020885843125178639',
			x_post_id: '2020885843125178639'
		}
	]
]

const AUTOPLAY_MS = 5000

const OpenQuoteIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="27" height="20" fill="none">
		<path
			fill="currentColor"
			d="M26.727 3.094c-3.495 1.719-5.243 3.738-5.243 6.058 1.49.172 2.722.788 3.696 1.848.974 1.031 1.46 2.234 1.46 3.61 0 1.46-.472 2.692-1.417 3.695-.946 1.002-2.134 1.504-3.567 1.504-1.604 0-2.993-.645-4.168-1.934-1.174-1.318-1.761-2.908-1.761-4.77 0-5.585 3.122-9.954 9.367-13.105l1.633 3.094ZM11 3.094C7.477 4.813 5.715 6.832 5.715 9.152c1.518.172 2.764.788 3.738 1.848.974 1.031 1.461 2.234 1.461 3.61 0 1.46-.487 2.692-1.46 3.695-.946 1.002-2.135 1.504-3.567 1.504-1.604 0-2.994-.645-4.168-1.934C.573 16.557 0 14.967 0 13.105 0 7.52 3.108 3.151 9.324 0L11 3.094Z"
		/>
	</svg>
)

const CloseQuoteIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="27" height="20" fill="none" className="rotate-180">
		<path
			fill="currentColor"
			d="M26.727 3.094c-3.495 1.719-5.243 3.738-5.243 6.058 1.49.172 2.722.788 3.696 1.848.974 1.031 1.46 2.234 1.46 3.61 0 1.46-.472 2.692-1.417 3.695-.946 1.002-2.134 1.504-3.567 1.504-1.604 0-2.993-.645-4.168-1.934-1.174-1.318-1.761-2.908-1.761-4.77 0-5.585 3.122-9.954 9.367-13.105l1.633 3.094ZM11 3.094C7.477 4.813 5.715 6.832 5.715 9.152c1.518.172 2.764.788 3.738 1.848.974 1.031 1.461 2.234 1.461 3.61 0 1.46-.487 2.692-1.46 3.695-.946 1.002-2.135 1.504-3.567 1.504-1.604 0-2.994-.645-4.168-1.934C.573 16.557 0 14.967 0 13.105 0 7.52 3.108 3.151 9.324 0L11 3.094Z"
		/>
	</svg>
)

const QuoteBlock: React.FC<{
	quote: MentionQuote
	variant?: 'primary' | 'secondary'
	size?: 'small' | 'large'
	mobile?: boolean
}> = ({ quote, variant = 'primary', size = 'large', mobile }) => {
	if (!quote.quote && !quote.username) return null

	const bgColor = variant === 'secondary' ? 'bg-[#E1EAF2]' : 'bg-[#237bff]'
	const textColor = variant === 'secondary' ? 'text-[#237bff]' : 'text-white'

	const textStyles = mobile
		? 'text-[16px] leading-[20px] text-center px-[26px] py-[12px]'
		: size === 'small'
			? 'text-[24px] leading-[28px] text-center px-[45px] py-[20px]'
			: 'text-[20px] leading-[24px] px-[30px] py-[20px]'

	const containerHeight = mobile ? 'h-[160px] min-h-[160px]' : 'h-[215px]'

	return (
		<Link
			href={quote.social_media_link || '#'}
			target="_blank"
			rel="noopener noreferrer"
			className={`flex grow flex-col gap-[16px] rounded-[4px] p-[13px] ${bgColor} ${containerHeight}`}
		>
			{quote.quote && (
				<blockquote className={`relative font-semibold ${textStyles} ${textColor}`}>
					<div className={`absolute top-0 left-0 ${textColor}`}>
						<OpenQuoteIcon />
					</div>
					<div className="line-clamp-4">{quote.quote}</div>
					<div className={`absolute right-0 bottom-0 ${textColor}`}>
						<CloseQuoteIcon />
					</div>
				</blockquote>
			)}
			{quote.username && quote.social_media_name && (
				<div className={`mt-auto pl-[30px] text-[14px] font-bold uppercase ${textColor}`}>
					@{quote.username} via {quote.social_media_name}
				</div>
			)}
		</Link>
	)
}

const TweetWidget: React.FC<{ tweetId: string; mobile?: boolean }> = ({ tweetId, mobile }) => {
	if (!tweetId) return null

	const wrapperClass = mobile
		? 'w-full min-w-0 h-[356px] overflow-hidden rounded-[4px] bg-white'
		: 'w-[215px] min-w-[215px] h-[215px] overflow-hidden rounded-[4px] bg-white'

	return (
		<div className={wrapperClass}>
			{
				// oxlint-disable-next-line react/iframe-missing-sandbox -- Twitter embeds require allow-scripts + allow-same-origin which the rule forbids
				<iframe
					src={`https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=light&dnt=true&hideCard=true&hideThread=true`}
					title={`Tweet ${tweetId}`}
					allowTransparency
					allow="encrypted-media"
					referrerPolicy="strict-origin-when-cross-origin"
					loading="lazy"
					scrolling="no"
					className="block h-full w-full overflow-hidden border-0"
				/>
			}
		</div>
	)
}

const MobileSlide: React.FC<{ quote: MentionQuote; tweetId: string; variant?: 'primary' | 'secondary' }> = ({
	quote,
	tweetId,
	variant = 'primary'
}) => (
	<div className="flex w-full min-w-0 shrink-0 flex-col gap-[10px]">
		<div className="h-[160px] w-full shrink-0">
			<QuoteBlock quote={quote} variant={variant} mobile />
		</div>
		<div className="h-[356px] w-full shrink-0">
			<TweetWidget tweetId={tweetId} mobile />
		</div>
	</div>
)

const BlockContent: React.FC<{ block: MentionBlock; isEven: boolean }> = ({ block, isEven }) => {
	const empty: MentionQuote = { quote: '', username: '', social_media_name: '', social_media_link: '', x_post_id: '' }
	const quote1 = block[0] ?? empty
	const quote2 = block[1] ?? empty
	const quote3 = block[2] ?? empty

	const hasContent = block.some((q) => q.quote || q.username || q.x_post_id)
	if (!hasContent) return null

	return (
		<div className="grid w-[955px] gap-[24px]" style={{ gridTemplateColumns: '215px 716px' }}>
			<div className={`flex gap-[24px] ${isEven ? 'flex-col-reverse' : 'flex-col'}`}>
				<QuoteBlock quote={quote1} size="small" />
				<TweetWidget tweetId={quote1.x_post_id} />
			</div>
			<div className="flex flex-col gap-[24px]">
				<div className={`flex gap-[24px] ${isEven ? 'flex-row-reverse' : 'flex-row'}`}>
					<TweetWidget tweetId={quote2.x_post_id} />
					<QuoteBlock quote={quote2} />
				</div>
				<div className={`flex gap-[24px] ${isEven ? 'flex-row-reverse' : 'flex-row'}`}>
					<QuoteBlock quote={quote3} variant="secondary" />
					<TweetWidget tweetId={quote3.x_post_id} />
				</div>
			</div>
		</div>
	)
}

interface AutoplayCarouselProps {
	slides: React.ReactNode[]
	containerClassName?: string
	intervalMs?: number
	showDots?: boolean
}

const AutoplayCarousel: React.FC<AutoplayCarouselProps> = ({
	slides,
	containerClassName = '',
	intervalMs = AUTOPLAY_MS,
	showDots = false
}) => {
	const containerRef = useRef<HTMLDivElement>(null)
	const [selectedIndex, setSelectedIndex] = useState(0)

	useEffect(() => {
		if (selectedIndex > slides.length - 1) {
			setSelectedIndex(0)
		}
	}, [slides.length, selectedIndex])

	// Smoothly scroll to the selected slide whenever the index changes
	useEffect(() => {
		const container = containerRef.current
		if (!container) return
		const target = container.children[selectedIndex] as HTMLElement | undefined
		if (!target) return
		container.scrollTo({ left: target.offsetLeft, behavior: 'smooth' })
	}, [selectedIndex])

	// Autoplay: advance one slide every intervalMs. Re-scheduling on selectedIndex
	// change ensures manual interaction (dot click / swipe) resets the timer.
	useEffect(() => {
		if (slides.length <= 1) return

		const prefersReducedMotion =
			typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
		if (prefersReducedMotion) return

		const timer = window.setTimeout(() => {
			setSelectedIndex((prev) => (prev + 1) % slides.length)
		}, intervalMs)
		return () => clearTimeout(timer)
	}, [selectedIndex, slides.length, intervalMs])

	// Sync selectedIndex with the slide nearest to the user's scroll position
	useEffect(() => {
		const container = containerRef.current
		if (!container || slides.length <= 1) return

		let timer: number | null = null
		const handleScroll = () => {
			if (timer != null) clearTimeout(timer)
			timer = window.setTimeout(() => {
				const scrollLeft = container.scrollLeft
				let bestIdx = 0
				let bestDiff = Infinity
				for (let i = 0; i < container.children.length; i++) {
					const child = container.children[i] as HTMLElement
					const diff = Math.abs(child.offsetLeft - scrollLeft)
					if (diff < bestDiff) {
						bestDiff = diff
						bestIdx = i
					}
				}
				setSelectedIndex((prev) => (prev !== bestIdx ? bestIdx : prev))
			}, 150)
		}

		container.addEventListener('scroll', handleScroll, { passive: true })
		return () => {
			container.removeEventListener('scroll', handleScroll)
			if (timer != null) clearTimeout(timer)
		}
	}, [slides.length])

	return (
		<div className="flex flex-col">
			<div ref={containerRef} className={`no-scrollbar flex overflow-x-auto ${containerClassName}`}>
				{slides}
			</div>
			{showDots && slides.length > 1 && (
				<div className="mt-[16px] flex justify-center gap-[8px]">
					{slides.map((_, idx) => (
						<button
							key={idx}
							type="button"
							aria-label={`Go to slide ${idx + 1}`}
							onClick={() => setSelectedIndex(idx)}
							className={`h-[8px] w-[8px] rounded-full transition-colors ${
								idx === selectedIndex ? 'bg-[#237bff]' : 'bg-[#8D8D8D]'
							}`}
						/>
					))}
				</div>
			)}
		</div>
	)
}

export const ResearchSocialMediaMentions: React.FC = () => {
	const isMobile = useMedia('(max-width: 767px)')

	const activeBlocks = BLOCKS.filter((block) => block.some((q) => q.quote || q.username || q.x_post_id))

	if (activeBlocks.length === 0) return null

	const desktopSlides = activeBlocks.map((block, blockIndex) => (
		<div key={`desktop-${blockIndex}`} className="shrink-0 snap-start">
			<BlockContent block={block} isEven={blockIndex % 2 === 1} />
		</div>
	))

	const mobileSlides: React.ReactNode[] = []
	activeBlocks.forEach((block, blockIndex) => {
		block.forEach((q, qIndex) => {
			if (!q.quote && !q.username && !q.x_post_id) return
			const variant: 'primary' | 'secondary' = qIndex === 2 ? 'secondary' : 'primary'
			mobileSlides.push(
				<div key={`mobile-${blockIndex}-${qIndex}`} className="w-full min-w-0 shrink-0 snap-start px-0">
					<MobileSlide quote={q} tweetId={q.x_post_id} variant={variant} />
				</div>
			)
		})
	})

	if (isMobile) {
		return <AutoplayCarousel slides={mobileSlides} containerClassName="snap-x snap-mandatory" showDots />
	}

	return <AutoplayCarousel slides={desktopSlides} containerClassName="snap-x snap-mandatory gap-[24px]" />
}
