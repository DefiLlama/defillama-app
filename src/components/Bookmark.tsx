import { useRef } from 'react'
import { useWatchlist } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { slug } from '~/utils'
import { Icon } from '~/components/Icon'

// readableProtocolName has proper caps and spaces
export function Bookmark({ readableProtocolName, ...props }) {
	const bookmarkRef = useRef(null)
	const { savedProtocols, addProtocol, removeProtocol } = useWatchlist()
	// isClient for local storage
	const isClient = useIsClient()

	const portfolio = Object.keys(savedProtocols) || []

	const protocolName = slug(readableProtocolName)

	const isSaved: boolean = portfolio?.includes(protocolName) && isClient

	const onClick = isSaved ? () => removeProtocol(readableProtocolName) : () => addProtocol(readableProtocolName)

	return (
		<button
			ref={bookmarkRef}
			onClick={onClick}
			style={{ '--fill-icon': isSaved ? 'var(--text1)' : 'none' } as any}
			{...props}
			className="flex-shrink-0 data-[lgonly=true]:hidden lg:data-[lgonly=true]:inline-block data-[bookmark=true]:absolute -left-[2px]"
		>
			<Icon name="bookmark" width={16} height={16} className="flex-shrink-0" />
			<span className="sr-only">Bookmark</span>
		</button>
	)
}
