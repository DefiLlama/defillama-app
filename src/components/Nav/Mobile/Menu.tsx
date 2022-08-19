import { useRef, useEffect } from 'react'
import styled from 'styled-components'

const MenuIcon = () => (
	<svg width={24} height={24} fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M4 6h16M4 12h16M4 18h16" />
	</svg>
)

const StyledMenuIcon = styled(MenuIcon)`
	path {
		stroke: ${({ theme }) => theme.text1};
	}
`

const Wrapper = styled.button`
	padding: 0.15rem 0.5rem;
	height: 35px;
	background-color: ${({ theme }) => theme.bg3};
	border-radius: 0.5rem;

	:hover,
	:focus-visible {
		background-color: ${({ theme }) => theme.bg4};
	}
	svg {
		margin-top: 2px;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		display: none;
	}
`

export default function NavMenuButton({ setShow, show }) {
	const node = useRef<HTMLButtonElement>()

	const toggle = () => {
		setShow(!show)
	}

	useEffect(() => {
		function handleClick(e) {
			if (!(node.current && node.current.contains(e.target))) {
				setShow(false)
			}
		}

		document.addEventListener('click', handleClick)
		return () => {
			document.removeEventListener('click', handleClick)
		}
	})

	return (
		<Wrapper onClick={toggle} ref={node}>
			<span className="visually-hidden">Open Menu</span>
			<StyledMenuIcon />
		</Wrapper>
	)
}
