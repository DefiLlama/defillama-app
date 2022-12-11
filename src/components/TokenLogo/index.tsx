import * as React from 'react'
import styled from 'styled-components'
import NextImage from 'next/future/image'
import PlaceHolder from '~/assets/placeholder.png'

interface TokenLogoProps {
	logo?: string | null
	header?: boolean
	external?: boolean
	size?: number
	style?: React.CSSProperties
	address?: string
	id?: string
	onClick?: React.MouseEventHandler
}

const BAD_IMAGES = {}

const Image = styled(NextImage)`
	display: inline-block;
	object-fit: cover;
	aspect-ratio: 1;
	background: ${({ theme }) => theme.bg3};
	border-radius: 50%;
	flex-shrink: 0;
`

export const isExternalImage = (imagePath: string) => {
	return imagePath?.includes('http')
}

export default function TokenLogo({ logo = null, external = false, size = 24, style, id, ...rest }: TokenLogoProps) {
	const [error, setError] = React.useState(false)

	const isError = error || !logo || BAD_IMAGES[logo]
	const imgSrc = isError ? PlaceHolder : external ? logo : logo

	return (
		<Image
			{...rest}
			alt={''}
			src={imgSrc}
			onError={(e) => {
				e.preventDefault()
				BAD_IMAGES[logo] = true
				setError(true)
			}}
			height={size}
			width={size}
			id={id}
			style={style}
		/>
	)
}
