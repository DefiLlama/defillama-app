import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { useWatchlistManager } from '~/contexts/LocalStorage'

interface IBookmarkProps {
	readableName: string
	isChain?: boolean
	[key: string]: any
}

export function Bookmark({ readableName, isChain, ...props }: IBookmarkProps) {
	const router = useRouter()

	const watchlistType = isChain ? 'chains' : router.pathname.includes('/yields') ? 'yields' : 'defi'

	const { savedProtocols, addProtocol, removeProtocol } = useWatchlistManager(watchlistType)

	const isSaved: boolean = savedProtocols.has(readableName)

	const onClick = isSaved ? () => removeProtocol(readableName) : () => addProtocol(readableName)

	return (
		<button
			onClick={onClick}
			style={{ '--fill-icon': isSaved ? 'var(--text-primary)' : 'none' } as any}
			{...props}
			className="-left-[2px] shrink-0 data-[bookmark=true]:absolute data-[lgonly=true]:hidden lg:data-[lgonly=true]:inline-block"
		>
			<Icon name="bookmark" width={16} height={16} className="shrink-0" />
			<span className="sr-only">Bookmark</span>
		</button>
	)
}
