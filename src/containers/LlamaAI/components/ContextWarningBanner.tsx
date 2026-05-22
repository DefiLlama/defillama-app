import { Icon } from '~/components/Icon'
import type { ContextWarningPayload } from '~/containers/LlamaAI/fetchAgenticResponse'
import { trackUmamiEvent } from '~/utils/analytics/umami'

interface ContextWarningBannerProps {
	warning: ContextWarningPayload
	onStartNewChat: () => void
	onDismiss: () => void
}

export function ContextWarningBanner({ warning, onStartNewChat, onDismiss }: ContextWarningBannerProps) {
	const handleStartNewChat = () => {
		trackUmamiEvent('llamaai-context-warning-action', {
			action: 'start-new-chat',
			reason: warning.reason,
			kind: warning.kind
		})
		onStartNewChat()
	}

	const handleDismiss = () => {
		trackUmamiEvent('llamaai-context-warning-action', {
			action: 'dismiss',
			reason: warning.reason,
			kind: warning.kind
		})
		onDismiss()
	}

	return (
		<div
			role="status"
			className="flex items-center gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3.5 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10"
		>
			<Icon name="alert-triangle" height={16} width={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
			<p className="m-0 min-w-0 flex-1 text-[13px] text-amber-900 dark:text-amber-100">{warning.message}</p>
			<button
				type="button"
				onClick={handleStartNewChat}
				className="shrink-0 rounded-md bg-amber-600 px-3 py-1 text-[12px] font-medium text-white transition-opacity hover:opacity-90 dark:bg-amber-500 dark:text-black"
			>
				Start new chat
			</button>
			<button
				type="button"
				onClick={handleDismiss}
				aria-label="Dismiss long-thread warning"
				className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-amber-700/70 transition-colors hover:bg-amber-600/10 hover:text-amber-900 dark:text-amber-300/70 dark:hover:bg-amber-400/10 dark:hover:text-amber-100"
			>
				<Icon name="x" height={14} width={14} />
			</button>
		</div>
	)
}
