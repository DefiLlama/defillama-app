import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, type ReactNode, Suspense, useCallback, useReducer } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { TrialCsvLimitModal } from '~/components/TrialCsvLimitModal'
import { useAuthContext } from '~/containers/Subscription/auth'
import { setSignupSource } from '~/containers/Subscription/signupSource'
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
	free?: boolean
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
	trialCsvLimitOpen: boolean
}

type CSVDownloadButtonAction =
	| { type: 'setStaticLoading'; value: boolean }
	| { type: 'setShouldRenderModal'; value: boolean }
	| { type: 'setTrialCsvLimitOpen'; value: boolean }

const initialCSVDownloadButtonState: CSVDownloadButtonState = {
	staticLoading: false,
	shouldRenderModal: false,
	trialCsvLimitOpen: false
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
		case 'setTrialCsvLimitOpen':
			return { ...state, trialCsvLimitOpen: action.value }
		default:
			return state
	}
}

// use children to pass in the text
export function CSVDownloadButton(props: CSVDownloadButtonPropsUnion) {
	const { className, replaceClassName, smol, children, free } = props
	const [state, dispatch] = useReducer(csvDownloadButtonReducer, initialCSVDownloadButtonState)
	const { staticLoading, shouldRenderModal, trialCsvLimitOpen } = state
	const { isAuthenticated, loaders, hasActiveSubscription, isTrial } = useAuthContext()
	const isOnClickMode = hasOnClick(props)
	const onClickLoading = isOnClickMode ? props.isLoading : false
	const onClickHandler = isOnClickMode ? props.onClick : undefined
	const prepareCsv = hasPrepareCsv(props) ? props.prepareCsv : undefined
	const userLoading = !!loaders?.userLoading
	const isLoading = !!(userLoading || onClickLoading || staticLoading)
	const subscribeModalStore = Ariakit.useDialogStore({
		open: shouldRenderModal,
		setOpen: (value) => dispatch({ type: 'setShouldRenderModal', value })
	})
	const isClient = useIsClient()
	const router = useRouter()

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

	const handleButtonClick = useCallback(async () => {
		if (isLoading) return

		if (free) {
			await runDownload()
			return
		}

		if (isTrial) {
			dispatch({ type: 'setTrialCsvLimitOpen', value: true })
			return
		}

		if (!userLoading && isAuthenticated && hasActiveSubscription) {
			await runDownload()
			return
		}

		setSignupSource('csv')
		subscribeModalStore.show()
	}, [free, hasActiveSubscription, isAuthenticated, isLoading, isTrial, runDownload, subscribeModalStore, userLoading])

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
		</>
	)
}
