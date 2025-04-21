import * as React from 'react'
import Image from 'next/future/image'
import { useNFTApp } from '~/hooks'
import DefiLogo from '~/assets/logo_white.png'
import NFTLogo from '~/assets/nft_logo_white.png'

export const LocalLoader = () => {
	const isNFTApp = useNFTApp()

	return <Image src={isNFTApp ? NFTLogo : DefiLogo} width={72} alt="loading-icon" className="animate-loader" />
}
