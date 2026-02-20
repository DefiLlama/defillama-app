import * as Ariakit from '@ariakit/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { lazy, type ReactNode, Suspense, useCallback, useReducer } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { AUTH_SERVER } from '~/constants'
import { ConfirmationModal } from '~/containers/ProDashboard/components/ConfirmationModal'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
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

interface TrialCsvLimitModalState {
	upgraded: boolean
}

type TrialCsvLimitModalAction = { type: 'setUpgraded'; value: boolean } | { type: 'reset' }

const initialTrialCsvLimitModalState: TrialCsvLimitModalState = {
	upgraded: false
}

function trialCsvLimitModalReducer(
	state: TrialCsvLimitModalState,
	action: TrialCsvLimitModalAction
): TrialCsvLimitModalState {
	switch (action.type) {
		case 'setUpgraded':
			return { upgraded: action.value }
		case 'reset':
			return initialTrialCsvLimitModalState
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
			const escapeCell = (value: string | number | boolean | null | undefined) => {
				if (value == null) return ''
				const str = String(value).replaceAll('\n', ' ').replaceAll('\r', ' ')
				if (str.includes(',') || str.includes('"')) {
					return `"${str.replace(/"/g, '""')}"`
				}
				return str
			}

			try {
				if (onClickHandler) {
					await Promise.resolve(onClickHandler())
					if (shouldSetLoading) dispatch({ type: 'setStaticLoading', value: false })
					return true
				}

				if (prepareCsv) {
					const { filename, rows } = prepareCsv()

					download(filename, rows.map((row) => row.map((cell) => escapeCell(cell)).join(',')).join('\n'))
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
			queryClient.invalidateQueries({ queryKey: ['currentUserAuthStatus'] })
		}
	})

	const { mutateAsync: trackCsvDownload } = trackCsvDownloadMutation

	const handleTrialConfirm = useCallback(async () => {
		dispatch({ type: 'setTrialLoading', value: true })
		try {
			const downloaded = await runDownload(true)
			if (downloaded) {
				await trackCsvDownload()
			}
		} catch (error) {
			toast.error('Failed to update CSV download status')
			console.log(error)
		} finally {
			dispatch({ type: 'setTrialLoading', value: false })
		}
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
				data-umami-event="csv-download"
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

function TrialCsvLimitModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
	const { endTrialSubscription, isEndTrialLoading } = useSubscribe()
	const [state, dispatch] = useReducer(trialCsvLimitModalReducer, initialTrialCsvLimitModalState)
	const { upgraded } = state

	const handleUpgrade = useCallback(async () => {
		try {
			await endTrialSubscription()
			dispatch({ type: 'setUpgraded', value: true })
		} catch (error) {
			console.error('Failed to upgrade:', error)
		}
	}, [endTrialSubscription])

	const handleClose = useCallback(() => {
		dispatch({ type: 'reset' })
		onClose()
	}, [onClose])

	return (
		<Ariakit.Dialog
			open={isOpen}
			onClose={handleClose}
			className="dialog flex max-h-[90dvh] max-w-md flex-col gap-4 overflow-y-auto rounded-xl border border-[#39393E] bg-[#1a1b1f] p-6 text-white shadow-2xl max-sm:drawer max-sm:rounded-b-none"
			portal
			unmountOnHide
		>
			<div className="flex items-center justify-between">
				<h3 className="text-xl font-bold">{upgraded ? 'Upgrade Successful' : 'Upgrade to Full Access'}</h3>
				<button
					onClick={handleClose}
					className="rounded-full p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E] hover:text-white"
				>
					<Icon name="x" height={18} width={18} />
				</button>
			</div>
			{upgraded ? (
				<>
					<div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
						<div className="flex items-start gap-3">
							<Icon name="check" height={20} width={20} className="mt-0.5 shrink-0 text-green-500" />
							<p className="text-sm text-[#c5c5c5]">
								Please wait a few minutes and refresh the page after upgrading, the upgrade might take a few minutes to
								apply.
							</p>
						</div>
					</div>
					<button
						onClick={handleClose}
						className="w-full rounded-lg bg-[#5C5CF9] px-4 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0]"
					>
						Close
					</button>
				</>
			) : (
				<>
					<div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
						<div className="flex items-start gap-3">
							<Icon name="alert-triangle" height={20} width={20} className="mt-0.5 shrink-0 text-yellow-500" />
							<div className="flex flex-col gap-2">
								<p className="font-semibold text-yellow-500">CSV download limit reached</p>
								<p className="text-sm text-[#c5c5c5]">
									Trial accounts are limited to 1 CSV download. To download more CSVs, upgrade to a full subscription
									($49/month).
								</p>
							</div>
						</div>
					</div>
					<div className="mt-2 flex flex-col gap-2">
						<p className="text-sm text-[#8a8c90]">Benefits of upgrading:</p>
						<ul className="flex flex-col gap-1 text-sm">
							<li className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="text-green-400" />
								<span>Unlimited CSV downloads</span>
							</li>
							<li className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="text-green-400" />
								<span>5 deep research questions per day (instead of 3)</span>
							</li>
							<li className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="text-green-400" />
								<span>All Pro features without limitations</span>
							</li>
						</ul>
					</div>
					<div className="mt-2 flex flex-col gap-3">
						<button
							onClick={handleUpgrade}
							disabled={isEndTrialLoading}
							className="w-full rounded-lg bg-[#5C5CF9] px-4 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0] disabled:cursor-not-allowed disabled:opacity-70"
						>
							{isEndTrialLoading ? 'Processing...' : 'Upgrade Now'}
						</button>
						<button
							onClick={onClose}
							disabled={isEndTrialLoading}
							className="w-full rounded-lg border border-[#39393E] px-4 py-2 text-[#8a8c90] transition-colors hover:bg-[#2a2b30] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
						>
							Close
						</button>
					</div>
				</>
			)}
		</Ariakit.Dialog>
	)
}
