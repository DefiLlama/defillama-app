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

// Renders a row of links and overflow links / links that not fit in viewport are shown in a dropdown
export const LinksWithDropdown = React.memo(function LinksWithDropdown({
	links = [],
	activeLink,
	alternativeOthersText,
	...props
}: IRowLinksProps) {
	const [lastIndexToRender, setLastIndexToRender] = useState<number | null | 'renderMenu'>(null)

	const calcFiltersToRender = useCallback(() => {
		if (typeof document !== 'undefined') {
			const priorityNav = document.querySelector('#priority-nav')

			if (!priorityNav) return null

			const wrapper = priorityNav.getBoundingClientRect()
			let indexToCutFrom = null

			if (priorityNav.childNodes?.length > 2 && wrapper?.width <= 600) {
				return 'renderMenu'
			}

			// Use requestAnimationFrame to batch DOM reads
			const childNodes = Array.from(priorityNav.childNodes)
			for (let index = 0; index < childNodes.length; index++) {
				if (indexToCutFrom !== null) break

				const link = document.querySelector(`#priority-nav-el-${index}`)
				if (!link) continue

				const linkSize = link.getBoundingClientRect()

				// 8 - gap between links
				if (linkSize.top - wrapper.top > wrapper.height || linkSize.left + 8 * 2 > wrapper.right - 180) {
					indexToCutFrom = index
				}
			}

			return indexToCutFrom
		}
	}, [])

	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout>

		const setIndexToFilterFrom = () => {
			const index = calcFiltersToRender()
			setLastIndexToRender(index)
		}

		// Debounced resize handler to prevent excessive recalculations
		const handleResize = () => {
			clearTimeout(timeoutId)
			timeoutId = setTimeout(() => {
				setLastIndexToRender(null)
				setIndexToFilterFrom()
			}, 100)
		}

		// set index to filter from on initial render
		setIndexToFilterFrom()

		// listen to window resize events and reset index to filter from
		window.addEventListener('resize', handleResize)

		return () => {
			clearTimeout(timeoutId)
			window.removeEventListener('resize', handleResize)
		}
	}, [calcFiltersToRender])

	const { linksInRow, dropdownLinks, isLinkInDropdown } = useMemo(() => {
		if (lastIndexToRender === 'renderMenu') {
			const isActivePresent = !!links.find((link) => link.label === activeLink)
			return { linksInRow: null, dropdownLinks: links, isLinkInDropdown: isActivePresent }
		}

		const linksInRow = lastIndexToRender ? links.slice(0, lastIndexToRender) : links

		const dropdownLinks = lastIndexToRender ? links.slice(linksInRow.length) : null
		const isLinkInDropdown = dropdownLinks ? dropdownLinks.some((link) => link.label === activeLink) : false

		return { linksInRow, dropdownLinks, isLinkInDropdown }
	}, [links, lastIndexToRender, activeLink])

	return (
		<>
			{/* max-height: link height + wrapper padding top + padding bottom */}
			{linksInRow ? (
				<div
					className="flex max-h-[calc(1.5rem+0.5rem)] flex-1 flex-wrap gap-2 overflow-hidden p-1"
					id="priority-nav"
					{...props}
				>
					{linksInRow.map((option, index) => (
						<LinkItem key={option.label} option={option} activeLink={activeLink} id={`priority-nav-el-${index}`} />
					))}
				</div>
			) : null}

			{dropdownLinks ? (
				<OtherLinks
					name={isLinkInDropdown ? activeLink : (alternativeOthersText ?? 'Others')}
					isActive={isLinkInDropdown}
					options={dropdownLinks}
					className={!linksInRow ? 'w-full justify-between' : 'mr-1'}
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
			className="rounded-md bg-(--link-bg) px-2.5 py-1 text-xs font-medium whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--link-active-bg) data-[active=true]:text-white"
			data-active={isActive}
			{...props}
		>
			{option.label}
		</BasicLink>
	)
})
