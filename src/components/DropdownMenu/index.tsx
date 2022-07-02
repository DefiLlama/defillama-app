import Link from 'next/link'
import { Menu as AriakitMenu, MenuButton, MenuItem, MenuButtonArrow, useMenuState } from 'ariakit/menu'
import { transparentize } from 'polished'
import styled from 'styled-components'

interface IMenuProps {
	options: string[]
	name: string
	color?: string
	isExternal?: boolean
	onItemClick?: (value: any) => void
}

export function Menu({ options, name, color, isExternal, onItemClick }: IMenuProps) {
	const menu = useMenuState({ gutter: 8 })

	return (
		<>
			<Button state={menu} className="button" color={color}>
				{name}
				<MenuButtonArrow />
			</Button>
			<Popover state={menu} className="menu">
				{options.map((value, i) => {
					return onItemClick ? (
						<Item as="button" key={value + i} onClick={() => onItemClick(value)}>
							{value}
						</Item>
					) : isExternal ? (
						<a href={value} target="_blank" rel="noopener noreferrer" key={value + i}>
							<Item>{value}</Item>
						</a>
					) : (
						<Link href={value} key={value + i} passHref>
							<Item>{value}</Item>
						</Link>
					)
				})}
			</Popover>
		</>
	)
}

interface IButtonProps {
	color?: string
}

export const Button = styled(MenuButton)<IButtonProps>`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 8px 12px;
	font-size: 0.825rem;
	border-radius: 8px;
	background-color: ${({ color, theme }) => transparentize(0.9, color || theme.primary1)};
	color: ${({ theme }) => theme.text1};

	white-space: nowrap;

	:hover,
	:focus-visible {
		background-color: ${({ color, theme }) => transparentize(0.8, color || theme.primary1)};
	}

	:focus-visible {
		outline-offset: 1px;
	}

	span {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	svg {
		position: relative;
		top: 1px;
	}
`

export const Popover = styled(AriakitMenu)`
	min-width: 180px;
	outline: none !important;
	position: relative;
	z-index: 50;
	display: flex;
	flex-direction: column;
	overscroll-behavior: contain;
	font-size: 0.825rem;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
	border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#40444f' : '#cbcbcb')};
	filter: ${({ theme }) =>
		theme.mode === 'dark'
			? 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 40%))'
			: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%))'};
	border-radius: 8px;
	z-index: 100;
	max-height: 400px;
	overflow: visible;

	#no-results {
		padding: 0 12px 8px;
		text-align: center;
	}
`

export const Item = styled(MenuItem)`
	padding: 8px 12px;
	color: ${({ theme }) => theme.text1};
	cursor: pointer;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	background: none;
	border: none;
	border-radius: 8px;
	text-align: start;

	:hover,
	:focus-visible,
	&[data-active-item] {
		outline: none;
		background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
	}
`
