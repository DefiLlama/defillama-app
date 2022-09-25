import Link from 'next/link'
import Image from 'next/future/image'
import styled from 'styled-components'
import { Header, LogoWrapper } from '../shared'
import Logo from '~/assets/logo_white_long.png'
import MobileSearch from '~/components/Search/Base/Mobile'
import { Menu } from './Menu'
import { Settings } from './Settings'

export default function MobileNav() {
	return (
		<Wrapper>
			<Link href="/" passHref>
				<LogoWrapper>
					<span className="visually-hidden">Navigate to Home Page</span>
					<Image src={Logo} alt="Navigate to Home Page" priority />
				</LogoWrapper>
			</Link>

			<MobileSearch />
			<Settings />
			<Menu />
		</Wrapper>
	)
}

const Wrapper = styled(Header)`
	display: flex;

	button {
		flex-shrink: 0;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: none;
	}
`
