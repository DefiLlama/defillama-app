import { useConnectModal } from '@rainbow-me/rainbowkit'
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useAccount, useDisconnect } from 'wagmi'

interface PortfolioContextType {
	connectedAddress: string | undefined
	isConnected: boolean
	isConnecting: boolean
	connectWallet: () => void
	disconnectWallet: () => void
	storeWalletAddress: (address: string) => void
	storedAddress: string | null
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined)

const STORAGE_KEY = 'portfolio-wallet-address'

export function PortfolioProvider({ children }: { children: ReactNode }) {
	const [storedAddress, setStoredAddress] = useState<string | null>(null)
	const { address: walletAddress, isConnected, isConnecting } = useAccount()
	const { disconnect } = useDisconnect()
	const { openConnectModal } = useConnectModal()

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem(STORAGE_KEY)
			if (saved) setStoredAddress(saved)
		}
	}, [])

	const connectWallet = useCallback(() => {
		openConnectModal?.()
	}, [openConnectModal])

	const disconnectWallet = useCallback(() => {
		disconnect()
		localStorage.removeItem(STORAGE_KEY)
		setStoredAddress(null)
	}, [disconnect])

	const storeWalletAddress = useCallback((addr: string) => {
		localStorage.setItem(STORAGE_KEY, addr)
		setStoredAddress(addr)
	}, [])

	useEffect(() => {
		if (walletAddress) {
			storeWalletAddress(walletAddress)
		}
	}, [walletAddress, storeWalletAddress])

	return (
		<PortfolioContext.Provider
			value={{
				connectedAddress: walletAddress,
				isConnected: isConnected && !!walletAddress,
				isConnecting,
				connectWallet,
				disconnectWallet,
				storeWalletAddress,
				storedAddress
			}}
		>
			{children}
		</PortfolioContext.Provider>
	)
}

export function usePortfolio() {
	const context = useContext(PortfolioContext)
	if (!context) {
		throw new Error('usePortfolio must be used within a PortfolioProvider')
	}
	return context
}
