import * as Ariakit from '@ariakit/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { lazy, ReactNode, Suspense, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { AUTH_SERVER } from '~/constants'
import { ConfirmationModal } from '~/containers/ProDashboard/components/ConfirmationModal'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useIsClient } from '~/hooks/useIsClient'
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

const hasPrepareCsv = (props: CSVDownloadButtonPropsUnion): props is CSVDownloadButtonWithPrepareCsv =>
	'prepareCsv' in props

const hasOnClick = (props: CSVDownloadButtonPropsUnion): props is CSVDownloadButtonWithOnClick => 'onClick' in props

// use children to pass in the text
export function CSVDownloadButton(props: CSVDownloadButtonPropsUnion) {
	const { className, replaceClassName, smol, children } = props
	const [staticLoading, setStaticLoading] = useState(false)
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const [trialConfirmOpen, setTrialConfirmOpen] = useState(false)
	const [trialLoading, setTrialLoading] = useState(false)
	const { isAuthenticated, loaders, hasActiveSubscription, isTrial, user, authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()
	const isLoading = !!(
		loaders.userLoading ||
		(hasOnClick(props) ? props.isLoading : undefined) ||
		staticLoading ||
		trialLoading
	)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })
	const isClient = useIsClient()
	const router = useRouter()
	const csvDownloadCount = typeof user?.flags?.csvDownload === 'number' ? user.flags.csvDownload : 0

	const runDownload = async (forceLoading = false) => {
		const shouldSetLoading = forceLoading || hasPrepareCsv(props)
		if (shouldSetLoading) setStaticLoading(true)
		try {
			if (hasOnClick(props)) {
				await Promise.resolve(props.onClick())
				return true
			}

			if (hasPrepareCsv(props)) {
				const { filename, rows } = props.prepareCsv()

				const escapeCell = (value: string | number | boolean | null | undefined) => {
					if (value == null) return ''
					const str = String(value).replaceAll('\n', ' ').replaceAll('\r', ' ')
					if (str.includes(',') || str.includes('"')) {
						return `"${str.replace(/"/g, '""')}"`
					}
					return str
				}

				download(filename, rows.map((row) => row.map((cell) => escapeCell(cell)).join(',')).join('\n'))
				return true
			}

			toast.error('CSV download is not configured')
			return false
		} catch (error) {
			if (hasPrepareCsv(props)) {
				toast.error('Failed to download CSV')
			}
			console.log(error)
			return false
		} finally {
			if (shouldSetLoading) setStaticLoading(false)
		}
	}

	const trackCsvDownload = async () => {
		const response = await authorizedFetch(`${AUTH_SERVER}/user/track-csv-download`, { method: 'POST' })
		if (!response?.ok) {
			throw new Error('Failed to track CSV download')
		}
		await queryClient.invalidateQueries({ queryKey: ['currentUserAuthStatus'] })
	}

	const handleTrialConfirm = async () => {
		setTrialLoading(true)
		try {
			const downloaded = await runDownload(true)
			if (!downloaded) return
			await trackCsvDownload()
		} catch (error) {
			toast.error('Failed to update CSV download status')
			console.log(error)
		} finally {
			setTrialLoading(false)
		}
	}

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

					if (isTrial) {
						if (csvDownloadCount >= 1) {
							toast.error('CSV downloads are not available during the trial period')
							return
						}
						setTrialConfirmOpen(true)
						return
					}

					if (!loaders.userLoading && isAuthenticated && hasActiveSubscription) {
						await runDownload()
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
			{shouldRenderModal ? (
				<Suspense fallback={<></>}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
			) : null}
			{trialConfirmOpen ? (
				<ConfirmationModal
					isOpen={trialConfirmOpen}
					onClose={() => setTrialConfirmOpen(false)}
					onConfirm={() => {
						void handleTrialConfirm()
					}}
					title="Trial CSV download"
					message="Trial accounts get 1 CSV download. Do you want to use it now?"
					confirmText="Download"
					cancelText="Cancel"
					confirmButtonClass="bg-(--primary) hover:opacity-90 text-white"
				/>
			) : null}
		</>
	)
}
