import * as Ariakit from '@ariakit/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { lazy, type ReactNode, Suspense, useCallback, useReducer } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { TrialCsvLimitModal } from '~/components/TrialCsvLimitModal'
import { AUTH_SERVER } from '~/constants'
import { ConfirmationModal } from '~/containers/ProDashboard/components/ConfirmationModal'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { setSignupSource } from '~/containers/Subscribtion/signupSource'
import { useIsClient } from '~/hooks/useIsClient'
import { slug } from '~/utils'
import { downloadCSV } from '~/utils/download'

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

function normalizeCsvFilename(filename: string): string {
	const trimmed = filename.trim()
	const baseName = trimmed.toLowerCase().endsWith('.csv') ? trimmed.slice(0, -4) : trimmed
	const normalizedBaseName = slug(baseName)
	return `${normalizedBaseName || 'data'}.csv`
}

interface CSVDownloadButtonState {
	staticLoading: boolean
	shouldRenderModal: boolean
	trialConfirmOpen: boolean
	trialCsvLimitOpen: boolean
	trialLoading: boolean
}

type CSVDownloadButtonAction =
	| { type: 'setStaticLoading'; value: boolean }
	| { type: 'setShouldRenderModal'; value: boolean }
	| { type: 'setTrialConfirmOpen'; value: boolean }
	| { type: 'setTrialCsvLimitOpen'; value: boolean }
	| { type: 'setTrialLoading'; value: boolean }

const initialCSVDownloadButtonState: CSVDownloadButtonState = {
	staticLoading: false,
	shouldRenderModal: false,
	trialConfirmOpen: false,
	trialCsvLimitOpen: false,
	trialLoading: false
}

function csvDownloadButtonReducer(
	state: CSVDownloadButtonState,
	action: CSVDownloadButtonAction
): CSVDownloadButtonState {
	switch (action.type) {
		case 'setStaticLoading':
			return { ...state, staticLoading: action.value }
		case 'setShouldRenderModal':
			return { ...state, shouldRenderModal: action.value }
		case 'setTrialConfirmOpen':
			return { ...state, trialConfirmOpen: action.value }
		case 'setTrialCsvLimitOpen':
			return { ...state, trialCsvLimitOpen: action.value }
		case 'setTrialLoading':
			return { ...state, trialLoading: action.value }
		default:
			return state
	}
}

// use children to pass in the text
export function CSVDownloadButton(props: CSVDownloadButtonPropsUnion) {
	const { className, replaceClassName, smol, children } = props
	const [state, dispatch] = useReducer(csvDownloadButtonReducer, initialCSVDownloadButtonState)
	const { staticLoading, shouldRenderModal, trialConfirmOpen, trialCsvLimitOpen, trialLoading } = state
	const { isAuthenticated, loaders, hasActiveSubscription, isTrial, user, authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()
	const isOnClickMode = hasOnClick(props)
	const onClickLoading = isOnClickMode ? props.isLoading : false
	const onClickHandler = isOnClickMode ? props.onClick : undefined
	const prepareCsv = hasPrepareCsv(props) ? props.prepareCsv : undefined
	const isLoading = !!(loaders.userLoading || onClickLoading || staticLoading || trialLoading)
	const subscribeModalStore = Ariakit.useDialogStore({
		open: shouldRenderModal,
		setOpen: (value) => dispatch({ type: 'setShouldRenderModal', value })
	})
	const isClient = useIsClient()
	const router = useRouter()
	const csvDownloadCount = typeof user?.flags?.csvDownload === 'number' ? user.flags.csvDownload : 0

	const runDownload = useCallback(
		async (forceLoading = false) => {
			const shouldSetLoading = forceLoading || !!prepareCsv
			if (shouldSetLoading) dispatch({ type: 'setStaticLoading', value: true })

			try {
				if (onClickHandler) {
					await Promise.resolve(onClickHandler())
					if (shouldSetLoading) dispatch({ type: 'setStaticLoading', value: false })
					return true
				}

				if (prepareCsv) {
					const { filename, rows } = prepareCsv()
					const normalizedFilename = normalizeCsvFilename(filename)

					downloadCSV(normalizedFilename, rows, { addTimestamp: false })
					if (shouldSetLoading) dispatch({ type: 'setStaticLoading', value: false })
					return true
				}

				toast.error('CSV download is not configured')
				if (shouldSetLoading) dispatch({ type: 'setStaticLoading', value: false })
				return false
			} catch (error) {
				if (prepareCsv) {
					toast.error('Failed to download CSV')
				}
				console.log(error)
				if (shouldSetLoading) dispatch({ type: 'setStaticLoading', value: false })
				return false
			}
		},
		[onClickHandler, prepareCsv]
	)

	const trackCsvDownloadMutation = useMutation({
		mutationFn: async () => {
			const response = await authorizedFetch(`${AUTH_SERVER}/user/track-csv-download`, { method: 'POST' })
			if (!response?.ok) {
				throw new Error('Failed to track CSV download')
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['auth', 'status'] })
		}
	})

	const { mutateAsync: trackCsvDownload } = trackCsvDownloadMutation

	const handleTrialConfirm = useCallback(async () => {
		dispatch({ type: 'setTrialLoading', value: true })
		await runDownload(true)
			.then(async (downloaded) => {
				if (!downloaded) return
				await trackCsvDownload().catch((error) => {
					toast.error('CSV downloaded, but failed to record usage. Please refresh the page.')
					console.log(error)
				})
			})
			.catch((error) => {
				toast.error('Failed to download CSV')
				console.log(error)
			})
			.finally(() => {
				dispatch({ type: 'setTrialLoading', value: false })
			})
	}, [runDownload, trackCsvDownload])

	const handleButtonClick = useCallback(async () => {
		if (isLoading) return

		if (isTrial) {
			if (csvDownloadCount >= 1) {
				dispatch({ type: 'setTrialCsvLimitOpen', value: true })
				return
			}
			dispatch({ type: 'setTrialConfirmOpen', value: true })
			return
		}

		if (!loaders.userLoading && isAuthenticated && hasActiveSubscription) {
			await runDownload()
			return
		}

		setSignupSource('csv')
		subscribeModalStore.show()
	}, [
		csvDownloadCount,
		hasActiveSubscription,
		isAuthenticated,
		isLoading,
		isTrial,
		loaders.userLoading,
		runDownload,
		subscribeModalStore
	])

	return (
		<>
			<button
				data-umami-event="export-csv"
				data-umami-event-page={router.pathname}
				className={
					replaceClassName
						? className
						: `flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) ${
								className ?? ''
							}`
				}
				onClick={() => {
					void handleButtonClick()
				}}
				disabled={isClient ? isLoading : true}
			>
				{!isLoading || !isClient ? (
					<Icon name="download-paper" className="h-3 w-3 shrink-0" />
				) : (
					<LoadingSpinner size={12} />
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
			{trialCsvLimitOpen ? (
				<TrialCsvLimitModal
					isOpen={trialCsvLimitOpen}
					onClose={() => dispatch({ type: 'setTrialCsvLimitOpen', value: false })}
				/>
			) : null}
			{trialConfirmOpen ? (
				<ConfirmationModal
					isOpen={trialConfirmOpen}
					onClose={() => dispatch({ type: 'setTrialConfirmOpen', value: false })}
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
