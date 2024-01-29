import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header, LogoWrapper } from '../shared'
import Logo from '~/assets/logo_white_long.png'
import { Menu } from './Menu'
import { Settings } from './Settings'

const MobileSearch = dynamic(() => import('~/components/Search/Base/Mobile'), {
	ssr: false,
	loading: () => <></>
}) as React.FC

export default function MobileNav() {
	const router = useRouter()

	return (
		<Wrapper>
			<Link href="/" passHref>
				<LogoWrapper>
					<span className="visually-hidden">Navigate to Home Page</span>
					<Image src={Logo} alt="Navigate to Home Page" priority />
				</LogoWrapper>
			</Link>

			{!router.pathname.startsWith('/yield') && !router.pathname.startsWith('/raises') && <MobileSearch />}

			<Settings />
			<Menu />
		</Wrapper>
	)
}

const Wrapper = styled(Header)`
	display: flex;
	z-index: 10;

	button {
		flex-shrink: 0;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: none;
	}
`
