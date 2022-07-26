import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Icon } from 'react-feather'
import { BasicLink } from '~/components/Link'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import ThemeSwitch from './ThemeSwitch'

export const Wrapper = styled.header`
	min-width: 220px;
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 16px;
	z-index: 1;
	background: linear-gradient(168deg, #344179 3.98%, #445ed0 100%);

	scrollbar-width: none;
	::-webkit-scrollbar {
		display: none;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		padding: 32px 24px;
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		width: revert;
		height: 100vh;
		overflow-y: auto;
	}
`

export const TitleWrapper = styled.span`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px;

	& > *:first-child {
		flex: 1;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		& > *:not(:first-child) {
			display: none;
		}
	}
`

export const Nav = styled.nav`
	flex: 1;
	display: var(--mobile-display);
	flex-direction: column;
	gap: 20px;

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: flex;
	}
`

export const NavLink = styled(BasicLink)`
	font-weight: 500;
	font-size: 14px;
	color: ${({ theme }) => theme.white};
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

const FooterWrapper = styled.section`
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: auto;

	& a {
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

export const MobileOnlyEntry = styled(Entry)`
	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: none;
	}
`

export const Footer = ({ app }: { app: 'defi' | 'yields' }) => {
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	const downloadAll = ()=>{
		if(confirm(`This data export contains a lot of data and is not well suited for most types of analysis.
We heavily recommend to use the csv exports available on other pages through the ".csv" buttons, since this export is hard to analyze unless you make heavy use of code.

Do you still wish to download it?`)){
			window.location.href = "https://datasets.llama.fi/all.csv"
		}
	}

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

						<Link href="https://t.me/defillama_tg" passHref>
							<a target="_blank" rel="noopener noreferrer">
								Daily news
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

						<p onClick={downloadAll}>
							<a target="_blank" rel="noopener noreferrer">
								Download Data
							</a>
						</p>
					</>
				) : (
					<Link href="https://datasets.llama.fi/yields/yield_rankings.csv" passHref>
						<a target="_blank" rel="noopener noreferrer">
							Download Data
						</a>
					</Link>
				)}
			</FooterWrapper>

			<ThemeSwitch isActive={darkMode} toggle={toggleDarkMode} />
		</>
	)
}
