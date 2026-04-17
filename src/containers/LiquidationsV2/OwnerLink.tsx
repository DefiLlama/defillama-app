import * as React from 'react'
import type { BlockExplorersResponse } from '~/api/types'
import { Icon } from '~/components/Icon'
import { getBlockExplorerNew } from '~/utils/blockExplorers'
import type { LiquidationPosition } from './api.types'

const LiquidationsExplorerContext = React.createContext<BlockExplorersResponse>([])

function shorten(value: string): string {
	if (value.length <= 18) return value
	return `${value.slice(0, 8)}...${value.slice(-6)}`
}

export function LiquidationsExplorerProvider({
	blockExplorers,
	children
}: {
	blockExplorers: BlockExplorersResponse
	children: React.ReactNode
}) {
	return <LiquidationsExplorerContext.Provider value={blockExplorers}>{children}</LiquidationsExplorerContext.Provider>
}

export function LiquidationsOwnerLink({ position }: { position: LiquidationPosition }) {
	const blockExplorers = React.useContext(LiquidationsExplorerContext)
	const derivedExplorer = React.useMemo(
		() =>
			getBlockExplorerNew({
				apiResponse: blockExplorers,
				address: position.owner,
				chainId: position.chainId,
				chainName: position.chainName,
				urlType: 'address'
			}),
		[blockExplorers, position.chainId, position.chainName, position.owner]
	)
	const ownerUrl = position.ownerUrlOverride ?? derivedExplorer?.url ?? null
	const label = shorten(position.ownerName)

	if (!ownerUrl) {
		return <span>{label}</span>
	}

	return (
		<a href={ownerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
			<span>{label}</span>
			<Icon name="external-link" height={12} width={12} />
		</a>
	)
}
