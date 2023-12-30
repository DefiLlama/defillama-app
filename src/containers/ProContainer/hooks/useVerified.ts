import { utils } from 'ethers'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useLocalStorage } from '~/hooks/useLocalStorage'

export const useVerified = ({ verify } = { verify: () => null }) => {
	const { data: signMessageData, signMessage, variables } = useSignMessage()
	const wallet = useAccount()
	const [isVerified, setIsVerified] = useState(false)
	const [signature, setSignature] = useLocalStorage(`signature_${wallet?.address?.toLowerCase()}`, null) as [
		`0x${string}`,
		(value: string) => void
	]
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
					setSignature(signMessageData)
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
	}, [signMessageData, variables?.message, isVerified, signature, wallet.address, setSignature, message, verify])

	useEffect(() => {
		if (isVerified && router.query.from) {
			router.push(router.query.from as string)
		}
	}, [isVerified, router])

	return { isVerified, setIsVerified, signMessage, message }
}
