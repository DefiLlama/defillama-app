import dynamic from 'next/dynamic'

export const LazyWalletProvider = dynamic(
	() => import('./WalletProvider').then((m) => ({ default: m.WalletProvider })),
	{ ssr: true }
)
