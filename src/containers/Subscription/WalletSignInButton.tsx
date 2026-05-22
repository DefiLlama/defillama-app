import type * as Ariakit from '@ariakit/react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useCallback, useEffect, useRef } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useAuthContext } from '~/containers/Subscription/auth'
import { WalletProvider } from '~/layout/WalletProvider'

export type WalletSignInButtonProps = {
	dialogStore: Ariakit.DialogStore
	setError: (error: string) => void
	autoStart?: boolean
}

export function WalletSignInButton(props: WalletSignInButtonProps) {
	return (
		<WalletProvider>
			<WalletSignInButtonInner {...props} />
		</WalletProvider>
	)
}

function WalletSignInButtonInner({ dialogStore, setError, autoStart = false }: WalletSignInButtonProps) {
	const startedRef = useRef(false)
	const { signInWithEthereumMutation } = useAuthContext()
	const { openConnectModal } = useConnectModal()
	const { address } = useAccount()
	const { signMessageAsync } = useSignMessage()

	const handleWalletSignIn = useCallback(async () => {
		setError('')
		if (address) {
			try {
				await signInWithEthereumMutation.mutateAsync({ address, signMessageFunction: signMessageAsync })
				dialogStore.hide()
			} catch {
				setError('Failed to sign in with wallet')
			}
			return
		}

		openConnectModal?.()
	}, [address, dialogStore, openConnectModal, setError, signInWithEthereumMutation, signMessageAsync])

	useEffect(() => {
		if (!autoStart || startedRef.current) return
		startedRef.current = true
		void handleWalletSignIn()
	}, [autoStart, handleWalletSignIn])

	return (
		<button
			type="button"
			className="text-(--link)"
			onClick={() => void handleWalletSignIn()}
			disabled={signInWithEthereumMutation.isPending}
		>
			{signInWithEthereumMutation.isPending ? 'Connecting...' : 'Sign-in here'}
		</button>
	)
}
