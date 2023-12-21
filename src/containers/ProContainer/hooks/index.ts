import { useEffect, useState } from 'react'
import { recoverMessageAddress } from 'viem'
import { useAccount, useSignMessage } from 'wagmi'

export const useLocalStorage = (key, initialValue) => {
	const [value, setValue] = useState(initialValue)

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const storedValue = localStorage.getItem(key)

			if (storedValue) {
				try {
					const parsedValue = JSON.parse(storedValue)
					setValue(parsedValue)
				} catch (error) {
					console.error('Error parsing JSON from local storage:', error)
					localStorage.setItem(key, JSON.stringify(initialValue))
				}
			} else {
				localStorage.setItem(key, JSON.stringify(initialValue))
			}
		}
	}, [key, initialValue])

	const updateValue = (newValue) => {
		if (typeof window !== 'undefined') {
			setValue(newValue)
			localStorage.setItem(key, JSON.stringify(newValue))
		}
	}

	return [value, updateValue]
}

export const useVerified = ({ verify } = { verify: () => null }) => {
	const { data: signMessageData, signMessage, variables } = useSignMessage()
	const wallet = useAccount()
	const [isVerified, setIsVerified] = useState(false)
	const [signature, setSignature] = useLocalStorage(`signature_${wallet?.address?.toLowerCase()}`, null) as [
		`0x${string}`,
		(value: string) => void
	]
	const message = `DefiLlama Pro Sign In. Confirming ownership of wallet: ${wallet.address?.toLowerCase()}. Please Sign this message to verify your ownership!`

	useEffect(() => {
		setIsVerified(false)
	}, [wallet.address])
	useEffect(() => {
		;(async () => {
			if (variables?.message && signMessageData) {
				const recoveredAddress = await recoverMessageAddress({
					message: variables?.message,
					signature: signMessageData
				})
				if (recoveredAddress === wallet.address) {
					setIsVerified(true)
					setSignature(signMessageData)
					verify()
				}
			} else if (signature) {
				const recoveredAddress = await recoverMessageAddress({
					message: message,
					signature: signature
				})
				if (recoveredAddress === wallet.address) {
					setIsVerified(true)
					verify()
				}
			}
		})()
	}, [signMessageData, variables?.message, isVerified, signature, wallet.address, setSignature, message, verify])

	return { isVerified, setIsVerified, signMessage, message }
}
