import { useRef } from 'react'
import styled from 'styled-components'
import { useWatchlist } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { standardizeProtocolName } from '~/utils'
import { Icon } from '~/components/Icon'

interface IWrapperProps {
	saved: boolean
}

const Wrapper = styled.button<IWrapperProps>`
	padding-inline: 0;
	--fill-icon: ${({ theme: { text1 }, saved }) => (saved ? text1 : 'none')};
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
			<Icon name="bookmark" width={16} height={16} />
		</Wrapper>
	)
}

export default Bookmark
