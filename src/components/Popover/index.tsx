import * as React from 'react'
import { Popover as AriaPopover, PopoverDisclosure, usePopoverState } from 'ariakit/popover'
import { transparentize } from 'polished'
import styled from 'styled-components'
import { useSetPopoverStyles } from './utils'
import { useRouter } from 'next/router'
import { Tooltip2 } from '../Tooltip'
import { Code } from 'react-feather'
import { useDefiManager } from '~/contexts/LocalStorage'

const Trigger = styled(PopoverDisclosure)`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 8px 12px;
	font-size: 0.825rem;
	border-radius: 12px;
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

	&[data-variant='secondary'] {
		background: ${({ theme, color }) =>
			color ? transparentize(0.8, color) : theme.mode === 'dark' ? '#22242a' : '#eaeaea'};
		font-size: 0.75rem;

		:hover,
		:focus-visible {
			background: ${({ theme, color }) =>
				color ? transparentize(0.8, color) : theme.mode === 'dark' ? '#22242a' : '#eaeaea'};
		}
	}

	:focus-visible,
	[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
		outline-offset: 1px;
	}
`

export const PopoverTrigger = styled(PopoverDisclosure)`
	display: inline-block;
	font-weight: 500;
	font-size: 0.875rem;
	border-radius: 12px;
	background-color: ${({ theme, color }) => (color ? transparentize(0.8, color) : transparentize(0.8, theme.primary1))};
	padding: 10px 12px;
	color: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)')};

	:hover,
	:focus-visible {
		background-color: ${({ color }) => transparentize(0.4, color)};
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

	&[data-variant='secondary'] {
		background: ${({ theme }) => (theme.mode === 'dark' ? '#222429' : '#f6f6f6')};
	}

	@media screen and (min-width: 640px) {
		padding: 0;
		max-width: min(calc(100vw - 16px), 320px);
		background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
		border-radius: 8px;
		transform: translateY(0%);

		&[data-variant='secondary'] {
			background: ${({ theme }) => (theme.mode === 'dark' ? '#222429' : '#f6f6f6')};
		}
	}
`

interface IProps {
	variant?: 'primary' | 'secondary'
	trigger: React.ReactNode
	content: React.ReactNode
	color?: string
}

export default function Popover({ trigger, content, variant = 'primary', color, ...props }: IProps) {
	const [isLarge, renderCallback] = useSetPopoverStyles()

	const popover = usePopoverState({ renderCallback, gutter: 8, animated: true })

	return (
		<>
			<Trigger state={popover} data-variant={variant} color={color}>
				{trigger}
			</Trigger>
			<PopoverWrapper state={popover} modal={!isLarge} data-variant={variant} {...props}>
				{content}
			</PopoverWrapper>
		</>
	)
}

const CopyContent = styled.div`
	padding: 8px;

	p {
		padding: 8px;
		background: ${({ theme }) => (theme.mode === 'dark' ? 'black' : 'white')};
		border-radius: 10px;
	}
`

export function EmbedChart({ color, ...props }) {
	const [isLarge, renderCallback] = useSetPopoverStyles()

	const popover = usePopoverState({ renderCallback, gutter: 8, animated: true })

	const router = useRouter()

	const [extraTvlsEnabled] = useDefiManager()

	let path = router.asPath === '/' ? '/chain/All' : router.asPath

	if (!path.includes('?')) {
		path += '?'
	}

	for (const option in extraTvlsEnabled) {
		if (extraTvlsEnabled[option]) {
			path += `&include_${option}_in_tvl=true`
		}
	}

	const url = `<iframe width="640px" height="360px" src="https://defillama.com/chart${path}" title="DefiLlama" frameborder="0"></iframe>`

	return (
		<>
			<Tooltip2 content="Embed Chart">
				<PopoverTrigger state={popover} color={color}>
					<Code size={16} />
				</PopoverTrigger>
			</Tooltip2>

			<PopoverWrapper state={popover} modal={!isLarge} {...props}>
				<CopyContent>
					<p>{url}</p>
				</CopyContent>
			</PopoverWrapper>
		</>
	)
}
