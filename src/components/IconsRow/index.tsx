import { useEffect, useRef, useState } from 'react'
import { Hovercard, HovercardAnchor, useHovercardState } from 'ariakit/hovercard'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { useResize } from '~/hooks/useResize'
import { chainIconUrl, tokenIconUrl } from '~/utils'
import Link from 'next/link'

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
			<Tooltip content={chain}>
				<Link
					key={chain}
					href={
						url.includes('/yields?chain')
							? `${url}=${chain}`
							: url.includes('/yields?project')
							? `${url}=${chain.toLowerCase().split(' ').join('-')}`
							: `${url}/${chain}`
					}
					shallow={shallowRoute}
					passHref
					prefetch={false}
				>
					<a>
						<TokenLogo
							onClick={(e) => e.stopPropagation()}
							logo={iconType === 'token' ? tokenIconUrl(chain) : chainIconUrl(chain)}
						/>
					</a>
				</Link>
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

	const tooManyChainsIndex = visibleChainIndex < links.length ? visibleChainIndex - 1 : visibleChainIndex

	const visibleChains = links.length > 2 ? links.slice(0, tooManyChainsIndex) : links

	const hoverChains = tooManyChainsIndex !== visibleChainIndex ? links.slice(tooManyChainsIndex, links.length) : []

	const hovercard = useHovercardState()

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
				<>
					<HovercardAnchor
						as="button"
						className="h-6 w-6 rounded-full flex items-center justify-center text-[var(--text1)] bg-[var(--bg3)]"
						state={hovercard}
					>
						{`+${hoverChains.length}`}
					</HovercardAnchor>
					<Hovercard
						state={hovercard}
						className="max-w-xl z-10 p-1 shadow rounded-md bg-[var(--bg2)] border border-[var(--bg3)] text-[var(--text1)]"
					>
						<div className="flex items-center justify-start flex-wrap gap-1 bg-none overflow-hidden">
							{hoverChains.map((chain, i) => (
								<ChainLogo
									key={chain}
									chain={chain}
									url={url}
									iconType={iconType}
									yieldRewardsSymbol={yieldRewardsSymbols[i]}
								/>
							))}
						</div>
					</Hovercard>
				</>
			)}
		</div>
	)
}
