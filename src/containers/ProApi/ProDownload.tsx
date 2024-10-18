import { useEffect } from 'react'
import { WalletConfig } from '~/layout/WalletConfig'
import { useVerified } from '../ProContainer/hooks/useVerified'
import { IS_PRO_API_ENABLED } from './lib/constants'
import { useRouter } from 'next/router'

export const ProCSVDownload = ({ onClick, clicked }: { onClick: () => void; clicked: number }) => {
	return (
		<WalletConfig>
			<VerifyAndDownload onClick={onClick} clicked={clicked} />
		</WalletConfig>
	)
}

const VerifyAndDownload = ({ onClick, clicked }: { onClick: () => void; clicked: number }) => {
	const { isVerified } = useVerified()
	const router = useRouter()

	useEffect(() => {
		if (clicked) {
			if (!isVerified && IS_PRO_API_ENABLED) {
				router.push({ pathname: '/pro-api', query: { from: router.pathname } }, undefined, { shallow: true })
			} else {
				onClick()
			}
		}
	}, [clicked, isVerified])
	return <></>
}
