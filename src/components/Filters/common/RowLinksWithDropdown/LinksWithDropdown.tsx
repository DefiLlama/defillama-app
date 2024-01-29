import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { OtherLinks } from './OtherLinks'
import { darken, transparentize } from 'polished'

interface ILink {
	label: string
	to: string
}

interface IRowLinksProps {
	links: ILink[]
	activeLink?: string
	alternativeOthersText?: string
}

const GAP = 6

const Wrapper = styled.div`
	flex: 1;
	overflow: hidden;
	padding: 4px;
	display: flex;
	flex-wrap: wrap;
	gap: ${GAP}px;
	max-height: calc(1.8rem + 14px);

	& > * {
		display: inline-block;
	}
`

export const RowLinksWrapper = styled.nav`
	display: flex;
	align-items: center;
	gap: 20px;
	overflow: hidden;
	margin-bottom: -20px;
`

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

				if (linkSize.top - wrapper.top > wrapper.height || linkSize.left + GAP * 2 > wrapper.right - 180) {
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
		<>
			{linksInRow && (
				<Wrapper id="priority-nav" {...props}>
					{linksInRow.map((option, index) => (
						<LinkItem key={option.label} option={option} activeLink={activeLink} id={`priority-nav-el-${index}`} />
					))}
				</Wrapper>
			)}

			{dropdownLinks && (
				<OtherLinks
					name={isLinkInDropdown ? activeLink : alternativeOthersText ?? 'Others'}
					variant="primary"
					isActive={isLinkInDropdown}
					options={links}
				/>
			)}
		</>
	)
}

export const LinkItem = ({ option, activeLink, ...props }) => {
	return (
		<Link legacyBehavior href={option.to} prefetch={false} passHref>
			<NavLink data-active={option.label === activeLink} {...props}>
				{option.label}
			</NavLink>
		</Link>
	)
}

export const NavLink = styled.a`
	min-width: fit-content;
	border-radius: 12px;
	padding: 8px 12px;
	white-space: nowrap;
	font-size: 0.875rem;
	font-weight: 500;

	color: ${({ theme }) => (theme.mode === 'dark' ? '#629ff4' : '#2172E5')};
	background-color: ${({ theme }) =>
		theme.mode === 'dark' ? transparentize(0.9, '#629ff4') : transparentize(0.9, '#2172E5')};

	:hover,
	:focus-visible {
		background-color: ${({ theme }) =>
			theme.mode === 'dark' ? transparentize(0.8, '#629ff4') : transparentize(0.8, '#2172E5')};
	}

	&[data-active='true'] {
		background-color: #2172e5;
		color: white;

		:hover,
		:focus-visible {
			background-color: ${darken(0.1, '#2172E5')};
		}
	}
`
