import { ReactNode, useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useIsClient } from '~/hooks'

export const CSVDownloadButton = ({
	onClick,
	customText = '',
	className,
	customClassName,
	smol,
	isLoading: loading
}: {
	onClick: () => void
	isLight?: boolean
	customText?: ReactNode
	className?: string
	customClassName?: string
	smol?: boolean
	isLoading?: boolean
}) => {
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { loaders } = useAuthContext()
	const isLoading = loaders.userLoading || isSubscriptionLoading || loading
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const isClient = useIsClient()
	const router = useRouter()

	return (
		<>
			<button
				className={customClassName || `flex items-center gap-1 justify-center py-2 px-2 whitespace-nowrap text-xs rounded-md text-(--link-text) bg-(--link-bg) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:opacity-50 disabled:cursor-not-allowed ${
					className ?? ''
				}`}
				onClick={() => {
					if (isLoading) return

					if (!loaders.userLoading && subscription?.status === 'active') {
						onClick()
					} else if (!isLoading) {
						setShowSubscribeModal(true)
					}
				}}
				disabled={isLoading}
			>
				{isClient && isLoading ? (
					<svg
						className="animate-spin mx-auto h-[14px] w-[14px"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				) : customText ? (
					<span>{customText}</span>
				) : (
					<>
						<Icon name="download-paper" className="h-3 w-3" />
						<span>{smol ? '' : 'Download'} .csv</span>
					</>
				)}
			</button>
			{isClient && (
				<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
					<SubscribePlusCard context="modal" returnUrl={router.asPath} />
				</SubscribeModal>
			)}
		</>
	)
}
