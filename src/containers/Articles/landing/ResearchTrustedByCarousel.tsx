import Link from 'next/link'
import React, { useEffect, useRef } from 'react'
import { useMedia } from '~/hooks/useMedia'

interface Logo {
	id: number
	logo: string
	link: string
}

const TRUSTED_BY_LOGOS: Logo[] = [
	{ id: 1, logo: '/assets/research/partners/arbitrum.webp', link: 'https://arbitrum.io/' },
	{ id: 2, logo: '/assets/research/partners/bybit.webp', link: 'https://www.bybit.com/' },
	{ id: 3, logo: '/assets/research/partners/kpk.webp', link: 'https://kpk.io/' },
	{ id: 4, logo: '/assets/research/partners/redstone.webp', link: 'https://redstone.finance/' },
	{ id: 5, logo: '/assets/research/partners/katana.webp', link: 'https://katana.network/' },
	{ id: 6, logo: '/assets/research/partners/market-across.webp', link: 'https://marketacross.com/' },
	{ id: 7, logo: '/assets/research/partners/chainwire.webp', link: 'https://chainwire.org/' },
	{ id: 8, logo: '/assets/research/partners/pr-genius.webp', link: 'https://www.theprgenius.com/' },
	{ id: 9, logo: '/assets/research/partners/sentora.webp', link: 'https://sentora.com/' },
	{ id: 10, logo: '/assets/research/partners/trezor.webp', link: 'https://trezor.io/' },
	{ id: 11, logo: '/assets/research/partners/0G.webp', link: 'https://0g.ai/' },
	{ id: 12, logo: '/assets/research/partners/1inch.webp', link: 'https://1inch.io/' },
	{ id: 13, logo: '/assets/research/partners/plasma.webp', link: 'https://www.plasma.to/' },
	{ id: 14, logo: '/assets/research/partners/shaga.webp', link: 'https://www.shaga.xyz/' }
]

const GAP_PX = 16
// Scroll speed in pixels per frame at 60fps
const SPEED_PX_PER_FRAME = 0.8
const FRAME_MS = 1000 / 60

const renderLogo = (item: Logo) => (
	<Link
		key={item.id}
		href={item.link}
		rel="nofollow"
		target="_blank"
		className="relative inline-flex h-[56px] w-[131px] shrink-0 items-center justify-center rounded-[6px] border border-[#8CB3EF] bg-white px-[18px] py-[12px] lg:h-[96px] lg:w-[236px] lg:px-[36px]"
	>
		<img
			src={item.logo}
			alt=""
			className="max-h-[25px] max-w-[125px] object-contain transition-opacity duration-500 hover:opacity-50 lg:max-h-[35px] lg:max-w-[195px]"
			loading="lazy"
			decoding="async"
		/>
	</Link>
)

const getMobileItems = (items: React.ReactNode[]): React.ReactNode[] => {
	const mobileItems: React.ReactNode[] = []
	for (let i = 0; i < items.length; i += 2) {
		const slideItems = items.slice(i, i + 2)
		mobileItems.push(
			<div key={`slide-${i}`} className="grid shrink-0 grid-cols-1 gap-[16px]">
				{slideItems.map((item, index) => (
					<div key={`slide-${i}-item-${index}`} className="flex items-center justify-center">
						{item}
					</div>
				))}
			</div>
		)
	}
	return mobileItems
}

const desktopItems = TRUSTED_BY_LOGOS.map(renderLogo)
const mobileItems = getMobileItems(desktopItems)

interface LogosCarouselProps {
	items: React.ReactNode[]
	speed?: number
}

const LogosCarousel: React.FC<LogosCarouselProps> = ({ items, speed = SPEED_PX_PER_FRAME }) => {
	const containerRef = useRef<HTMLDivElement>(null)
	const firstSetRef = useRef<HTMLDivElement>(null)
	const rafIdRef = useRef<number | null>(null)
	const lastTimeRef = useRef<number | null>(null)
	const pausedRef = useRef(false)

	useEffect(() => {
		const container = containerRef.current
		const firstSet = firstSetRef.current
		if (!container || !firstSet) return

		const prefersReducedMotion =
			typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
		if (prefersReducedMotion) return

		container.scrollLeft = 0

		const tick = (now: number) => {
			if (lastTimeRef.current == null) {
				lastTimeRef.current = now
			}
			// Cap delta so tab switches / long pauses don't cause a giant jump
			const delta = Math.min(now - lastTimeRef.current, 50)
			lastTimeRef.current = now

			if (!pausedRef.current) {
				const pixels = (speed * delta) / FRAME_MS
				container.scrollLeft += pixels

				// One full period = the width of one set + the gap that separates it from the next set
				const loopLength = firstSet.offsetWidth + GAP_PX
				if (loopLength > 0 && container.scrollLeft >= loopLength) {
					container.scrollLeft -= loopLength
				}
			}

			rafIdRef.current = requestAnimationFrame(tick)
		}

		rafIdRef.current = requestAnimationFrame(tick)

		return () => {
			if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current)
			rafIdRef.current = null
			lastTimeRef.current = null
		}
	}, [items, speed])

	const pause = () => {
		pausedRef.current = true
	}
	const resume = () => {
		pausedRef.current = false
	}

	return (
		<div
			ref={containerRef}
			onMouseEnter={pause}
			onMouseLeave={resume}
			onTouchStart={pause}
			onTouchEnd={resume}
			onTouchCancel={resume}
			className="no-scrollbar flex gap-[16px] overflow-hidden"
		>
			<div ref={firstSetRef} className="flex shrink-0 gap-[16px]">
				{items}
			</div>
			<div className="flex shrink-0 gap-[16px]" aria-hidden="true">
				{items}
			</div>
		</div>
	)
}

export const ResearchTrustedByCarousel: React.FC = () => {
	const isMobile = useMedia('(max-width: 1023px)')
	const items = isMobile ? mobileItems : desktopItems

	return <LogosCarousel items={items} />
}
