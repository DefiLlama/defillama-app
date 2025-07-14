import { useEffect, useMemo, useRef, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { useResize } from '~/hooks/useResize'
import { chainIconUrl, tokenIconUrl } from '~/utils'

const CHAIN_ICON_WIDTH = 24

interface IChainLogo {
	chain: string
	url: string
	iconType: string
	yieldRewardsSymbol: string
	disableLink?: boolean
}

export const ChainLogo = ({
	chain,
	url,
	iconType,
	yieldRewardsSymbol,
	disableLink: disableLinks = false
}: IChainLogo) => {
	const shallowRoute: boolean = url.includes('/yields?chain') || url.includes('/yields?project')

	if (yieldRewardsSymbol || disableLinks) {
		return (
			<Tooltip content={disableLinks ? chain : yieldRewardsSymbol}>
				<TokenLogo logo={iconType === 'token' ? tokenIconUrl(chain) : chainIconUrl(chain)} />
			</Tooltip>
		)
	} else {
		return (
			<Tooltip
				content={chain}
				render={
					<a
						key={chain}
						href={
							url.includes('/yields?chain')
								? `${url}=${chain}`
								: url.includes('/yields?project')
								? `${url}=${chain.toLowerCase().split(' ').join('-')}`
								: `${url}/${chain}`
						}
						target="_blank"
						rel="noopener noreferrer"
					/>
				}
			>
				<TokenLogo
					onClick={(e) => e.stopPropagation()}
					logo={iconType === 'token' ? tokenIconUrl(chain) : chainIconUrl(chain)}
				/>
			</Tooltip>
		)
	}
}

interface IIconsRowProps {
	links: string[]
	url: string
	iconType: 'token' | 'chain'
	yieldRewardsSymbols?: string[]
	disableLinks?: boolean
	urlPrefix?: string
}

const isChain = (chain) => {
	return ['ethereum', 'avalanche', 'optimism', 'near', 'metis', 'aurora'].includes(chain.toLowerCase())
}

// todo update links prop to {name: string, iconType: string}
export const IconsRow = ({
	links = [],
	url,
	iconType,
	yieldRewardsSymbols = [],
	disableLinks = false,
	urlPrefix = ''
}: IIconsRowProps) => {
	const [visibleChainIndex, setVisibileChainIndex] = useState(0)
	const mainWrapEl = useRef(null)
	const { width: mainWrapWidth } = useResize(mainWrapEl)

	useEffect(() => {
		let remainingWidth = (mainWrapWidth > 280 ? 280 : mainWrapWidth) - CHAIN_ICON_WIDTH
		let lastIndexOfFilters = 0

		links.forEach(() => {
			if (remainingWidth < 0) return
			remainingWidth -= CHAIN_ICON_WIDTH
			lastIndexOfFilters += 1
		})

		setVisibileChainIndex(links.length > 2 ? lastIndexOfFilters : links.length)
	}, [mainWrapWidth, links])

	const { visibleChains, hoverChains } = useMemo(() => {
		const tooManyChainsIndex = visibleChainIndex < links.length ? visibleChainIndex - 1 : visibleChainIndex

		const visibleChains = links.length > 2 ? links.slice(0, tooManyChainsIndex) : links

		const hoverChains = tooManyChainsIndex !== visibleChainIndex ? links.slice(tooManyChainsIndex, links.length) : []

		return { visibleChains, hoverChains }
	}, [links, visibleChainIndex])

	return (
		<div className="flex items-center justify-end bg-none overflow-hidden" ref={mainWrapEl}>
			{visibleChains.map((chain, i) => (
				<ChainLogo
					key={chain}
					chain={chain}
					url={url === '/yields?project' ? (isChain(chain) ? '/yields?chain' : url) : url + urlPrefix}
					iconType={isChain(chain) ? 'chain' : iconType}
					yieldRewardsSymbol={yieldRewardsSymbols[i]}
					disableLink={disableLinks}
				/>
			))}
			{!!hoverChains.length && links.length > 2 && (
				<Ariakit.HovercardProvider>
					<Ariakit.HovercardAnchor
						render={<button />}
						className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] text-(--text1) bg-(--bg3) shrink-0"
					>
						{`+${hoverChains.length}`}
					</Ariakit.HovercardAnchor>
					<Ariakit.Hovercard
						className="max-w-xl z-10 p-1 shadow-sm rounded-md bg-(--bg2) border border-(--bg3) text-(--text1) flex items-center justify-start flex-wrap gap-1 bg-none overflow-hidden"
						unmountOnHide
						portal
					>
						{hoverChains.map((chain, i) => (
							<ChainLogo
								key={chain}
								chain={chain}
								url={url}
								iconType={iconType}
								yieldRewardsSymbol={yieldRewardsSymbols[i]}
							/>
						))}
					</Ariakit.Hovercard>
				</Ariakit.HovercardProvider>
			)}
		</div>
	)
}
