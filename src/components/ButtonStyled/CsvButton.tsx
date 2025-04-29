import { ReactNode, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Icon } from '~/components/Icon'
import { useSubscribe } from '~/hooks/useSubscribe'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'

const ProCSVDownload = dynamic(() => import('~/containers/ProApi/ProDownload').then((comp) => comp.ProCSVDownload), {
	ssr: false
}) as React.FC<{ onClick: () => void; clicked: number }>

export const CSVDownloadButton = ({
	onClick,
	customText = '',
	className,
	smol
}: {
	onClick: () => void
	isLight?: boolean
	customText?: ReactNode
	className?: string
	smol?: boolean
}) => {
	const { subscription } = useSubscribe()
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const [isClient, setIsClient] = useState(false)

	useEffect(() => {
		setIsClient(true)
	}, [])

	return (
		<>
			<button
				className={`flex items-center gap-1 justify-center py-2 px-2 whitespace-nowrap text-xs rounded-md text-[var(--link-text)] bg-[var(--link-bg)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] ${
					className ?? ''
				}`}
				onClick={() => {
					if (subscription?.status === 'active') {
						onClick()
					} else {
						setShowSubscribeModal(true)
					}
				}}
			>
				{customText ? (
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
					<SubscribePlusCard context="modal" />
				</SubscribeModal>
			)}
		</>
	)
}
