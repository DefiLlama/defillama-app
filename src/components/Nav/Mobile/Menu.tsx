import { useEffect, useRef, useState, Fragment, forwardRef } from 'react'
import Link from 'next/link'
import { ChevronRight, Menu as MenuIcon, X } from 'react-feather'
import styled, { keyframes } from 'styled-components'
import { Entry } from '../shared'
import { IMainLink, navLinks } from '../Links'
import { usePeggedApp, useYieldApp } from '~/hooks'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { Button, Close } from './shared'

const slideIn = keyframes`
  0% {
    opacity: 0;
		right: -100%;
  }
  100% {
    opacity: 1;
		right: 0%;
  }
`

const Nav = styled.nav`
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	overflow: auto;
	background: red;
	display: none;
	padding: 16px 16px 40px;
	width: 100%;
	max-width: 300px;
	background: ${({ theme }) => theme.bg1};

	& > * {
		color: ${({ theme }) => theme.text1};
		opacity: 0.7;
		padding: 0;
	}

	button {
		text-align: start;
	}

	&[data-acitve='true'] {
		display: flex;
		flex-direction: column;
		gap: 20px;
		animation: 0.2s ${slideIn} ease;
	}
`

export function Menu() {
	const [show, setShow] = useState(false)
	const buttonEl = useRef<HTMLButtonElement>(null)
	const navEl = useRef<HTMLDivElement>(null)

	const isYieldApp = useYieldApp()
	const isPeggedApp = usePeggedApp()
	const [darkMode, toggleDarkMode] = useDarkModeManager()

	const links = isYieldApp ? navLinks.yields : isPeggedApp ? navLinks.stablecoins : navLinks.defi

	useEffect(() => {
		function handleClick(e) {
			if (
				!(
					buttonEl.current &&
					navEl.current &&
					(buttonEl.current.contains(e.target) ||
						navEl.current.isSameNode(e.target) ||
						'togglemenuoff' in e.target.dataset)
				)
			) {
				setShow(false)
			}
		}

		document.addEventListener('click', handleClick)

		return () => {
			document.removeEventListener('click', handleClick)
		}
	}, [])

	return (
		<>
			<Button onClick={() => setShow(!show)} ref={buttonEl}>
				<span className="visually-hidden">Open Navigation Menu</span>
				<MenuIcon height={16} width={16} />
			</Button>
			<Nav data-acitve={show} ref={navEl}>
				<Close onClick={() => setShow(!show)}>
					<span className="visually-hidden">Close Navigation Menu</span>
					<X height={20} width={20} strokeWidth="4px" />
				</Close>

				{links.main.map((link) => (
					<Fragment key={link.path}>
						{link.subMenuHeader && navLinks[link.name.toLowerCase()] ? (
							<SubMenu parentLink={link} />
						) : (
							<Entry name={link.name} url={link.path} Icon={link.icon} newTag={link.newTag} />
						)}
					</Fragment>
				))}

				{links.footer.map((link) => {
					if ('onClick' in link) {
						return (
							<button key={link.name} onClick={link.onClick}>
								<div style={{ width: '32px', display: 'inline-block' }}></div>
								{link.name}
							</button>
						)
					} else {
						return (
							<Fragment key={link.name}>
								<Link href={link.path} key={link.path} prefetch={false} passHref>
									<a target="_blank" rel="noopener noreferrer">
										<div style={{ width: '32px', display: 'inline-block' }}></div>
										<span>{link.name}</span>
									</a>
								</Link>
							</Fragment>
						)
					}
				})}

				<button onClick={toggleDarkMode}>
					<div style={{ width: '32px', display: 'inline-block' }}></div>
					{`Toggle ${darkMode ? 'light' : 'dark'} mode`}
				</button>
			</Nav>
		</>
	)
}

const SubMenu = forwardRef<HTMLDetailsElement, { parentLink: IMainLink }>(function card({ parentLink }, ref) {
	return (
		<Details ref={ref}>
			<summary data-togglemenuoff={false}>
				<ChevronRight size={18} id="chevron" data-togglemenuoff={false} />
				<span data-togglemenuoff={false}>{parentLink.name}</span>
			</summary>
			<SubMenuWrapper>
				{navLinks[parentLink.name.toLowerCase()].main
					.filter((l) => !l.hideOnMobile)
					.map((subLink) => (
						<Link href={subLink.path} key={subLink.path} prefetch={false} passHref>
							<a>
								<div style={{ width: '44px', display: 'inline-block' }}></div>
								<span>{subLink.name}</span>
							</a>
						</Link>
					))}
			</SubMenuWrapper>
		</Details>
	)
})

const Details = styled.details`
	&[open] #chevron {
		transform: rotate(90deg);
	}

	& > summary {
		display: flex;
		gap: 12px;
		list-style: none;
	}
`

const SubMenuWrapper = styled.div`
	margin-top: 12px;
	display: flex;
	flex-direction: column;
	gap: 20px;
`
