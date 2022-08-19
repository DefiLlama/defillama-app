import Link from 'next/link'
import Image from 'next/future/image'
import styled from 'styled-components'
import { Header, LogoWrapper, Nav } from '../shared'
import Logo from '~/assets/logo_white_long.png'

export default function MobileNav() {
	return (
		<Wrapper>
			<Link href="/" passHref>
				<LogoWrapper>
					<span className="visually-hidden">Navigate to Home Page</span>
					<Image src={Logo} alt="Navigate to Home Page" priority />
				</LogoWrapper>
			</Link>

			<Nav></Nav>
		</Wrapper>
	)
}

const Wrapper = styled(Header)`
	justify-content: space-between;
	padding: 12px 16px;
	display: flex;

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: none;
	}
`
