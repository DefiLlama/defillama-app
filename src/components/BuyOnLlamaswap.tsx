import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import type { IProtocolLlamaswapChain } from '~/utils/metadata/types'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function buildSwapUrl(chain: Pick<IProtocolLlamaswapChain, 'chain' | 'address'>, placement: string) {
	const params = new URLSearchParams({
		chain: chain.chain,
		tab: 'swap',
		utm_source: 'defillama',
		utm_medium: 'buy_button',
		utm_content: placement
	})

	if (chain.address === ZERO_ADDRESS) {
		params.set('to', ZERO_ADDRESS)
	} else {
		params.set('from', ZERO_ADDRESS)
		params.set('to', chain.address)
	}

	return `https://swap.defillama.com/?${params.toString()}`
}

export function BuyOnLlamaswap({
	chains,
	placement = 'protocol_page',
	size = 'small'
}: {
	chains?: IProtocolLlamaswapChain[] | null
	placement?: string
	size?: 'small' | 'large'
}) {
	if (!chains?.length) return null
	const primaryChain = chains[0]

	if (chains.length === 1) {
		return (
			<a
				target="_blank"
				rel="noreferrer noopener"
				href={buildSwapUrl(primaryChain, placement)}
				className={
					size === 'small'
						? `flex items-center gap-1 rounded-md bg-(--primary)/10 px-1.5 py-0.5 text-[10px] font-medium text-(--primary) hover:bg-(--primary)/20`
						: `flex items-center gap-1 rounded-full border-2 border-(--old-blue) bg-(--old-blue) px-2 py-1 text-xs font-medium text-white hover:bg-(--old-blue)/80`
				}
			>
				{size === 'small' ? 'Buy' : 'Buy Now'}
				<Icon name="external-link" className={size === 'small' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
			</a>
		)
	}

	return (
		<Ariakit.HovercardProvider showTimeout={0}>
			<Ariakit.HovercardAnchor
				render={<button />}
				className={
					size === 'small'
						? `flex items-center gap-1 rounded-md bg-(--primary)/10 px-1.5 py-0.5 text-[10px] font-medium text-(--primary) hover:bg-(--primary)/20`
						: `flex items-center gap-1 rounded-full border-2 border-(--old-blue) bg-(--old-blue) px-2 py-1 text-xs font-medium text-white hover:bg-(--old-blue)/80`
				}
			>
				{size === 'small' ? 'Buy' : 'Buy Now'}
				<Icon name="chevron-down" className={size === 'small' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
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
						key={`${chain.chain}:${chain.address}`}
						href={buildSwapUrl(chain, placement)}
						target="_blank"
						rel="noreferrer noopener"
						className="flex items-center gap-2.5 px-3 py-2 text-xs last-of-type:rounded-b-lg hover:bg-(--primary-hover)"
					>
						<TokenLogo name={chain.displayName} kind="chain" size={18} />
						<span className="capitalize">{chain.displayName}</span>
						{chain.best ? (
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
