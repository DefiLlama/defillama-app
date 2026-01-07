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
			return { linksInRow: null, dropdownLinks: links }
		}

		const linksInRow = lastIndexToRender ? links.slice(0, lastIndexToRender - 1) : links

		const dropdownLinks = lastIndexToRender ? links : null
		const dropdownLinks2 = lastIndexToRender ? links.slice(linksInRow.length) : null

		const isLinkInDropdown = dropdownLinks2?.find((link) => link.label === activeLink) ? true : false

		return { linksInRow, dropdownLinks, isLinkInDropdown }
	}, [links, lastIndexToRender, activeLink])

	return (
		<>
			{/* max-height: link height + wrapper padding top + padding bottom */}
			{linksInRow ? (
				<div
					className="flex max-h-[calc(1.5rem+0.5rem)] flex-1 flex-wrap items-center gap-4 overflow-hidden p-1"
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
			className={`flex items-center text-xs font-medium whitespace-nowrap text-(--link-text) ${
				isActive
					? 'rounded-md bg-(--link-active-bg) px-2.5 py-1 text-white'
					: 'hover:text-(--link-text) focus-visible:text-(--link-text)'
			}`}
			data-active={isActive}
			{...props}
		>
			{option.label}
		</BasicLink>
	)
})
