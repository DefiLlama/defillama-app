import * as React from 'react'
import { Popover as AriaPopover, PopoverDisclosure, usePopoverState } from 'ariakit/popover'
import { transparentize } from 'polished'
import styled from 'styled-components'
import { useSetPopoverStyles } from './utils'

const Trigger = styled(PopoverDisclosure)`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 8px 12px;
	font-size: 0.825rem;
	border-radius: 8px;
	cursor: pointer;
	outline: none;
	border: 1px solid transparent;
	background-color: ${({ theme }) => transparentize(0.9, theme.primary1)};
	color: ${({ theme }) => theme.text1};

	white-space: nowrap;

	:hover,
	:focus-visible {
		background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
	}

	:focus-visible,
	[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
		outline-offset: 1px;
	}
`

export const PopoverWrapper = styled(AriaPopover)`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 20px 0 32px;
	width: 100%;
	max-width: none;
	max-height: calc(100vh - 200px);
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
	opacity: 0;
	z-index: 10;

	transform: translateY(100%);
	transition: 0.2s ease;

	&[data-enter] {
		opacity: 1;
		transform: translateY(0%);
	}

	&[data-leave] {
		transition: 0.1s ease;
	}

	:focus-visible,
	[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
		outline-offset: 1px;
	}

	@media screen and (min-width: 640px) {
		padding: 0;
		max-width: min(calc(100vw - 16px), 320px);
		background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
		border-radius: 8px;
		transform: translateY(0%);
	}
`

interface IProps {
	trigger: React.ReactNode
	content: React.ReactNode
}

export default function Popover({ trigger, content, ...props }: IProps) {
	const [isLarge, renderCallback] = useSetPopoverStyles()

	const popover = usePopoverState({ renderCallback, gutter: 8, animated: true })

	return (
		<>
			<Trigger state={popover}>{trigger}</Trigger>
			<PopoverWrapper state={popover} modal={!isLarge} {...props}>
				{content}
			</PopoverWrapper>
		</>
	)
}
