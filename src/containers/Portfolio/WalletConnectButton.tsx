import { Icon } from '~/components/Icon'
import { usePortfolio } from '~/containers/Portfolio/PortfolioContext'
import { useIsClient } from '~/hooks/useIsClient'

export function WalletConnectButton({ asPath: _asPath }: { asPath: string }) {
	const { isConnected, connectedAddress, connectWallet, disconnectWallet, storedAddress } = usePortfolio()
	const isClient = useIsClient()

	if (!isClient) {
		return null
	}

	const displayAddress = connectedAddress ?? storedAddress
	const shortAddress = displayAddress ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}` : null

	if (isConnected || storedAddress) {
		return (
			<button
				onClick={disconnectWallet}
				className="flex w-full items-center gap-3 rounded-lg p-1 hover:bg-white/5"
				title="Disconnect wallet"
			>
				<div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
					<Icon name="wallet" className="h-4 w-4" />
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-xs leading-4 font-medium text-(--text1)">Portfolio</span>
					<span className="truncate text-[10px] leading-[14px] font-medium text-(--text3)">{shortAddress}</span>
				</div>
				<Icon name="chevron-right" className="h-5 w-5 shrink-0 text-(--text3)" />
			</button>
		)
	}

	return (
		<button
			onClick={connectWallet}
			className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 p-1.5 text-sm font-medium text-white hover:bg-blue-700"
		>
			<Icon name="wallet" className="h-4 w-4" />
			<span>Connect Wallet</span>
		</button>
	)
}
