import * as React from 'react'
import styled from 'styled-components'

interface TokenLogoProps {
	logo?: string | null
	fallbackLogo?: string | null
	header?: boolean
	external?: boolean
	size?: number
	style?: React.CSSProperties
	address?: string
	id?: string
	onClick?: React.MouseEventHandler
}

const Image = styled.img`
	display: inline-block;
	object-fit: cover;
	aspect-ratio: 1;
	background: ${({ theme }) => theme.bg3};
	border-radius: 50%;
	flex-shrink: 0;
`

export default function TokenLogo({ logo = null, size = 24, style, id, fallbackLogo, ...rest }: TokenLogoProps) {
	return (
		<Image
			{...rest}
			alt={''}
			src={logo || fallbackLogo}
			height={size}
			width={size}
			id={id}
			style={style}
			loading="lazy"
			onError={(e) => {
				e.currentTarget.src = fallbackLogo || '/placeholder.png'
			}}
		/>
	)
}
