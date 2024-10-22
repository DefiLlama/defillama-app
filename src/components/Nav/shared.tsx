import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { BasicLink } from '~/components/Link'

export const Header = styled.header`
	gap: 10px;
	padding: 12px 16px;
	background: linear-gradient(168deg, #344179 3.98%, #445ed0 100%);

	scrollbar-width: none;
	::-webkit-scrollbar {
		display: none;
	}

	hr {
		border-color: ${({ theme }) => theme.divider};
		margin: 4px 0;
	}

	@media screen and (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		flex-direction: column;
		gap: 20px;
		padding: 24px;
		height: 100vh;
		overflow-y: auto;
		background: ${({ theme }) => theme.background};
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
		outline: 1px solid ${({ theme }) => theme.text1};
		opacity: 1;
	}
`

interface IEntryProps {
	url: string
	name: string
	Icon: React.FC<any>
	newTag?: boolean
	activeText?: string
	style?: {}
}

export const Entry = ({ url, name, Icon, newTag, ...props }: IEntryProps) => {
	const router = useRouter()

	return (
		<NavLink href={url} {...props} data-active={router.pathname === url}>
			<Icon height={20} width={20} />
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
