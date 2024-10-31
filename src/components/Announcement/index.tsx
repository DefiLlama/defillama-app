import * as React from 'react'
import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'
import { Icon } from '~/components/Icon'

// change 'value' for new announcements
export const ANNOUNCEMENT = {
	defi: {
		key: 'defi-flag-announcement',
		value: 'defi4'
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
	const [rerenderKey, rerender] = React.useState(1)
	const router = useRouter()

	const { key, value } = ANNOUNCEMENT[getAnnouncementKey(router)]

	const routeAnnouncementKey = router.pathname + key
	const routeAnnouncementValue = router.pathname + value

	const closeAnnouncement = () => {
		localStorage.setItem(routeAnnouncementKey, JSON.stringify({ value: routeAnnouncementValue }))
		rerender(rerenderKey + 1)
	}

	const store = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(routeAnnouncementKey) || '{}') : {}

	if (notCancellable ? false : store.value === routeAnnouncementValue) {
		return null
	}

	return (
		<p
			className="relative p-3 text-sm text-black dark:text-white text-center rounded-md bg-[var(--bg)]"
			style={{ '--bg': warning ? '#41440d' : 'hsl(215deg 79% 51% / 12%)' } as any}
		>
			{children}
			{!notCancellable ? (
				<button
					className="absolute top-0 bottom-0 my-auto right-0 h-10 w-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg)]"
					onClick={closeAnnouncement}
				>
					<Icon name="x" height={16} width={16} />
					<span className="sr-only">Close</span>
				</button>
			) : null}
		</p>
	)
}
