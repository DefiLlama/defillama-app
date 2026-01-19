import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BasicLink } from '../Link'
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

// Renders a row of links and overflow links / links that not fit in viewport are shown in a dropdown
export const LinksWithDropdown = React.memo(function LinksWithDropdown({
	links = EMPTY_LINKS,
	activeLink,
	alternativeOthersText,
	...props
}: IRowLinksProps) {
	// null = calculating, 'renderMenu' = narrow screen (show only dropdown), number = index to cut from
	const [overflowIndex, setOverflowIndex] = useState<number | null | 'renderMenu'>(null)

	const calcOverflowIndex = useCallback(() => {
		if (typeof document !== 'undefined') {
			// For very narrow screens, show only dropdown menu
			// Use window.innerWidth so this works even when #priority-nav isn't rendered
			if (links.length > 2 && window.innerWidth <= 640) {
				return 'renderMenu'
			}

			const priorityNav = document.querySelector('#priority-nav')
			if (!priorityNav) return null

			// Batch all DOM reads upfront to avoid forced reflows
			const wrapper = priorityNav.getBoundingClientRect()

			// Collect all link elements and their rects in a single batch
			const linkElements: Element[] = []
			for (let i = 0; i < links.length; i++) {
				const link = document.querySelector(`#priority-nav-el-${i}`)
				if (link) linkElements.push(link)
			}

			// Batch read all bounding rects at once (single layout calculation)
			const linkRects = linkElements.map((link) => link.getBoundingClientRect())

			// Find first link that overflows (without any DOM reads)
			for (let index = 0; index < linkRects.length; index++) {
				const linkSize = linkRects[index]
				// Check if link wrapped to next row OR extends past dropdown reserved space (180px)
				if (linkSize.top - wrapper.top > wrapper.height || linkSize.left + 16 > wrapper.right - 180) {
					return index
				}
			}

			return null // All links fit
		}
		return null
	}, [links.length])

	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout>
		let rafId: number | null = null

		const updateOverflowIndex = () => {
			if (rafId) cancelAnimationFrame(rafId)
			rafId = requestAnimationFrame(() => {
				const index = calcOverflowIndex()
				setOverflowIndex(index)
			})
		}

		// Debounced resize handler
		const handleResize = () => {
			clearTimeout(timeoutId)
			timeoutId = setTimeout(updateOverflowIndex, 100)
		}

		// Calculate on initial render
		updateOverflowIndex()

		window.addEventListener('resize', handleResize, { passive: true })

		return () => {
			clearTimeout(timeoutId)
			if (rafId) cancelAnimationFrame(rafId)
			window.removeEventListener('resize', handleResize)
		}
	}, [calcOverflowIndex])

	const isActiveLinkInList = useMemo(() => !!links.find((link) => link.label === activeLink), [links, activeLink])

	const { hasOverflow, isLinkInDropdown } = useMemo(() => {
		const hasOverflow = overflowIndex !== null && typeof overflowIndex === 'number' && overflowIndex > 0
		const isLinkInDropdown = hasOverflow && !!links.slice(overflowIndex).find((link) => link.label === activeLink)
		return { hasOverflow, isLinkInDropdown }
	}, [overflowIndex, links, activeLink])

	// For narrow screens, show only the dropdown
	if (overflowIndex === 'renderMenu') {
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
			<div
				className="flex max-h-[calc(1.5rem+0.5rem)] flex-1 flex-wrap gap-2 overflow-hidden p-1"
				id="priority-nav"
				{...props}
			>
				{links.map((option, index) => (
					<LinkItem key={option.label} option={option} activeLink={activeLink} id={`priority-nav-el-${index}`} />
				))}
			</div>

			{/* Show dropdown when any links overflow */}
			{hasOverflow ? (
				<OtherLinks
					name={isLinkInDropdown ? activeLink : (alternativeOthersText ?? 'Others')}
					isActive={isLinkInDropdown}
					options={links}
					className="mr-1"
				/>
			) : null}
		</>
	)
})

export const LinkItem = React.memo(function LinkItem({
	option,
	activeLink,
	...props
}: {
	option: ILink
	activeLink: string
	[key: string]: any
}) {
	const isActive = option.label === activeLink

	return (
		<BasicLink
			href={option.to}
			className="rounded-md bg-(--link-bg) px-2.5 py-1 text-xs font-medium whitespace-nowrap text-(--link-text) [contain:layout_style_paint] [content-visibility:auto] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--link-active-bg) data-[active=true]:text-white"
			data-active={isActive}
			{...props}
		>
			{option.label}
		</BasicLink>
	)
})
