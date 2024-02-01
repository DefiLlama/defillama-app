import { useRef } from 'react'
import { Bookmark as BookmarkIcon } from 'react-feather'
import styled from 'styled-components'
import { useWatchlist } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { standardizeProtocolName } from '~/utils'

interface IWrapperProps {
	saved: boolean
}

const Wrapper = styled.button<IWrapperProps>`
	padding-inline: 0;

	svg {
		fill: ${({ theme: { text1 }, saved }) => (saved ? text1 : 'none')};
		path {
			stroke: ${({ theme: { text1 } }) => text1};
		}
	}
`

// readableProtocolName has proper caps and spaces
function Bookmark({ readableProtocolName, ...props }) {
	const bookmarkRef = useRef(null)
	const { savedProtocols, addProtocol, removeProtocol } = useWatchlist()
	// isClient for local storage
	const isClient = useIsClient()

	const portfolio = Object.keys(savedProtocols) || []

	const protocolName = standardizeProtocolName(readableProtocolName)

	const isSaved: boolean = portfolio?.includes(protocolName) && isClient

	const onClick = isSaved ? () => removeProtocol(readableProtocolName) : () => addProtocol(readableProtocolName)

	return (
		<Wrapper ref={bookmarkRef} onClick={onClick} saved={isSaved} {...props}>
			<BookmarkIcon width={16} height={16} />
		</Wrapper>
	)
}

export default Bookmark
