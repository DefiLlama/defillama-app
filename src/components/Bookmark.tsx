import { useRouter } from 'next/router'
import { useRef } from 'react'
import { Icon } from '~/components/Icon'
import { useWatchlistManager } from '~/contexts/LocalStorage'

// readableProtocolName has proper caps and spaces
export function Bookmark({ readableProtocolName, ...props }) {
	const bookmarkRef = useRef(null)
	const router = useRouter()
	const { savedProtocols, addProtocol, removeProtocol } = useWatchlistManager(
		router.pathname.includes('/yields') ? 'yields' : 'defi'
	)

	const isSaved: boolean = savedProtocols.has(readableProtocolName)

	const onClick = isSaved ? () => removeProtocol(readableProtocolName) : () => addProtocol(readableProtocolName)

	return (
		<button
			ref={bookmarkRef}
			onClick={onClick}
			style={{ '--fill-icon': isSaved ? 'var(--text1)' : 'none' } as any}
			{...props}
			className="shrink-0 data-[lgonly=true]:hidden lg:data-[lgonly=true]:inline-block data-[bookmark=true]:absolute -left-[2px]"
		>
			<Icon name="bookmark" width={16} height={16} className="shrink-0" />
			<span className="sr-only">Bookmark</span>
		</button>
	)
}
