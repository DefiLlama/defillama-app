import Image from 'next/image'
import DefiLogo from '~/assets/logo_white.png'
import NFTLogo from '~/assets/nft_logo_white.png'
import { useNFTApp } from '~/hooks'

export const LocalLoader = () => {
	const isNFTApp = useNFTApp()

	return <Image src={isNFTApp ? NFTLogo : DefiLogo} width={72} alt="loading-icon" className="animate-loader" />
}
