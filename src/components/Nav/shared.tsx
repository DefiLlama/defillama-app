import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Icon } from 'react-feather'
import { BasicLink } from '~/components/Link'

export const Header = styled.header`
	min-width: 220px;
	gap: 10px;
	padding: 12px 16px;
	background: linear-gradient(168deg, #344179 3.98%, #445ed0 100%);
	z-index: 1;

	scrollbar-width: none;
	::-webkit-scrollbar {
		display: none;
	}

	@media screen and (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		flex-direction: column;
		gap: 20px;
		padding: 24px;
		width: revert;
		height: 100vh;
		overflow-y: auto;
	}
`

export const LogoWrapper = styled.a`
	flex-shrink: 0;
	transition: transform 0.3s ease;
	margin-right: auto;

	:focus-visible {
		outline: 1px solid white;
	}

	img {
		height: 36px;
		object-fit: contain;
		object-position: left;
		width: min-content;
	}

	@media screen and (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		:hover {
			transform: rotate(-5deg);
		}

		img {
			height: 53px;
		}
	}
`

export const NavLink = styled(BasicLink)`
	font-weight: 500;
	font-size: 14px;
	color: ${({ theme }) => theme.text1};
	display: flex;
	align-items: center;
	gap: 12px;
	opacity: 0.7;

	&[data-active='true'] {
		opacity: 1;
	}

	:hover {
		opacity: 1;
	}

	:focus-visible {
		outline: 1px solid white;
		opacity: 1;
	}

	@media screen and (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		color: ${({ theme }) => theme.white};
		opacity: 0.6;

		&[data-active='true'] {
			opacity: 1;
		}
	}
`

export const FooterWrapper = styled.section`
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: auto;

	a,
	button {
		display: inline-block;
		color: ${({ theme }) => theme.white};
		opacity: 0.8;

		:hover {
			opacity: 1;
		}

		:focus-visible {
			outline: 1px solid white;
			opacity: 1;
		}
	}

	button {
		text-align: start;
		padding: 0;
	}
`

interface IEntryProps {
	url: string
	name: string
	Icon: Icon
	newTag?: boolean
	activeText?: string
	style?: {}
}

export const Entry = ({ url, name, Icon, newTag, ...props }: IEntryProps) => {
	const router = useRouter()

	return (
		<NavLink href={url} {...props} data-active={router.pathname === url}>
			<Icon size={20} />
			<span>{name}</span>
			{newTag === true && (
				<span
					style={{
						background: '#ebebeb',
						padding: '3px',
						position: 'relative',
						top: '2px',
						left: '-6px',
						borderRadius: '4px',
						color: 'black',
						fontSize: '0.625rem'
					}}
				>
					NEW
				</span>
			)}
		</NavLink>
	)
}

export const PaperIcon = () => (
	<svg
		stroke="currentColor"
		fill="currentColor"
		strokeWidth="0"
		viewBox="0 0 512 512"
		height="20px"
		width="20px"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			fill="none"
			strokeLinejoin="round"
			strokeWidth="32"
			d="M368 415.86V72a24.07 24.07 0 00-24-24H72a24.07 24.07 0 00-24 24v352a40.12 40.12 0 0040 40h328"
		></path>
		<path
			fill="none"
			strokeLinejoin="round"
			strokeWidth="32"
			d="M416 464h0a48 48 0 01-48-48V128h72a24 24 0 0124 24v264a48 48 0 01-48 48z"
		></path>
		<path
			fill="none"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="32"
			d="M240 128h64m-64 64h64m-192 64h192m-192 64h192m-192 64h192"
		></path>
		<path d="M176 208h-64a16 16 0 01-16-16v-64a16 16 0 0116-16h64a16 16 0 0116 16v64a16 16 0 01-16 16z"></path>
	</svg>
)
