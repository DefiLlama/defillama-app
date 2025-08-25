import { ReactNode, useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useIsClient } from '~/hooks'
import { useSubscribe } from '~/hooks/useSubscribe'

// use children to pass in the text
export const CSVDownloadButton = ({
	onClick,
	children,
	className,
	replaceClassName,
	smol,
	isLoading: loading
}: {
	onClick: () => void
	className?: string
	replaceClassName?: boolean
	smol?: boolean
	isLoading?: boolean
	children?: ReactNode
}) => {
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { loaders } = useAuthContext()
	const isLoading = loaders.userLoading || isSubscriptionLoading || loading ? true : false
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const isClient = useIsClient()
	const router = useRouter()

	return (
		<>
			<button
				className={
					replaceClassName
						? `relative data-[loading=true]:cursor-wait ${className}`
						: `relative flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-[6px] text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[loading=true]:cursor-wait ${
								className ?? ''
							}`
				}
				onClick={() => {
					if (isLoading) return

					if (!loaders.userLoading && subscription?.status === 'active') {
						onClick()
					} else if (!isLoading) {
						setShowSubscribeModal(true)
					}
				}}
				data-loading={isClient ? isLoading : true}
				disabled={isClient ? isLoading : true}
			>
				<Icon name="download-paper" className="h-3 w-3 shrink-0" />
				{children || (
					<span className="overflow-hidden text-ellipsis whitespace-nowrap">{smol ? '.csv' : 'Download .csv'}</span>
				)}
				{loading ? (
					<span className="absolute top-0 right-0 bottom-0 left-0 z-10 flex items-center justify-center">
						<svg
							className="h-[14px] w-[14px] shrink-0 animate-spin"
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
					</span>
				) : null}
			</button>
			{isClient && (
				<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
					<SubscribePlusCard context="modal" returnUrl={router.asPath} />
				</SubscribeModal>
			)}
		</>
	)
}
