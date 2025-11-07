import Link from 'next/link'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { useBookmarks } from '~/hooks/useBookmarks'

interface IBookmarkProps {
	readableName: string
	configID?: string
	isChain?: boolean
	[key: string]: any
}

export function Bookmark({ readableName, configID, isChain, ...props }: IBookmarkProps) {
	const router = useRouter()

	const isYieldsPage = router.pathname.includes('/yields')
	const urlPath = isYieldsPage ? '/yields/watchlist' : '/watchlist'

	const watchlistType = isChain ? 'chains' : isYieldsPage ? 'yields' : 'defi'
	const watchlistNameKey = isYieldsPage ? configID : readableName

	const { savedProtocols, addProtocol, removeProtocol } = useBookmarks(watchlistType)

	const isSaved: boolean = savedProtocols.has(watchlistNameKey)

	const showToast = (action: 'Added' | 'Removed') => {
		toast.success(
			<span>
				{action} {readableName} {action === 'Added' ? 'to' : 'from'}{' '}
				<Link href={urlPath} className="font-medium underline">
					watchlist
				</Link>
			</span>
		)
	}

	const onClick = isSaved
		? () => {
				removeProtocol(watchlistNameKey)
				showToast('Removed')
			}
		: () => {
				addProtocol(watchlistNameKey)
				showToast('Added')
			}

	return (
		<button
			onClick={onClick}
			style={{ '--fill-icon': isSaved ? 'var(--text-primary)' : 'none' } as any}
			{...props}
			className="-left-0.5 shrink-0 data-[bookmark=true]:absolute data-[lgonly=true]:hidden lg:data-[lgonly=true]:inline-block"
		>
			<Icon name="bookmark" width={16} height={16} className="shrink-0" />
			<span className="sr-only">Bookmark</span>
		</button>
	)
}
