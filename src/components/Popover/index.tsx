import * as React from 'react'
import {
	Popover as AriaPopover,
	PopoverDisclosure,
	PopoverStateRenderCallbackProps,
	usePopoverState
} from 'ariakit/popover'
import { transparentize } from 'polished'
import styled from 'styled-components'
import { useMedia } from '~/hooks'
import assignStyle from './assign-style'

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

const PopoverWrapper = styled(AriaPopover)`
	z-index: 1;
	display: flex;
	flex-direction: column;
	gap: 16px;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
	border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#40444f' : '#cbcbcb')};
	filter: ${({ theme }) =>
		theme.mode === 'dark'
			? 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 40%))'
			: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%))'};
	border-radius: 8px;
	max-height: calc(100vh - 200px);
	width: 100%;
	max-width: none;
	padding-bottom: 16px;

	:focus-visible,
	[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
		outline-offset: 1px;
	}

	@media screen and (min-width: 640px) {
		padding-bottom: 0;
		max-width: min(calc(100vw - 16px), 320px);
	}
`

function applyMobileStyles(popover: HTMLElement) {
	const restorePopoverStyle = assignStyle(popover, {
		position: 'fixed',
		bottom: '0',
		width: '100%',
		padding: '12px'
	})

	const restoreDesktopStyles = () => {
		restorePopoverStyle()
	}
	return restoreDesktopStyles
}

interface IProps {
	trigger: React.ReactNode
	content: React.ReactNode
}

export default function Popover({ trigger, content, ...props }: IProps) {
	const isLarge = useMedia('(min-width: 640px)', true)

	const renderCallback = React.useCallback(
		(props: PopoverStateRenderCallbackProps) => {
			const { popover, defaultRenderCallback } = props
			if (isLarge) return defaultRenderCallback()
			return applyMobileStyles(popover)
		},
		[isLarge]
	)

	const popover = usePopoverState({ renderCallback, gutter: 8 })

	return (
		<>
			<Trigger state={popover}>{trigger}</Trigger>
			<PopoverWrapper state={popover} modal={!isLarge} {...props}>
				{content}
			</PopoverWrapper>
		</>
	)
}
