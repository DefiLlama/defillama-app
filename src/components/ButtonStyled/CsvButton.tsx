import { lazy, memo, ReactNode, Suspense, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useIsClient } from '~/hooks'
import { useSubscribe } from '~/hooks/useSubscribe'
import { download } from '~/utils'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

interface CSVDownloadButtonProps {
	// Common props
	className?: string
	replaceClassName?: boolean
	smol?: boolean
	children?: ReactNode
}

// Option 1: With prepareCsv
interface CSVDownloadButtonWithPrepareCsv extends CSVDownloadButtonProps {
	prepareCsv: () => { filename: string; rows: Array<Array<string | number | boolean>> }
	onClick?: never
	isLoading?: never
}

// Option 2: With onClick and isLoading
interface CSVDownloadButtonWithOnClick extends CSVDownloadButtonProps {
	onClick: () => void
	isLoading: boolean
	prepareCsv?: never
}

// Union type
type CSVDownloadButtonPropsUnion = CSVDownloadButtonWithPrepareCsv | CSVDownloadButtonWithOnClick

// use children to pass in the text
export const CSVDownloadButton = memo(function CSVDownloadButton({
	className,
	replaceClassName,
	smol,
	children,
	onClick,
	isLoading: loading,
	prepareCsv
}: CSVDownloadButtonPropsUnion) {
	const [staticLoading, setStaticLoading] = useState(false)
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { loaders } = useAuthContext()
	const isLoading = loaders.userLoading || isSubscriptionLoading || loading || staticLoading ? true : false
	const subscribeModalStore = Ariakit.useDialogStore()
	const isClient = useIsClient()
	const router = useRouter()

	return (
		<>
			<button
				data-umami-event="csv-download"
				data-umami-event-page={router.pathname}
				className={
					replaceClassName
						? className
						: `flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) ${
								className ?? ''
							}`
				}
				onClick={async () => {
					if (isLoading) return

					if (!loaders.userLoading && subscription?.status === 'active') {
						if (onClick) {
							onClick()
						} else {
							try {
								setStaticLoading(true)
								const { filename, rows } = prepareCsv()

								const escapeCell = (value: string | number | boolean | null | undefined) => {
									if (value == null) return ''
									const str = String(value).replaceAll('\n', ' ').replaceAll('\r', ' ')
									if (str.includes(',') || str.includes('"')) {
										return `"${str.replace(/"/g, '""')}"`
									}
									return str
								}

								download(filename, rows.map((row) => row.map((cell) => escapeCell(cell)).join(',')).join('\n'))
							} catch (error) {
								toast.error('Failed to download CSV')
								console.log(error)
							} finally {
								setStaticLoading(false)
							}
						}
					} else if (!isLoading) {
						subscribeModalStore.show()
					}
				}}
				disabled={isClient ? isLoading : true}
			>
				{isLoading || !isClient ? (
					<LoadingSpinner size={12} />
				) : (
					<Icon name="download-paper" className="h-3 w-3 shrink-0" />
				)}
				{children || (
					<span className="overflow-hidden text-ellipsis whitespace-nowrap">{smol ? '.csv' : 'Download .csv'}</span>
				)}
			</button>
			<Suspense fallback={<></>}>
				<SubscribeProModal dialogStore={subscribeModalStore} />
			</Suspense>
		</>
	)
})
