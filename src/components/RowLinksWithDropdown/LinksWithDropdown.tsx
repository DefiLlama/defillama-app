import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react'
import { BasicLink } from '~/components/Link'
import { useIsClient } from '~/hooks/useIsClient'
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
const SSR_LINK_LIMIT = 20
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

interface OverflowState {
	renderMenuOnly: boolean
	firstOverflowIndex: number | null
	isMeasuring: boolean
}

const INITIAL_OVERFLOW_STATE: OverflowState = {
	renderMenuOnly: false,
	firstOverflowIndex: null,
	isMeasuring: true
}

interface CachedLayout {
	linkWidths: number[]
	gap: number
	containerPadding: number
}

type OverflowResult = { renderMenuOnly: boolean; firstOverflowIndex: number | null }

type OverflowAction =
	| { type: 'REQUEST_MEASURE' }
	| { type: 'AWAIT_CONTAINER' }
	| { type: 'MEASURED'; result: OverflowResult }
	| { type: 'RESIZED'; result: OverflowResult }

function assertUnreachable(action: never): never {
	throw new Error(`Unhandled OverflowAction: ${JSON.stringify(action)}`)
}

function overflowReducer(state: OverflowState, action: OverflowAction): OverflowState {
	switch (action.type) {
		case 'REQUEST_MEASURE':
			return state.isMeasuring ? state : { ...state, isMeasuring: true }
		case 'AWAIT_CONTAINER':
			return { renderMenuOnly: false, firstOverflowIndex: null, isMeasuring: true }
		case 'MEASURED': {
			const { result } = action
			const didChange =
				state.renderMenuOnly !== result.renderMenuOnly ||
				state.firstOverflowIndex !== result.firstOverflowIndex ||
				state.isMeasuring
			return didChange ? { ...result, isMeasuring: false } : state
		}
		case 'RESIZED': {
			const { result } = action
			const didChange =
				state.renderMenuOnly !== result.renderMenuOnly || state.firstOverflowIndex !== result.firstOverflowIndex
			return didChange ? { ...result, isMeasuring: false } : state
		}
		default:
			return assertUnreachable(action)
	}
}

function finiteOr(...values: number[]): number {
	for (const v of values) if (Number.isFinite(v)) return v
	return 0
}

// Full DOM measurement — reads all link positions and caches widths for resize
function measureOverflow(
	linkCount: number,
	priorityNav: HTMLDivElement | null,
	cache: React.MutableRefObject<CachedLayout | null>
): OverflowResult {
	if (typeof window === 'undefined') return { renderMenuOnly: false, firstOverflowIndex: null }

	if (linkCount > 2 && window.innerWidth <= 640) {
		return { renderMenuOnly: true, firstOverflowIndex: null }
	}

	if (!priorityNav) return { renderMenuOnly: false, firstOverflowIndex: null }

	const wrapper = priorityNav.getBoundingClientRect()
	const linkRects = Array.from(priorityNav.querySelectorAll<HTMLElement>('[data-priority-nav-item]'), (el) =>
		el.getBoundingClientRect()
	)

	const style = getComputedStyle(priorityNav)
	cache.current = {
		linkWidths: linkRects.map((r) => r.width),
		gap: finiteOr(parseFloat(style.columnGap), parseFloat(style.gap), 0),
		containerPadding: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
	}

	const firstRowTop = linkRects[0]?.top ?? wrapper.top

	for (let i = 0; i < linkRects.length; i++) {
		if (linkRects[i].top - firstRowTop > ROW_WRAP_TOLERANCE_PX) {
			return { renderMenuOnly: false, firstOverflowIndex: i }
		}
	}

	return { renderMenuOnly: false, firstOverflowIndex: null }
}

// Pure math: recalculate overflow from cached link widths — no DOM mutation needed
function recalculateFromCache(containerWidth: number, cached: CachedLayout, linkCount: number): OverflowResult {
	if (linkCount > 2 && window.innerWidth <= 640) {
		return { renderMenuOnly: true, firstOverflowIndex: null }
	}

	const availableWidth = containerWidth - cached.containerPadding
	let usedWidth = 0
	const count = Math.min(cached.linkWidths.length, linkCount)

	for (let i = 0; i < count; i++) {
		if (i > 0) usedWidth += cached.gap
		usedWidth += cached.linkWidths[i]
		if (usedWidth > availableWidth) {
			return { renderMenuOnly: false, firstOverflowIndex: i }
		}
	}

	return { renderMenuOnly: false, firstOverflowIndex: null }
}

// Renders a row of links; overflow links are removed from DOM and shown in a dropdown.
// Initial measurement renders all links (hidden by CSS) to cache widths, then trims.
// Resize uses cached widths for instant recalculation — no DOM churn.
export function LinksWithDropdown({
	links = EMPTY_LINKS,
	activeLink,
	alternativeOthersText,
	...props
}: IRowLinksProps) {
	const [overflowState, dispatch] = useReducer(overflowReducer, INITIAL_OVERFLOW_STATE)
	const priorityNavRef = useRef<HTMLDivElement | null>(null)
	const linksLayoutSignature = useMemo(() => links.map((link) => link.label).join('\u0001'), [links])
	const isClient = useIsClient()
	const cachedRef = useRef<CachedLayout | null>(null)
	const linksRef = useRef(links)
	useEffect(() => {
		linksRef.current = links
	})

	// Invalidate cache and trigger full re-measurement when links change
	useEffect(() => {
		cachedRef.current = null
		dispatch({ type: 'REQUEST_MEASURE' })
	}, [links.length, linksLayoutSignature])

	// Full measurement: runs synchronously before paint when isMeasuring is true.
	// Deferred until isClient so we measure all links, not just the SSR-limited subset.
	useIsomorphicLayoutEffect(() => {
		if (!isClient || !overflowState.isMeasuring) return

		const priorityNav = priorityNavRef.current
		const result = measureOverflow(links.length, priorityNav, cachedRef)

		// Container not mounted yet (transitioning out of renderMenuOnly).
		// Clear renderMenuOnly so the container renders, stay in measuring mode.
		if (!result.renderMenuOnly && !priorityNav) {
			dispatch({ type: 'AWAIT_CONTAINER' })
			return
		}

		dispatch({ type: 'MEASURED', result })
	}, [isClient, overflowState.isMeasuring, overflowState.renderMenuOnly, links.length])

	// Resize listeners — fast cached recalculation, no two-phase render needed
	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout>
		let resizeObserver: ResizeObserver | null = null

		const handleResize = () => {
			clearTimeout(timeoutId)
			timeoutId = setTimeout(() => {
				const cached = cachedRef.current
				if (!cached) {
					dispatch({ type: 'REQUEST_MEASURE' })
					return
				}

				const nav = priorityNavRef.current
				if (!nav) {
					if (linksRef.current.length > 2 && window.innerWidth <= 640) return
					dispatch({ type: 'REQUEST_MEASURE' })
					return
				}

				const containerWidth = nav.getBoundingClientRect().width
				const result = recalculateFromCache(containerWidth, cached, linksRef.current.length)
				dispatch({ type: 'RESIZED', result })
			}, RESIZE_DEBOUNCE_MS)
		}

		window.addEventListener('resize', handleResize, { passive: true })
		if (typeof ResizeObserver !== 'undefined' && priorityNavRef.current) {
			resizeObserver = new ResizeObserver(handleResize)
			resizeObserver.observe(priorityNavRef.current)
		}

		return () => {
			clearTimeout(timeoutId)
			window.removeEventListener('resize', handleResize)
			resizeObserver?.disconnect()
		}
	}, [overflowState.renderMenuOnly])

	const activeLinkIndex = activeLink ? links.findIndex((link) => link.label === activeLink) : -1
	const isActiveLinkInList = activeLinkIndex >= 0

	const overflowIndex = overflowState.renderMenuOnly ? null : overflowState.firstOverflowIndex
	const hasOverflow = overflowIndex !== null
	const isLinkInDropdown = overflowIndex !== null && activeLinkIndex >= overflowIndex

	// During measurement: render all links (CSS hides overflow). After: only visible links in DOM.
	const visibleLinks = overflowState.isMeasuring
		? isClient
			? links
			: links.slice(0, SSR_LINK_LIMIT)
		: overflowIndex !== null
			? links.slice(0, overflowIndex)
			: links

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
			<div className="flex max-h-8 flex-1 flex-wrap gap-2 overflow-hidden p-1" ref={priorityNavRef} {...props}>
				{visibleLinks.map((option, index) => (
					<LinkItem
						key={`link-outside-${option.to}`}
						option={option}
						isActive={index === activeLinkIndex}
						data-priority-nav-item
					/>
				))}
			</div>

			{/* Render during measurement so the flex-1 container measures at the correct
			   narrower width (OtherLinks takes space as a flex sibling). useLayoutEffect
			   runs before paint so the user never sees the sentinel. */}
			{overflowState.isMeasuring || hasOverflow ? (
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
			className="rounded-md bg-(--link-bg) px-2.5 py-1 text-xs font-medium whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--link-active-bg) data-[active=true]:text-white"
			data-active={isActive}
			{...props}
		>
			{option.label}
		</BasicLink>
	)
}
