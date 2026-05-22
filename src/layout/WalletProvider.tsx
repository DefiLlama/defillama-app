import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

type WalletProviderProps = {
	children: ReactNode
}

const WalletProviderClient = dynamic<WalletProviderProps>(
	() => import('./WalletProviderClient').then((mod) => mod.WalletProviderClient),
	{ ssr: false }
)

export const WalletProvider = ({ children }: WalletProviderProps) => {
	return <WalletProviderClient>{children}</WalletProviderClient>
}
