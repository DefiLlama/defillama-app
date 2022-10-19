import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { ButtonDark, ButtonLight } from '~/components/ButtonStyled'
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

const GAP = 6

const Wrapper = styled.ul`
	flex: 1;
	overflow: hidden;
	padding: 4px;
	display: flex;
	flex-wrap: wrap;
	gap: ${GAP}px;
	max-height: calc(1.8rem + 14px);

	& > li {
		list-style: none;
		display: inline-block;

		& > * {
			display: inline-block;
		}
	}
`

export const RowLinksWrapper = styled.nav`
	display: flex;
	align-items: center;
	gap: 20px;
	overflow: hidden;
	margin-bottom: -20px;

	& > ul {
		padding: 4px 0;
	}
`

// Renders a row of links and overflow links / links that not fit in viewport are shown in a dropdown
export const RowLinksWithDropdown = ({ links = [], activeLink, alternativeOthersText, ...props }: IRowLinksProps) => {
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

				if (linkSize.top - wrapper.top > wrapper.height || linkSize.left + GAP * 2 > wrapper.right - 160) {
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

	const { linksInRow, dropdownLinks } = useMemo(() => {
		if (lastIndexToRender === 'renderMenu') {
			return { linksInRow: null, dropdownLinks: links }
		}

		const linksInRow = lastIndexToRender ? links.slice(0, lastIndexToRender - 1) : links

		const dropdownLinks = lastIndexToRender ? links.slice(linksInRow.length) : null

		return { linksInRow, dropdownLinks }
	}, [links, lastIndexToRender])

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
					name={
						dropdownLinks.find((link) => link.label === activeLink) ? activeLink : alternativeOthersText ?? 'Others'
					}
					options={dropdownLinks}
				/>
			)}
		</>
	)
}

const LinkItem = ({ option, activeLink, ...props }) => {
	return (
		<li {...props}>
			<Link href={option.to} prefetch={false} passHref>
				{option.label === activeLink ? (
					<ButtonDark as="a">{option.label}</ButtonDark>
				) : (
					<ButtonLight as="a">{option.label}</ButtonLight>
				)}
			</Link>
		</li>
	)
}
