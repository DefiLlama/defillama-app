import * as React from 'react'
import styled from 'styled-components'
import { X } from 'react-feather'
import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'

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

export default function Announcement({
	children,
	notCancellable
}: {
	children: React.ReactNode
	notCancellable?: boolean
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
		<AnnouncementWrapper>
			{children}
			{!notCancellable && (
				<Close onClick={closeAnnouncement}>
					<X size={16} />
				</Close>
			)}
		</AnnouncementWrapper>
	)
}

export const AnnouncementWrapper = styled.p`
	position: relative;
	padding: 12px;
	font-size: 0.875rem;
	color: ${({ theme }) => (theme.mode === 'dark' ? 'white' : 'black')};
	background-color: hsl(215deg 79% 51% / 12%);
	text-align: center;
	box-shadow: ${({ theme }) => theme.shadowSm};
	border-radius: 8px;

	a {
		font-weight: 500;
	}

	img {
		position: relative;
		top: 2px;
		left: 4px;
		display: inline-block;
	}
`

const Close = styled.button`
	position: absolute;
	top: 6px;
	bottom: 6px;
	right: 12px;
	margin: auto 0;
	padding: 6px 8px;
	border-radius: 12px;
	:hover,
	:focus-visible {
		background-color: hsl(215deg 79% 51% / 24%);
	}

	svg {
		position: relative;
		top: 1px;
	}
`
