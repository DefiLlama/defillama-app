import { useEffect, useMemo, useRef, useState } from 'react'
import { BasicLink } from '~/components/Link'
import { OtherLinks } from './OtherLinks'

interface ILink {
	label: string
	to: string
}

interface IRowLinksProps {
	links: ILink[]
	activeLink?: string
	alternativeOthersText?: string
}

const EMPTY_LINKS: ILink[] = []
const ROW_WRAP_TOLERANCE_PX = 1
const RESIZE_DEBOUNCE_MS = 100

interface OverflowState {
	renderMenuOnly: boolean
	firstOverflowIndex: number | null
}

const INITIAL_OVERFLOW_STATE: OverflowState = {
	renderMenuOnly: false,
	firstOverflowIndex: null
}

// Renders a row of links and overflow links / links that not fit in viewport are shown in a dropdown
export function LinksWithDropdown({
	links = EMPTY_LINKS,
	activeLink,
	alternativeOthersText,
	...props
}: IRowLinksProps) {
	const [overflowState, setOverflowState] = useState<OverflowState>(INITIAL_OVERFLOW_STATE)
	const priorityNavRef = useRef<HTMLDivElement | null>(null)
	const linksLayoutSignature = useMemo(() => links.map((link) => link.label).join('\u0001'), [links])

	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout>
		let rafId: number | null = null
		let resizeObserver: ResizeObserver | null = null

		const calculateOverflowState = (): OverflowState => {
			if (typeof window === 'undefined') return INITIAL_OVERFLOW_STATE

			// For very narrow screens, show only dropdown menu
			// Use window.innerWidth so this works even when #priority-nav isn't rendered
			if (links.length > 2 && window.innerWidth <= 640) {
				return { renderMenuOnly: true, firstOverflowIndex: null }
			}

			const priorityNav = priorityNavRef.current
			if (!priorityNav) return INITIAL_OVERFLOW_STATE

			// Batch all DOM reads upfront to avoid forced reflows
			const wrapper = priorityNav.getBoundingClientRect()

			// Batch read all bounding rects at once (single layout calculation)
			const linkRects = Array.from(priorityNav.querySelectorAll<HTMLElement>('[data-priority-nav-item]'), (link) =>
				link.getBoundingClientRect()
			)

			const firstRowTop = linkRects[0]?.top ?? wrapper.top

			// Find first link that overflows (without any DOM reads)
			for (let index = 0; index < linkRects.length; index++) {
				const linkSize = linkRects[index]
				const isWrappedToNextRow = linkSize.top - firstRowTop > ROW_WRAP_TOLERANCE_PX

				// Wrapped links are hidden by max-height and belong to dropdown.
				if (isWrappedToNextRow) {
					return { renderMenuOnly: false, firstOverflowIndex: index }
				}
			}

			return INITIAL_OVERFLOW_STATE // All links fit
		}

		const updateOverflowState = () => {
			if (rafId !== null) cancelAnimationFrame(rafId)
			rafId = requestAnimationFrame(() => {
				const nextOverflowState = calculateOverflowState()
				setOverflowState((prevState) => {
					const didChange =
						prevState.renderMenuOnly !== nextOverflowState.renderMenuOnly ||
						prevState.firstOverflowIndex !== nextOverflowState.firstOverflowIndex

					return didChange ? nextOverflowState : prevState
				})
			})
		}

		// Debounced resize handler
		const handleResize = () => {
			clearTimeout(timeoutId)
			timeoutId = setTimeout(updateOverflowState, RESIZE_DEBOUNCE_MS)
		}

		// Calculate on initial render
		updateOverflowState()

		window.addEventListener('resize', handleResize, { passive: true })
		if (typeof ResizeObserver !== 'undefined' && priorityNavRef.current) {
			resizeObserver = new ResizeObserver(handleResize)
			resizeObserver.observe(priorityNavRef.current)
		}

		return () => {
			clearTimeout(timeoutId)
			if (rafId !== null) cancelAnimationFrame(rafId)
			window.removeEventListener('resize', handleResize)
			resizeObserver?.disconnect()
		}
	}, [links.length, linksLayoutSignature, overflowState.renderMenuOnly])

	const activeLinkIndex = activeLink ? links.findIndex((link) => link.label === activeLink) : -1
	const isActiveLinkInList = activeLinkIndex >= 0

	const overflowIndex = overflowState.renderMenuOnly ? null : overflowState.firstOverflowIndex
	const hasOverflow = overflowIndex !== null
	const isLinkInDropdown = overflowIndex !== null && activeLinkIndex >= overflowIndex

	// For narrow screens, show only the dropdown
	if (overflowState.renderMenuOnly) {
		return (
			<OtherLinks
				name={alternativeOthersText ?? 'Others'}
				isActive={isActiveLinkInList}
				options={links}
				className="w-full justify-between"
			/>
		)
	}

	return (
		<>
			{/* Always render ALL links - CSS handles overflow hiding via max-height + overflow-hidden */}
			<div className="flex max-h-8 flex-1 flex-wrap gap-2 overflow-hidden p-1" ref={priorityNavRef} {...props}>
				{links.map((option, index) => (
					<LinkItem
						key={`link-outside-${option.to}`}
						option={option}
						isActive={index === activeLinkIndex}
						data-priority-nav-item
					/>
				))}
			</div>

			{/* Show dropdown when any links overflow */}
			{hasOverflow ? (
				<OtherLinks
					name={
						isLinkInDropdown ? (activeLink ?? alternativeOthersText ?? 'Others') : (alternativeOthersText ?? 'Others')
					}
					isActive={isLinkInDropdown}
					options={links}
					className="mr-1 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
				/>
			) : null}
		</>
	)
}

function LinkItem({ option, isActive, ...props }: { option: ILink; isActive: boolean; [key: string]: any }) {
	return (
		<BasicLink
			href={option.to}
			className="rounded-md bg-(--link-bg) px-2.5 py-1 text-xs font-medium whitespace-nowrap text-(--link-text) contain-[layout_style_paint] [content-visibility:auto] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--link-active-bg) data-[active=true]:text-white"
			data-active={isActive}
			{...props}
		>
			{option.label}
		</BasicLink>
	)
}
