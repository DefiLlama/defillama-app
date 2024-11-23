import { utils } from 'ethers'
import { useRouter } from 'next/router'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

function subscribe(callback: () => void) {
	window.addEventListener('storage', callback)

	return () => {
		window.removeEventListener('storage', callback)
	}
}

export const useVerified = ({ verify } = { verify: () => null }) => {
	const { data: signMessageData, signMessage, variables } = useSignMessage()
	const wallet = useAccount()
	const [isVerified, setIsVerified] = useState(false)

	const sig = useSyncExternalStore(
		subscribe,
		() => localStorage.getItem(`signature_${wallet?.address?.toLowerCase()}`) ?? null,
		() => null
	)

	const signature = JSON.parse(sig)

	const message = `DefiLlama Pro Sign In. Confirming ownership of wallet: ${wallet.address?.toLowerCase()}. Please Sign this message to verify your ownership!`
	const router = useRouter()
	useEffect(() => {
		setIsVerified(false)
	}, [wallet.address])
	useEffect(() => {
		;(async () => {
			if (variables?.message && signMessageData) {
				const recoveredAddress = utils.verifyMessage(variables?.message, signMessageData)

				if (recoveredAddress === wallet.address) {
					setIsVerified(true)
					localStorage.setItem(`signature_${wallet?.address?.toLowerCase()}`, JSON.stringify(signMessageData))
					window.dispatchEvent(new Event('storage'))
					verify()
				}
			} else if (signature) {
				const recoveredAddress = utils.verifyMessage(message, signature)

				if (recoveredAddress === wallet.address) {
					setIsVerified(true)
					verify()
				}
			}
		})()
	}, [signMessageData, variables?.message, isVerified, signature, wallet.address, message, verify])

	useEffect(() => {
		if (isVerified && router.query.from) {
			router.push(router.query.from as string)
		}
	}, [isVerified, router])

	return { isVerified, setIsVerified, signMessage, message }
}
