import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
export const LinksWithDropdown = ({ links = [], activeLink, alternativeOthersText, ...props }: IRowLinksProps) => {
	const [lastIndexToRender, setLastIndexToRender] = useState<number | null | 'renderMenu'>(null)

	const calcFiltersToRender = useCallback(() => {
		if (typeof document !== 'undefined') {
			const priorityNav = document.querySelector('#priority-nav')

			const wrapper = priorityNav?.getBoundingClientRect()

			let indexToCutFrom = null

			if (!priorityNav) return null

			if (priorityNav.childNodes?.length > 2 && wrapper?.width <= 600) {
				return 'renderMenu'
			}

			priorityNav.childNodes?.forEach((_, index) => {
				if (indexToCutFrom !== null) return

				const link = document.querySelector(`#priority-nav-el-${index}`)
				const linkSize = link.getBoundingClientRect()

				// 8 - gap between links
				if (linkSize.top - wrapper.top > wrapper.height || linkSize.left + 8 * 2 > wrapper.right - 180) {
					indexToCutFrom = index
				}
			})

			return indexToCutFrom
		}
	}, [])

	useEffect(() => {
		const setIndexToFilterFrom = () => {
			const index = calcFiltersToRender()

			setLastIndexToRender(index)
		}

		// set index to filter from on initial render
		setIndexToFilterFrom()

		// listen to window resize events and reset index to filter from
		window.addEventListener('resize', () => {
			setLastIndexToRender(null)
			setIndexToFilterFrom()
		})

		return () => {
			window.removeEventListener('resize', () => {})
			setLastIndexToRender(null)
			setIndexToFilterFrom()
		}
	}, [calcFiltersToRender])

	const { linksInRow, dropdownLinks, isLinkInDropdown } = useMemo(() => {
		if (lastIndexToRender === 'renderMenu') {
			return { linksInRow: null, dropdownLinks: links }
		}

		const linksInRow = lastIndexToRender ? links.slice(0, lastIndexToRender - 1) : links

		const dropdownLinks = lastIndexToRender ? links.slice(linksInRow.length) : null

		const isLinkInDropdown = dropdownLinks?.find((link) => link.label === activeLink) ? true : false

		return { linksInRow, dropdownLinks, isLinkInDropdown }
	}, [links, lastIndexToRender, activeLink])

	return (
		<div className="flex flex-nowrap bg-[var(--cards-bg)] rounded-md">
			{/* max-height: link height + wrapper padding top & bottom */}
			{linksInRow ? (
				<div
					className="flex-1 overflow-hidden p-1 flex flex-wrap max-h-[calc(1.5rem_+_0.5rem)] gap-2"
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
					name={isLinkInDropdown ? activeLink : alternativeOthersText ?? 'Others'}
					isActive={isLinkInDropdown}
					options={dropdownLinks}
					className={!linksInRow ? 'w-full justify-between' : ''}
				/>
			) : null}
		</div>
	)
}

export const LinkItem = ({ option, activeLink, ...props }) => {
	return (
		<Link href={option.to} prefetch={false} passHref>
			<a
				className="rounded-md py-1 px-[10px] whitespace-nowrap font-medium text-xs text-[var(--link-text)] bg-[var(--link-bg)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--link-active-bg)] data-[active=true]:text-white"
				data-active={option.label === activeLink}
				{...props}
			>
				{option.label}
			</a>
		</Link>
	)
}
