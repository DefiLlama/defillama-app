import * as React from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import Logo from '~/assets/logo_white_long.png'
import Image from 'next/image'
import { LogoWrapper } from '../shared'

export default function Mobile() {
	return (
		<Wrapper>
			<Link href="/" passHref>
				<LogoWrapper>
					<Image
						src={Logo}
						alt="Navigate to Home Page"
						height={36}
						objectFit="contain"
						objectPosition="left"
						priority
					/>
				</LogoWrapper>
			</Link>
		</Wrapper>
	)
}

const Wrapper = styled.header`
	grid-column: 1/ -1;
	grid-row: span 1;
	display: flex;
	align-items: center;
	gap: 1.5rem;
	padding: 12px 16px;
	z-index: 10;

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: none;
	}
`
