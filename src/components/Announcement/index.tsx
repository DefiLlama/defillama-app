import * as React from 'react'
import Image from 'next/future/image'
import styled from 'styled-components'
import lubb from '~/assets/lubb.png'

export default function Announcement({ children }: { children: React.ReactNode }) {
	return (
		<Wrapper>
			{children}
			<Image src={lubb} width={18} height={18} alt="llama love" />
		</Wrapper>
	)
}

const Wrapper = styled.p`
	padding: 16px;
	font-size: 1rem;
	color: white;
	background-color: #2172e5;
	text-align: center;
	box-shadow: ${({ theme }) => theme.shadowSm};
	border-radius: 8px;

	a {
		font-weight: 500;
	}

	img {
		position: relative;
		top: 2px;
		left: 4px;
		display: inline-block;
	}
`
