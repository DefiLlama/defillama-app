import { forwardRef } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { linksWithNoSubMenu, navLinks } from '../Links'

const SubMenu = forwardRef<HTMLDetailsElement, { name: string }>(function card({ name }, ref) {
	const noSubMenu = linksWithNoSubMenu.find((x) => x.name === name)

	if (noSubMenu) {
		return (
			<Link href={noSubMenu.url} passHref>
				<MainLink>
					{navLinks[name].icon}
					<span data-togglemenuoff={false}>{name}</span>
				</MainLink>
			</Link>
		)
	}
	if (linksWithNoSubMenu)
		return (
			<Details ref={ref}>
				<summary data-togglemenuoff={false}>
					{navLinks[name].icon}
					<span data-togglemenuoff={false}>{name}</span>
				</summary>
				<SubMenuWrapper>
					{navLinks[name].main.map((subLink) => (
						<Link href={subLink.path} key={subLink.path} prefetch={false} passHref>
							<a>
								<span style={{ width: '28px', display: 'inline-block' }}></span>
								<span>{subLink.name}</span>
							</a>
						</Link>
					))}
				</SubMenuWrapper>
			</Details>
		)
})

const Details = styled.details`
	cursor: pointer;

	summary {
		display: flex;
		align-items: center;
		gap: 12px;
		list-style: none;
		list-style-type: none;
		font-size: 1rem;
		opacity: 0.8;
	}

	summary:hover {
		opacity: 1;
	}

	summary::-webkit-details-marker {
		display: none;
	}
`

const SubMenuWrapper = styled.span`
	margin-top: 12px;
	display: flex;
	flex-direction: column;
	gap: 20px;
`

const MainLink = styled.a`
	display: flex;
	align-items: center;
	gap: 12px;
	opacity: 0.8;
	font-size: 1rem;

	&:hover {
		opacity: 1;
	}
`

export default SubMenu
