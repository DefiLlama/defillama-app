import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { setStorageItem, useStorageItem } from '~/contexts/localStorageStore'

// change 'value' for new announcements
const ANNOUNCEMENT = {
	defi: {
		key: 'defi-flag-announcement',
		value: 'defi6'
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
	},
	rwa: {
		key: 'rwa-stablecoins-governance-explanation',
		value: 'rwaStablecoinsGovernanceExplanation'
	}
}

const getAnnouncementKey = (router: NextRouter) => {
	if (router.pathname.startsWith('/yields')) return 'yields'
	else if (router.pathname.startsWith('/dexs')) return 'dexs'
	else if (router.pathname.startsWith('/fees')) return 'fees'
	else if (router.pathname.startsWith('/options')) return 'options'
	else return 'defi'
}

function parseAnnouncementValue(store: string): string | undefined {
	let parsed: unknown
	try {
		parsed = JSON.parse(store)
	} catch {
		return undefined
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
	const value = (parsed as { value?: unknown }).value
	return typeof value === 'string' ? value : undefined
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
		setStorageItem(routeAnnouncementKey, JSON.stringify({ value: routeAnnouncementValue }))
	}

	const store = useStorageItem(routeAnnouncementKey, null)

	let announcementValue: string | undefined
	if (typeof store === 'string') {
		announcementValue = parseAnnouncementValue(store)
	}

	if (!notCancellable && announcementValue === routeAnnouncementValue) {
		return null
	}

	const wrapperStyle: React.CSSProperties & Record<'--link-bg', string> = {
		'--link-bg': warning ? '#41440d' : 'hsl(215deg 79% 51% / 12%)'
	}

	return (
		<div
			className="flex min-h-[38px] items-center justify-between gap-2 rounded-md border border-(--link-bg) bg-(--link-bg) p-1.5 text-sm"
			style={wrapperStyle}
		>
			<span className="flex-1 text-center">{children}</span>
			{!notCancellable ? (
				<button
					className="flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-md hover:bg-(--bg-input)"
					onClick={closeAnnouncement}
				>
					<Icon name="x" height={16} width={16} />
					<span className="sr-only">Close</span>
				</button>
			) : null}
		</div>
	)
}
