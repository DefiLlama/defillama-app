import { useEffect, useRef, useState } from 'react'
import { Hovercard, HovercardAnchor, useHovercardState } from 'ariakit/hovercard'
import styled from 'styled-components'
import { BasicLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { useResize } from '~/hooks'
import { chainIconUrl, tokenIconUrl } from '~/utils'

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
	z-index: 1;
	padding: 6px;
	background: ${({ theme }) => theme.bg2};
	border: 1px solid ${({ theme }) => theme.bg3};
	color: ${({ theme }) => theme.text1};
	border-radius: 8px;
	box-shadow: ${({ theme }) => theme.shadowMd};
`

const Link = styled(BasicLink)`
	border-radius: 50%;
	:focus-visible {
		outline-offset: 2px;
	}
`

export const ChainLogo = ({ chain, url, iconType }) => {
	return (
		<Link key={chain} href={url.includes('/yields?chain') ? `${url}=${chain}` : `${url}/${chain}`}>
			<TokenLogo address={chain} logo={iconType === 'token' ? tokenIconUrl(chain) : chainIconUrl(chain)} />
		</Link>
	)
}

interface IIconsRowProps {
	links: string[]
	url: string
	iconType: 'token' | 'chain'
}

const IconsRow = ({ links, url, iconType }: IIconsRowProps) => {
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

		setVisibileChainIndex(lastIndexOfFilters)
	}, [mainWrapWidth, links])

	const tooManyChainsIndex = visibleChainIndex < links.length ? visibleChainIndex - 1 : visibleChainIndex

	const visibleChains = links.slice(0, tooManyChainsIndex)
	const hoverChains = tooManyChainsIndex !== visibleChainIndex ? links.slice(tooManyChainsIndex, links.length) : []

	const hovercard = useHovercardState()

	return (
		<Row ref={mainWrapEl}>
			{visibleChains.map((chain) => (
				<ChainLogo key={chain} chain={chain} url={url} iconType={iconType} />
			))}
			{!!hoverChains.length && (
				<>
					<HovercardAnchor state={hovercard}>
						<TokenCounter>{`+${hoverChains.length}`}</TokenCounter>
					</HovercardAnchor>
					<Popover state={hovercard}>
						{
							<Row>
								{hoverChains.map((chain) => (
									<ChainLogo key={chain} chain={chain} url={url} iconType={iconType} />
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
