import Link from 'next/link'
import Image from 'next/future/image'
import styled from 'styled-components'
import { LogoWrapper } from '../shared'
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

const Wrapper = styled.header`
	display: flex;
	justify-content: space-between;
	gap: 10px;
	min-width: 220px;
	padding: 8px;
	background: linear-gradient(168deg, #344179 3.98%, #445ed0 100%);

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: none;
	}
`
