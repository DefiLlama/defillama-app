import { useEffect, useRef, useState, Fragment, forwardRef } from 'react'
import Link from 'next/link'
import { ChevronRight, Menu as MenuIcon, X } from 'react-feather'
import styled, { keyframes } from 'styled-components'
import { linksWithNoSubMenu, navLinks } from '../Links'
import { useYieldApp } from '~/hooks'
import { Button, Close } from './shared'
import { useRouter } from 'next/router'

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

const Backdrop = styled.div`
	display: none;
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	background-color: rgb(0 0 0 / 10%);

	&[data-acitve='true'] {
		display: block;
	}
`

const Nav = styled.nav`
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	overflow: auto;
	display: flex;
	padding: 16px 16px 40px;
	width: 100%;
	max-width: 300px;
	background: ${({ theme }) => theme.bg1};
	flex-direction: column;
	gap: 20px;
	animation: 0.2s ${slideIn} ease;

	& > * {
		color: ${({ theme }) => theme.text1};
		opacity: 0.7;
		padding: 0;
		font-weight: 500;
	}

	button {
		text-align: start;
	}

	& > *[data-linksheader] {
		font-size: 0.75rem;
		opacity: 0.5;
	}
`
// TODO: add active link styles
export function Menu() {
	const [show, setShow] = useState(false)
	const buttonEl = useRef<HTMLButtonElement>(null)
	const navEl = useRef<HTMLDivElement>(null)

	const isYieldApp = useYieldApp()

	const commonLinks = isYieldApp ? navLinks['Yields'] : navLinks['DeFi']

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

			<Backdrop data-acitve={show}>
				<Nav ref={navEl}>
					<Close onClick={() => setShow(!show)}>
						<span className="visually-hidden">Close Navigation Menu</span>
						<X height={20} width={20} strokeWidth="4px" />
					</Close>

					<p data-linksheader>
						<span style={{ width: '30px', display: 'inline-block' }}></span>
						Dashboards
					</p>

					{Object.keys(navLinks).map((mainLink) => (
						<SubMenu key={mainLink} name={mainLink} />
					))}

					<hr />

					<p data-linksheader>
						<span style={{ width: '30px', display: 'inline-block' }}></span>
						Tools
					</p>

					{commonLinks.tools.map((link) => {
						if ('onClick' in link) {
							return (
								<button key={link.name} onClick={link.onClick}>
									<span style={{ width: '32px', display: 'inline-block' }}></span>
									{link.name}
								</button>
							)
						} else {
							return (
								<Fragment key={link.name}>
									<Link legacyBehavior href={link.path} key={link.path} prefetch={false} passHref>
										<a target="_blank" rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}>
											<span style={{ width: '32px', display: 'inline-block' }}></span>
											<span>{link.name}</span>
										</a>
									</Link>
								</Fragment>
							)
						}
					})}

					<hr />

					{commonLinks.footer.map((link) => {
						if ('onClick' in link) {
							return (
								<button key={link.name} onClick={link.onClick}>
									<span style={{ width: '32px', display: 'inline-block' }}></span>
									{link.name}
								</button>
							)
						} else {
							return (
								<Fragment key={link.name}>
									<Link legacyBehavior href={link.path} key={link.path} prefetch={false} passHref>
										<a target="_blank" rel={`noopener${!link.referrer ? ' noreferrer' : ''}`}>
											<span style={{ width: '32px', display: 'inline-block' }}></span>
											<span>{link.name}</span>
										</a>
									</Link>
								</Fragment>
							)
						}
					})}
				</Nav>
			</Backdrop>
		</>
	)
}

const SubMenu = forwardRef<HTMLDetailsElement, { name: string }>(function Menu({ name }, ref) {
	const noSubMenu = linksWithNoSubMenu.find((x) => x.name === name)
	const router = useRouter()

	if (noSubMenu || (name === 'Yields' && !router.pathname.startsWith('/yields'))) {
		return (
			<Link legacyBehavior href={noSubMenu?.url ?? '/yields'} passHref>
				<MainLink target={noSubMenu?.external && '_blank'}>{name}</MainLink>
			</Link>
		)
	}

	return (
		<Details ref={ref}>
			<summary data-togglemenuoff={false}>
				<ChevronRight size={18} id="chevron" data-togglemenuoff={false} />
				<span data-togglemenuoff={false}>{name}</span>
			</summary>
			<SubMenuWrapper>
				{navLinks[name].main.map((subLink) => (
					<Link legacyBehavior href={subLink.path} key={subLink.path} prefetch={false} passHref>
						<a>
							<span style={{ width: '32px', display: 'inline-block' }}></span>
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
		list-style-type: none;
		font-weight: 500;
	}

	& > summary::-webkit-details-marker {
		display: none;
	}
`

const SubMenuWrapper = styled.div`
	margin-top: 20px;
	display: flex;
	flex-direction: column;
	gap: 20px;
`

const MainLink = styled.a`
	font-weight: 500;
	margin-left: 32px;
`
