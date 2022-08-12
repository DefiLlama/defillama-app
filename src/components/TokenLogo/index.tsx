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
	skipApiRoute?: boolean
	id?: string
}

const BAD_IMAGES = {}

const Inline = styled.span`
	display: flex;
	align-items: center;
	justify-content: center;
	background: ${({ theme }) => theme.bg3};
	border-radius: 50%;
	box-shadow: ${({ theme }) => theme.shadowSm};
	flex-shrink: 0;
`

const Image = styled(NextImage)`
	display: inline-block;
	background: transparent;
	border-radius: 50%;
`
// next/image won't work, idk why
export default function TokenLogo({
	logo = null, //PlaceHolder.src default
	external = false /* TODO: temporary fix */,
	size = 24,
	style,
	skipApiRoute = false,
	id,
	...rest
}: TokenLogoProps) {
	const [error, setError] = React.useState(false)
	React.useEffect(() => {
		setError(false)
	}, [logo])

	if (!logo) return <></> //if no src is set, no logo is displayed

	if (external) {
		return (
			<Inline id={id}>
				<Image
					{...rest}
					alt={''}
					src={skipApiRoute ? logo : `/api/image?url=${encodeURIComponent(logo)}`}
					height={size}
					width={size}
				/>
			</Inline>
		)
	}

	if (error || BAD_IMAGES[logo]) {
		return (
			<Inline id={id}>
				<Image {...rest} alt={''} src={PlaceHolder} height={size} width={size} />
			</Inline>
		)
	}

	return (
		<Inline id={id} style={style}>
			<Image
				{...rest}
				alt={''}
				src={logo}
				height={size}
				width={size}
				onError={(event) => {
					BAD_IMAGES[logo] = true
					setError(true)
					event.preventDefault()
				}}
			/>
		</Inline>
	)
}
