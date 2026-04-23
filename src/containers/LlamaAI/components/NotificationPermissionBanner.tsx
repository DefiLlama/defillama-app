import { useCallback, useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useLlamaAINotifyBannerDismissed } from '~/contexts/LocalStorage'
import { trackUmamiEvent } from '~/utils/analytics/umami'

type Permission = NotificationPermission | 'unsupported'

function readPermission(): Permission {
	if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported'
	return Notification.permission
}

export function NotificationPermissionBanner() {
	const [permission, setPermission] = useState<Permission>('unsupported')
	const [dismissed, markDismissed] = useLlamaAINotifyBannerDismissed()
	const [hydrated, setHydrated] = useState(false)
	const [isRequesting, setIsRequesting] = useState(false)

	useEffect(() => {
		setHydrated(true)
		setPermission(readPermission())
	}, [])

	const handleEnable = useCallback(() => {
		if (typeof Notification === 'undefined' || isRequesting) return
		trackUmamiEvent('llamaai-notify-banner-enable')
		setIsRequesting(true)
		// Some browsers throttle repeated requests and resolve to 'default' without showing a prompt
		// (Chrome quiet UI, users who previously dismissed the system prompt). Persist dismissal on any
		// non-granted result so we stop nagging a user the browser won't let us prompt again anyway.
		Notification.requestPermission()
			.then((next) => {
				setPermission(next)
				if (next !== 'granted') markDismissed()
			})
			.catch(() => {
				markDismissed()
			})
			.finally(() => {
				setIsRequesting(false)
			})
	}, [isRequesting, markDismissed])

	const handleDismiss = useCallback(() => {
		trackUmamiEvent('llamaai-notify-banner-dismiss')
		markDismissed()
	}, [markDismissed])

	if (!hydrated) return null
	if (permission !== 'default') return null
	if (dismissed) return null

	return (
		<div className="flex items-center gap-3 rounded-lg border border-[#e6e6e6] bg-(--cards-bg) px-3.5 py-2.5 dark:border-[#222324]">
			<p className="m-0 flex-1 truncate text-[13px] text-[#444] dark:text-[#ddd]">
				Want to be notified when LlamaAI responds?
			</p>
			<button
				type="button"
				onClick={handleEnable}
				disabled={isRequesting}
				className="shrink-0 rounded-md bg-black px-3 py-1 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-black"
			>
				Notify
			</button>
			<button
				type="button"
				onClick={handleDismiss}
				aria-label="Dismiss notification prompt"
				className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#999] transition-colors hover:bg-black/5 hover:text-[#333] dark:text-[#666] dark:hover:bg-white/5 dark:hover:text-white"
			>
				<Icon name="x" height={14} width={14} />
			</button>
		</div>
	)
}
