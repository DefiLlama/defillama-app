import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { articleHref } from '~/containers/Articles/landing/utils'
import type { LightweightArticleDocument } from '~/containers/Articles/types'
import { useMedia } from '~/hooks/useMedia'

const MOBILE_QUERY = '(max-width: 767px)'
const IMG_ASPECT = { w: 294, h: 394 }
const PLANE_WIDTH = 294
const DIST_PER_PLANE = 150
const VISUAL_GAP = 15
const MOBILE_PLANE_WIDTH = 266
const MOBILE_DIST_PER_PLANE = 120
const DESKTOP_INNER_MARGIN_PX = 20
const TRANSITION_MS = 300
const AUTOSCROLL_DESKTOP_MS = 4000
const AUTOSCROLL_MOBILE_MS = 1800
const SCALE_BY_DIST = [1, 0.65, 0.5, 0.4, 0.3] as const

const getScaleRatio = (dist: number) => SCALE_BY_DIST[dist] ?? 0.2

const rotateArray = <T,>(arr: T[], n: number) => [...arr.slice(n), ...arr.slice(0, n)]

const prepareIds = (count: number, activeIndex: number) => {
	const center = Math.floor(count / 2)
	const rotation = activeIndex > center ? activeIndex - center : count - center + activeIndex

	return rotateArray(
		Array.from({ length: count }, (_, i) => i),
		rotation
	)
}

const reorganizeByPriority = (reportsInput: LightweightArticleDocument[]) => {
	if (reportsInput.length <= 1) return reportsInput

	const reorganized: LightweightArticleDocument[] = [reportsInput[0]]
	let addToStart = false

	for (let i = 1; i < reportsInput.length; i++) {
		if (addToStart) {
			reorganized.unshift(reportsInput[i])
		} else {
			reorganized.push(reportsInput[i])
		}
		addToStart = !addToStart
	}

	return reorganized
}

interface NavButtonProps {
	direction: 'prev' | 'next'
	disabled: boolean
	onClick: () => void
	onMouseEnter: () => void
	onMouseLeave: () => void
	className?: string
}

function NavButton({ direction, disabled, onClick, onMouseEnter, onMouseLeave, className }: NavButtonProps) {
	const path = direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'
	const label = direction === 'prev' ? 'Previous slide' : 'Next slide'

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			className={clsx(
				'flex h-[29px] w-[34px] cursor-pointer items-center justify-center rounded-[12px] border border-white bg-transparent transition-all duration-200 hover:bg-white/10',
				disabled && 'cursor-not-allowed opacity-50',
				className
			)}
			aria-label={label}
		>
			<svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
			</svg>
		</button>
	)
}

type EdgeFade = 'left' | 'right'

interface CarouselArticleSlideProps {
	article: LightweightArticleDocument
	isMobile: boolean
	edgeFade?: EdgeFade
	addOverlayLink?: boolean
}

function CarouselArticleSlide({ article, isMobile, edgeFade, addOverlayLink }: CarouselArticleSlideProps) {
	const router = useRouter()
	const href = articleHref(article)
	const imgUrl = article.carouselImage?.url ?? article.coverImage?.url
	const blurb = (article.reportDescription || article.excerpt || article.subtitle || '').trim()
	const sponsorLogoUrl = article.sponsorLogo?.url
	const pdfUrl = article.reportPdf?.url ?? null

	const imageBlock = (
		<div className="space-y-[12px] bg-white" style={{ aspectRatio: `${IMG_ASPECT.w}/${IMG_ASPECT.h}` }}>
			{imgUrl ? (
				<img src={imgUrl} alt="" className="h-full w-full object-cover md:h-full md:w-full md:object-fill" />
			) : (
				<div className="flex h-full min-h-[200px] w-full items-center justify-center bg-slate-200 text-slate-500" />
			)}
		</div>
	)

	const sponsorBadge = sponsorLogoUrl ? (
		<div className="pointer-events-none absolute top-[12px] right-[12px] flex items-center gap-2 rounded-full bg-black/55 px-2 py-1 text-white backdrop-blur-sm">
			<span className="font-jetbrains text-[8px] tracking-[0.16em] uppercase opacity-80">Sponsored by</span>
			<img src={sponsorLogoUrl} alt="" className="h-5 w-auto max-w-[80px] object-contain" />
		</div>
	) : null

	const overlay = (
		<div
			className={clsx(
				'absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-transparent to-[#0D1E3BF2] p-[15px] text-white transition-transform duration-500 ease-in-out',
				'translate-y-full',
				!isMobile && 'md:group-hover:translate-y-0'
			)}
		>
			<p className="my-[12px] line-clamp-4 text-[11px] leading-[150%] font-normal lg:text-[11px]">
				{blurb || article.title}
			</p>
			{addOverlayLink ? (
				<div className="grid gap-2">
					<span className="inline-block w-full rounded border border-white px-3 py-2 text-center text-[12px] leading-[120%] font-medium">
						Read more
					</span>
					{pdfUrl ? (
						<a
							href={pdfUrl}
							target="_blank"
							rel="noopener noreferrer"
							onClick={(e) => e.stopPropagation()}
							className="w-full rounded bg-white px-3 py-2 text-center text-[12px] leading-[120%] font-medium text-[#0D1E3B] transition-opacity hover:opacity-90"
						>
							Download PDF
						</a>
					) : null}
				</div>
			) : (
				<div
					className="bottom-[15px] grid gap-2"
					onClick={(e) => {
						e.stopPropagation()
					}}
				>
					<Link
						href={href}
						className="w-full rounded border border-white px-3 py-2 text-center text-[12px] leading-[120%] font-medium text-white transition-colors hover:bg-white/10"
					>
						Read more
					</Link>
					{pdfUrl ? (
						<a
							href={pdfUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="w-full rounded bg-white px-3 py-2 text-center text-[12px] leading-[120%] font-medium text-[#0D1E3B] transition-opacity hover:opacity-90"
						>
							Download PDF
						</a>
					) : null}
				</div>
			)}
		</div>
	)

	const fades = (
		<>
			{edgeFade === 'left' && (
				<div
					className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/2 rounded-l-[12px] [--edge-fade-color:white] lg:w-full dark:[--edge-fade-color:black]"
					style={{ background: 'linear-gradient(to right, var(--edge-fade-color), transparent)' }}
					aria-hidden
				/>
			)}
			{edgeFade === 'right' && (
				<div
					className="pointer-events-none absolute inset-y-0 right-0 z-10 w-1/2 rounded-r-[12px] [--edge-fade-color:white] lg:w-full dark:[--edge-fade-color:black]"
					style={{ background: 'linear-gradient(to left, var(--edge-fade-color), transparent)' }}
					aria-hidden
				/>
			)}
		</>
	)

	const inner = (
		<>
			{fades}
			{imageBlock}
			{sponsorBadge}
			{overlay}
		</>
	)

	return (
		<div
			className={clsx('group relative overflow-hidden bg-white transition-all duration-200 ease-out', 'rounded-[12px]')}
		>
			{addOverlayLink ? (
				<div
					role="button"
					tabIndex={0}
					onClick={() => {
						void router.push(href)
					}}
					className="block h-full w-full cursor-pointer"
				>
					{inner}
				</div>
			) : (
				inner
			)}
		</div>
	)
}

interface ReportsCarouselProps {
	reports: LightweightArticleDocument[]
	showButtons?: boolean
}

export const ReportsCarousel: React.FC<ReportsCarouselProps> = (props) => {
	const { reports: originalReports, showButtons = true } = props

	const reports = useMemo(() => {
		const reportsToProcess = originalReports.length % 2 === 0 ? originalReports.slice(0, -1) : originalReports
		return reorganizeByPriority(reportsToProcess)
	}, [originalReports])

	const containerRef = useRef<HTMLDivElement>(null)

	const [current, setCurrent] = useState(0)
	const [isTransitioning, setIsTransitioning] = useState(false)
	const [containerWidth, setContainerWidth] = useState(0)
	const [isHovered, setIsHovered] = useState(false)

	const TOTAL_COUNT = reports.length
	const CENTER = Math.floor(TOTAL_COUNT / 2)
	const isMobile = useMedia(MOBILE_QUERY)

	useEffect(() => {
		setCurrent(CENTER)
	}, [CENTER])

	const checkContainerWidth = useCallback(() => {
		if (containerRef.current) {
			setContainerWidth(containerRef.current.offsetWidth)
		}
	}, [])

	useEffect(() => {
		checkContainerWidth()
		window.addEventListener('resize', checkContainerWidth)
		return () => window.removeEventListener('resize', checkContainerWidth)
	}, [checkContainerWidth])

	const desktopOffsets = useMemo(() => {
		if (isMobile || TOTAL_COUNT < 2 || containerWidth <= 0) return null

		// 1. Compute scaled widths
		const widths: number[] = []
		for (let position = 0; position < TOTAL_COUNT; position++) {
			const dist = Math.abs(position - CENTER)
			const scale = getScaleRatio(dist)
			widths[position] = PLANE_WIDTH * scale
		}

		// 2. Base gap (no inner margin yet)
		const totalSlidesWidth = widths.reduce((a, b) => a + b, 0)
		const freeSpace = containerWidth - totalSlidesWidth
		const gap = TOTAL_COUNT > 1 ? freeSpace / (TOTAL_COUNT - 1) : 0

		// 3. Initial centered positions (no inner margin yet)
		const offsets: number[] = new Array(TOTAL_COUNT).fill(0)
		offsets[CENTER] = 0

		let currentRight = widths[CENTER] / 2
		for (let pos = CENTER + 1; pos < TOTAL_COUNT; pos++) {
			currentRight += gap + widths[pos] / 2
			offsets[pos] = currentRight
			currentRight += widths[pos] / 2
		}

		let currentLeft = -widths[CENTER] / 2
		for (let pos = CENTER - 1; pos >= 0; pos--) {
			currentLeft -= gap + widths[pos] / 2
			offsets[pos] = currentLeft
			currentLeft -= widths[pos] / 2
		}

		// ────────────────────────────────────────────────────────────────
		// 4. Adjust so outermost slide edges sit INNER_MARGIN_PX inward from container on both sides
		// ────────────────────────────────────────────────────────────────

		const leftmostIndex = 0
		const rightmostIndex = TOTAL_COUNT - 1

		const containerLeftEdge = -containerWidth / 2
		const containerRightEdge = containerWidth / 2

		// Targets: outermost slide edges should sit 20px inward from the container
		const targetLeftmostLeftEdge = containerLeftEdge + DESKTOP_INNER_MARGIN_PX
		const targetRightmostRightEdge = containerRightEdge - DESKTOP_INNER_MARGIN_PX

		// Target centers to achieve that spacing
		const targetLeftmostCenter = targetLeftmostLeftEdge + widths[leftmostIndex] / 2
		const targetRightmostCenter = targetRightmostRightEdge - widths[rightmostIndex] / 2

		const currentLeftmostCenter = offsets[leftmostIndex]
		const currentRightmostCenter = offsets[rightmostIndex]

		// Uniform scale (shrink if needed)
		let scaleFactor = 1

		if (currentLeftmostCenter !== 0 && currentRightmostCenter !== 0) {
			const leftScale = targetLeftmostCenter / currentLeftmostCenter // < 1 if we need to shrink
			const rightScale = targetRightmostCenter / currentRightmostCenter // < 1 if we need to shrink
			// Use the smaller (more restrictive) so both sides stay within bounds
			scaleFactor = Math.min(leftScale, rightScale, 1)
		} else if (currentLeftmostCenter !== 0) {
			scaleFactor = targetLeftmostCenter / currentLeftmostCenter
		} else if (currentRightmostCenter !== 0) {
			scaleFactor = targetRightmostCenter / currentRightmostCenter
		}

		// Apply scale (may be < 1)
		for (let i = 0; i < TOTAL_COUNT; i++) {
			offsets[i] *= scaleFactor
		}

		// Final fine adjustment (inward only if there is still room)
		const scaledLeftmostLeftEdge = offsets[leftmostIndex] - widths[leftmostIndex] / 2
		const scaledRightmostRightEdge = offsets[rightmostIndex] + widths[rightmostIndex] / 2

		const leftDiff = targetLeftmostLeftEdge - scaledLeftmostLeftEdge // positive = move right
		const rightDiff = targetRightmostRightEdge - scaledRightmostRightEdge // negative = move left

		// Use the more conservative adjustment (the one that pulls most toward center)
		const finalAdjustment = Math.min(leftDiff, rightDiff, 0)

		for (let i = 0; i < TOTAL_COUNT; i++) {
			offsets[i] += finalAdjustment
		}

		return offsets
	}, [isMobile, TOTAL_COUNT, CENTER, containerWidth])

	const responsiveConfig = useMemo(
		() => ({
			planeWidth: isMobile ? MOBILE_PLANE_WIDTH : PLANE_WIDTH,
			distPerPlane: isMobile ? MOBILE_DIST_PER_PLANE : DIST_PER_PLANE,
			centerOffset: isMobile ? 0 : containerWidth / 2 - PLANE_WIDTH / 2
		}),
		[isMobile, containerWidth]
	)

	const transitionTo = useCallback((updater: (prev: number) => number) => {
		setIsTransitioning((isLocked) => {
			if (isLocked) return isLocked

			setCurrent(updater)
			window.setTimeout(() => {
				setIsTransitioning(false)
			}, TRANSITION_MS)
			return true
		})
	}, [])

	const handleSlideClick = useCallback(
		(clickedIndex: number) => {
			if (clickedIndex === current) return
			transitionTo(() => clickedIndex)
		},
		[current, transitionTo]
	)

	const handlePrevious = useCallback(() => {
		if (TOTAL_COUNT < 1) return
		transitionTo((prev) => (prev === 0 ? TOTAL_COUNT - 1 : prev - 1))
	}, [TOTAL_COUNT, transitionTo])

	const handleNext = useCallback(() => {
		if (TOTAL_COUNT < 1) return
		transitionTo((prev) => (prev === TOTAL_COUNT - 1 ? 0 : prev + 1))
	}, [TOTAL_COUNT, transitionTo])

	useEffect(() => {
		if (TOTAL_COUNT < 1) return
		if (isHovered || isTransitioning) return

		const intervalDuration = isMobile ? AUTOSCROLL_MOBILE_MS : AUTOSCROLL_DESKTOP_MS

		const autoScrollInterval = setInterval(() => {
			transitionTo((prev) => (prev === TOTAL_COUNT - 1 ? 0 : prev + 1))
		}, intervalDuration)

		return () => clearInterval(autoScrollInterval)
	}, [isHovered, isTransitioning, TOTAL_COUNT, isMobile, transitionTo])

	const getSlideStyles = (position: number, dist: number) => {
		if (isMobile && dist > 1) {
			return { display: 'none' }
		}

		let offset = 0
		if (isMobile) {
			if (dist === 1) {
				if (position < CENTER) {
					offset = -MOBILE_PLANE_WIDTH / 2
				} else {
					offset = MOBILE_PLANE_WIDTH / 2
				}
			}
		} else {
			if (desktopOffsets) {
				offset = desktopOffsets[position]
			} else {
				if (dist === 1) {
					const scale = getScaleRatio(dist)
					const centralHalfWidth = responsiveConfig.planeWidth / 2
					const lateralHalfWidth = (responsiveConfig.planeWidth * scale) / 2
					const lateralOffset = centralHalfWidth + VISUAL_GAP + lateralHalfWidth
					offset = (position - CENTER) * lateralOffset
				} else {
					const baseOffset = (position - CENTER) * responsiveConfig.distPerPlane
					const extraSpacing = dist > 1 ? VISUAL_GAP * 7.5 : 0
					offset = baseOffset + (position > CENTER ? extraSpacing : -extraSpacing)
				}
			}
		}

		const scale = getScaleRatio(dist)
		const zIndex = TOTAL_COUNT - dist

		return {
			transform: `translate(calc(${offset}px + ${responsiveConfig.centerOffset}px)) scale(${scale})`,
			zIndex,
			display: 'block'
		}
	}

	const getSlideClasses = () => {
		return clsx(
			'absolute cursor-pointer rounded-[12px] border border-[#D9D9D9] text-white/80 shadow-xl transition-all duration-300 ease-out',
			isMobile ? 'w-[266px]' : 'w-[294px]',
			isTransitioning && 'pointer-events-none'
		)
	}

	const positionByReportIndex = useMemo(() => {
		const ids = prepareIds(TOTAL_COUNT, current)
		return new Map(ids.map((id, position) => [id, position]))
	}, [TOTAL_COUNT, current])

	if (TOTAL_COUNT === 0) {
		return null
	}

	return (
		<section className="min-h-[400px]">
			<div className={clsx('flex items-center', isMobile ? 'flex-col space-y-4' : 'space-x-4')}>
				{showButtons && !isMobile && (
					<NavButton
						direction="prev"
						disabled={isTransitioning}
						onClick={handlePrevious}
						onMouseEnter={() => setIsHovered(true)}
						onMouseLeave={() => setIsHovered(false)}
						className="flex-shrink-0"
					/>
				)}

				<div
					ref={containerRef}
					className={clsx(
						'relative mx-auto',
						isMobile ? 'flex h-[354px] w-full justify-center' : 'h-[309px] w-full min-w-[300px] overflow-visible'
					)}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
				>
					{reports.map((article: LightweightArticleDocument, reportIndex: number) => {
						const position = positionByReportIndex.get(reportIndex) ?? 0
						const distFromCenter = Math.abs(position - CENTER)
						const styles = getSlideStyles(position, distFromCenter)
						const classes = getSlideClasses()

						const edgeFade =
							!isMobile && position === 0
								? ('left' as const)
								: !isMobile && position === TOTAL_COUNT - 1
									? ('right' as const)
									: isMobile && distFromCenter === 1
										? position < CENTER
											? 'left'
											: 'right'
										: undefined

						const addOverlayLink = position === CENTER

						const handleClick = () => {
							if (addOverlayLink) return

							if (isMobile) {
								handleSlideClick(reportIndex)
								return
							}

							if (edgeFade === 'left') {
								handlePrevious()
							} else if (edgeFade === 'right') {
								handleNext()
							} else {
								handleSlideClick(reportIndex)
							}
						}

						return (
							<div key={reportIndex} className={classes} style={styles} onClick={handleClick}>
								<CarouselArticleSlide
									article={article}
									isMobile={isMobile}
									edgeFade={edgeFade}
									addOverlayLink={addOverlayLink}
								/>
							</div>
						)
					})}
				</div>

				{showButtons && !isMobile && (
					<NavButton
						direction="next"
						disabled={isTransitioning}
						onClick={handleNext}
						onMouseEnter={() => setIsHovered(true)}
						onMouseLeave={() => setIsHovered(false)}
						className="flex-shrink-0"
					/>
				)}

				{showButtons && isMobile && (
					<div className="flex items-center space-x-4">
						<NavButton
							direction="prev"
							disabled={isTransitioning}
							onClick={handlePrevious}
							onMouseEnter={() => setIsHovered(true)}
							onMouseLeave={() => setIsHovered(false)}
						/>
						<NavButton
							direction="next"
							disabled={isTransitioning}
							onClick={handleNext}
							onMouseEnter={() => setIsHovered(true)}
							onMouseLeave={() => setIsHovered(false)}
						/>
					</div>
				)}
			</div>
		</section>
	)
}
