import { useRef } from 'react'
import { useWatchlist } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { standardizeProtocolName } from '~/utils'
import { Icon } from '~/components/Icon'

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
		<button
			ref={bookmarkRef}
			onClick={onClick}
			style={{ '--fill-icon': isSaved ? 'var(--text1)' : 'none' } as any}
			{...props}
		>
			<Icon name="bookmark" width={16} height={16} />
		</button>
	)
}

export default Bookmark
