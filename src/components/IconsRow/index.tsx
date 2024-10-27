import { useEffect, useRef, useState } from 'react'
import { Hovercard, HovercardAnchor, useHovercardState } from 'ariakit/hovercard'
import styled from 'styled-components'
import TokenLogo from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { useResize } from '~/hooks/useResize'
import { chainIconUrl, tokenIconUrl } from '~/utils'
import Link from 'next/link'

const CHAIN_ICON_WIDTH = 24

const TokenCounter = styled.button`
	width: ${CHAIN_ICON_WIDTH}px;
	height: ${CHAIN_ICON_WIDTH}px;
	border-radius: 50%;
	background: ${({ theme }) => theme.bg3};
	color: ${({ theme }) => theme.text1};
	display: flex;
	align-items: center;
	justify-content: center;

	:focus-visible {
		outline-offset: 2px;
	}
`

const Row = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	background: none;
	overflow: hidden;
`

const Popover = styled(Hovercard)`
	max-width: 600px;
	z-index: 10;
	padding: 6px;
	background: ${({ theme }) => theme.bg2};
	border: 1px solid ${({ theme }) => theme.bg3};
	color: ${({ theme }) => theme.text1};
	border-radius: 8px;
	box-shadow: ${({ theme }) => theme.shadowMd};

	& > * {
		justify-content: flex-start;
		flex-wrap: wrap;

		& > * {
			flex-shrink: 0;
		}
	}
`

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
				<TokenLogo address={chain} logo={iconType === 'token' ? tokenIconUrl(chain) : chainIconUrl(chain)} />
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
							address={chain}
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
const IconsRow = ({
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
		<Row ref={mainWrapEl}>
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
					<HovercardAnchor as={TokenCounter} state={hovercard}>
						{`+${hoverChains.length}`}
					</HovercardAnchor>
					<Popover state={hovercard}>
						{
							<Row>
								{hoverChains.map((chain, i) => (
									<ChainLogo
										key={chain}
										chain={chain}
										url={url}
										iconType={iconType}
										yieldRewardsSymbol={yieldRewardsSymbols[i]}
									/>
								))}
							</Row>
						}
					</Popover>
				</>
			)}
		</Row>
	)
}
export default IconsRow
