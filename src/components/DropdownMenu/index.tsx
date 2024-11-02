import Link from 'next/link'
import { Menu as AriakitMenu, MenuButton, MenuItem, MenuButtonArrow, useMenuState } from 'ariakit/menu'
import { transparentize } from 'polished'
import styled from 'styled-components'
import { useSetPopoverStyles } from '~/components/Popover/utils'

interface IMenuProps {
	options: string[] | string
	name: string
	color?: string
	isExternal?: boolean
	onItemClick?: (value: any) => void
	variant?: 'primary' | 'secondary'
}

export function Menu({ options, name, color, isExternal, onItemClick, variant = 'primary', ...props }: IMenuProps) {
	const [isLarge, renderCallback] = useSetPopoverStyles()
	const _options = typeof options === 'string' ? [options] : options

	const menu = useMenuState({ gutter: 8, animated: true, renderCallback })

	return (
		<>
			<Button state={menu} color={color} data-variant={variant} {...props}>
				{name}
				<MenuButtonArrow />
			</Button>
			<Popover state={menu} modal={!isLarge}>
				{_options.map((value, i) => {
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
	border-radius: 12px;
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

	&[data-variant='secondary'] {
		background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
		font-size: 0.75rem;

		:hover,
		:focus-visible,
		&[data-focus-visible] {
			background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
		}
	}
`
// TODO remove repeated styles
export const Popover = styled(AriakitMenu)`
	display: flex;
	flex-direction: column;
	gap: 8px;
	height: 60vh;
	min-width: 180px;
	font-size: 0.875rem;
	font-weight: 500;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg1};
	border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#40444f' : '#cbcbcb')};
	border-radius: 8px 8px 0 0;
	filter: ${({ theme }) =>
		theme.mode === 'dark'
			? 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 40%))'
			: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%))'};
	overflow: auto;
	overscroll-behavior: contain;
	outline: none !important;
	z-index: 10;

	opacity: 0;
	transform: translateY(100%);
	transition: 0.2s ease;

	&[data-enter] {
		transform: translateY(0%);
		opacity: 1;
	}

	&[data-leave] {
		transition: 0.1s ease;
	}

	@media screen and (min-width: 640px) {
		height: unset;
		max-height: 400px;
		font-size: 0.825rem;
		font-weight: 400;
		gap: 0px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
		border-radius: 8px;
		transform: translateY(0%);
	}
`

export const Item = styled(MenuItem)`
	flex-shrink: 0;
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
