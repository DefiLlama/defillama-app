import { useWatchlistManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'
import { useRouter } from 'next/router'

// readableName has proper caps and spaces
export function Bookmark({ readableName, ...props }) {
	const router = useRouter()
	const { savedProtocols, addProtocol, removeProtocol } = useWatchlistManager(
		router.pathname.includes('/yields') ? 'yields' : 'defi'
	)

	const isSaved: boolean = savedProtocols.has(readableName)

	const onClick = isSaved ? () => removeProtocol(readableName) : () => addProtocol(readableName)

	return (
		<button
			onClick={onClick}
			style={{ '--fill-icon': isSaved ? 'var(--text-primary)' : 'none' } as any}
			{...props}
			className="shrink-0 data-[lgonly=true]:hidden lg:data-[lgonly=true]:inline-block data-[bookmark=true]:absolute -left-[2px]"
		>
			<Icon name="bookmark" width={16} height={16} className="shrink-0" />
			<span className="sr-only">Bookmark</span>
		</button>
	)
}
