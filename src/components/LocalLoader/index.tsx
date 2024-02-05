import * as React from 'react'
import Image from 'next/image'
import styled, { css, keyframes } from 'styled-components'
import { useNFTApp } from '~/hooks'
import DefiLogo from '~/assets/logo_white.png'
import NFTLogo from '~/assets/nft_logo_white.png'

const rotate = keyframes`
  0% { transform: scale(1); }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); }
`

const Loader = styled.div<ILocalLoaderProps>`
	pointer-events: none;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;

	animation: ${rotate} 800ms linear infinite;

	${(props) =>
		props.fill
			? css`
					height: 100%;
			  `
			: css`
					height: 180px;
			  `}
`

interface ILocalLoaderProps {
	fill?: boolean
	style?: React.CSSProperties
}

const LocalLoader = ({ fill, ...props }: ILocalLoaderProps) => {
	const isNFTApp = useNFTApp()

	return (
		<Loader fill={fill} {...props}>
			<Image src={isNFTApp ? NFTLogo : DefiLogo} width={72} alt="loading-icon" />
		</Loader>
	)
}

export default LocalLoader
