import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Icon } from 'react-feather'
import { BasicLink } from '~/components/Link'
import { transparentize } from 'polished'

export const Wrapper = styled.div`
	position: sticky;
	top: 0;
	height: 100vh;
	width: 220px;
	grid-column: span 1;
	padding: 32px;
	background: ${({ theme }) => (theme.mode === 'dark' ? '#222c3d' : '#edf0fa')};
	z-index: 1;
	overflow-y: auto;
	display: none;

	scrollbar-width: none;
	::-webkit-scrollbar {
		display: none;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: block;
	}
`

export const Nav = styled.nav`
	display: flex;
	flex-direction: column;
	gap: 20px;
	height: 100%;
`

export const NavLink = styled(BasicLink)`
	font-weight: 500;
	font-size: 14px;
	display: flex;
	align-items: center;
	gap: 12px;

	:hover {
		opacity: 1;
	}

	:focus-visible {
		outline: 1px solid white;
		opacity: 1;
	}
`

const FooterWrapper = styled.span`
	display: flex;
	flex-direction: column;
	gap: 10px;
	border-top: ${({ theme }) => '1px solid ' + transparentize(0.9, theme.text1)};
	padding-top: 20px;

	& > a {
		display: inline-block;
		opacity: 0.8;

		:hover {
			opacity: 1;
		}

		:focus-visible {
			outline: 1px solid white;
			opacity: 1;
		}
	}
`

const NewTagWrapper = styled.span`
	background: ${({ theme }) => theme.bg6};
	padding: 3px;
	position: relative;
	top: 2px;
	left: -6px;
	border-radius: 4px;
	color: ${({ theme }) => theme.text1};
	font-size: 0.625rem;
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
		<NavLink href={url} {...props} style={{ opacity: router.pathname === url ? 1 : 0.6 }}>
			<Icon size={20} />
			<span>{name}</span>
			{newTag === true && <NewTagWrapper>NEW</NewTagWrapper>}
		</NavLink>
	)
}

export const MobileOnlyEntry = styled(Entry)`
	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: none;
	}
`

export const Footer = ({ app }: { app: 'defi' | 'yields' }) => {
	return (
		<>
			<FooterWrapper>
				{app === 'defi' ? (
					<>
						<Link href="https://twitter.com/DefiLlama" passHref>
							<a target="_blank" rel="noopener noreferrer">
								Twitter
							</a>
						</Link>

						<Link href="https://discord.gg/buPFYXzDDd" passHref>
							<a target="_blank" rel="noopener noreferrer">
								Discord
							</a>
						</Link>

						<Link href="https://etherscan.io/address/0x08a3c2A819E3de7ACa384c798269B3Ce1CD0e437" passHref>
							<a target="_blank" rel="noopener noreferrer">
								Donate
							</a>
						</Link>

						<Link href="/press" passHref prefetch={false}>
							<a>Press / Media</a>
						</Link>

						<Link href="/docs/api" passHref prefetch={false}>
							<a>API Docs</a>
						</Link>

						<Link href="https://docs.llama.fi/list-your-project/submit-a-project" passHref>
							<a target="_blank" rel="noopener noreferrer">
								List Your Project
							</a>
						</Link>

						<Link href="https://datasets.llama.fi/all.csv" passHref>
							<a target="_blank" rel="noopener noreferrer">
								Download Data
							</a>
						</Link>
					</>
				) : (
					<Link href="https://datasets.llama.fi/yields/yield_rankings.csv" passHref>
						<a target="_blank" rel="noopener noreferrer">
							Download Data
						</a>
					</Link>
				)}
			</FooterWrapper>
		</>
	)
}
