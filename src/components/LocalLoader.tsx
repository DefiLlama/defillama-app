import * as React from 'react'
import Image from 'next/image'
import DefiLogo from '~/assets/logo_white.png'

export const LocalLoader = () => {
	return <Image src={DefiLogo} width={72} alt="loading-icon" className="animate-loader" />
}
