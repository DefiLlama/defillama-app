import * as React from 'react'
import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { subscribeToLocalStorage } from '~/contexts/LocalStorage'

// change 'value' for new announcements
export const ANNOUNCEMENT = {
	defi: {
		key: 'defi-flag-announcement',
		value: 'defi5'
	},
	yields: {
		key: 'yield-flag-announcement',
		value: 'yield3'
	},
	dexs: {
		key: 'dexs-daily--data-explanation',
		value: 'dexsDailyData'
	},
	fees: {
		key: 'fees-daily--data-explanation',
		value: 'feesDailyData'
	},
	options: {
		key: 'options-daily--data-explanation',
		value: 'optionsDailyData'
	}
}

const getAnnouncementKey = (router: NextRouter) => {
	if (router.pathname.startsWith('/yields')) return 'yields'
	else if (router.pathname.startsWith('/dexs')) return 'dexs'
	else if (router.pathname.startsWith('/fees')) return 'fees'
	else if (router.pathname.startsWith('/options')) return 'options'
	else return 'defi'
}

export function Announcement({
	children,
	notCancellable,
	warning = false
}: {
	children: React.ReactNode
	notCancellable?: boolean
	warning?: boolean
}) {
	const router = useRouter()

	const { key, value } = ANNOUNCEMENT[getAnnouncementKey(router)]

	const routeAnnouncementKey = router.pathname + key
	const routeAnnouncementValue = router.pathname + value

	const closeAnnouncement = () => {
		localStorage.setItem(routeAnnouncementKey, JSON.stringify({ value: routeAnnouncementValue }))
		window.dispatchEvent(new Event('storage'))
	}

	const store = React.useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(routeAnnouncementKey) ?? null,
		() => null
	)

	if (notCancellable ? false : JSON.parse(store)?.value === routeAnnouncementValue) {
		return null
	}

	return (
		<p
			className="relative rounded-md border border-(--link-bg) bg-(--link-bg) p-2 text-center text-sm"
			style={{ '--bg': warning ? '#41440d' : 'hsl(215deg 79% 51% / 12%)' } as any}
		>
			{children}
			{!notCancellable ? (
				<button
					className="absolute top-0 right-0 bottom-0 my-auto flex h-10 w-10 items-center justify-center rounded-md hover:bg-(--bg-input)"
					onClick={closeAnnouncement}
				>
					<Icon name="x" height={16} width={16} />
					<span className="sr-only">Close</span>
				</button>
			) : null}
		</p>
	)
}
