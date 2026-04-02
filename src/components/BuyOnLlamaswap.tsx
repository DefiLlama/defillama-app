import * as Ariakit from '@ariakit/react'
import type { BuyOnLlamaswapChain } from '~/api/types'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function buildSwapUrl(chain: Pick<BuyOnLlamaswapChain, 'chain' | 'address'>) {
	return `https://swap.defillama.com/?chain=${chain.chain}&from=${ZERO_ADDRESS}&to=${chain.address}&tab=swap&ref=defillama`
}

export function BuyOnLlamaswap({
	chains,
	showBestChainBadge = true
}: {
	chains?: BuyOnLlamaswapChain[] | null
	showBestChainBadge?: boolean
}) {
	if (!chains?.length) return null

	if (chains.length === 1) {
		return (
			<a
				target="_blank"
				rel="noreferrer noopener"
				href={buildSwapUrl(chains[0])}
				className="flex items-center gap-1 rounded-md bg-(--primary)/10 px-1.5 py-0.5 text-[10px] font-medium text-(--primary) hover:bg-(--primary)/20"
			>
				<span>Buy</span>
				<Icon name="external-link" className="h-2.5 w-2.5" />
			</a>
		)
	}

	return (
		<Ariakit.HovercardProvider showTimeout={0}>
			<Ariakit.HovercardAnchor
				render={<button />}
				className="flex items-center gap-1 rounded-md bg-(--primary)/10 px-1.5 py-0.5 text-[10px] font-medium text-(--primary) hover:bg-(--primary)/20"
			>
				<span>Buy</span>
				<Icon name="chevron-down" className="h-2.5 w-2.5" />
			</Ariakit.HovercardAnchor>
			<Ariakit.Hovercard
				unmountOnHide
				gutter={6}
				className="z-10 flex min-w-[180px] flex-col overflow-auto rounded-lg border border-[hsl(204,20%,88%)] bg-(--bg-main) shadow-lg dark:border-[hsl(204,3%,32%)]"
				portal
			>
				<span className="px-3 pt-2 pb-1 text-[10px] font-medium tracking-wide text-(--text-form) uppercase">
					Select chain
				</span>
				{chains.map((chain) => (
					<a
						key={chain.chain}
						href={buildSwapUrl(chain)}
						target="_blank"
						rel="noreferrer noopener"
						className="flex items-center gap-2.5 px-3 py-2 text-xs last-of-type:rounded-b-lg hover:bg-(--primary-hover)"
					>
						<TokenLogo name={chain.displayName} kind="chain" size={18} />
						<span className="capitalize">{chain.displayName}</span>
						{showBestChainBadge && chain === chains[0] ? (
							<span className="ml-auto rounded-full bg-(--primary)/10 px-1.5 py-0.5 text-[10px] text-(--primary)">
								Best
							</span>
						) : null}
					</a>
				))}
			</Ariakit.Hovercard>
		</Ariakit.HovercardProvider>
	)
}
