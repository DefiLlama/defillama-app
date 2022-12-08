import * as React from 'react'
import styled from 'styled-components'
import { X } from 'react-feather'
import { useRouter } from 'next/router'

// change 'value' for new announcements
export const ANNOUNCEMENT = {
	defi: {
		key: 'defi-flag-announcement',
		value: 'defi3'
	},
	yields: {
		key: 'yield-flag-announcement',
		value: 'yield3'
	}
}

export default function Announcement({
	children,
	notCancellable
}: {
	children: React.ReactNode
	notCancellable?: boolean
}) {
	const [_, rerender] = React.useState(1)
	const router = useRouter()

	const { key, value } = ANNOUNCEMENT[router.pathname.startsWith('/yields') ? 'yields' : 'defi']

	const routeAnnouncementKey = router.pathname + key
	const routeAnnouncementValue = router.pathname + value

	const closeAnnouncement = () => {
		localStorage.setItem(routeAnnouncementKey, JSON.stringify({ value: routeAnnouncementValue }))
		rerender(1)
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
	font-size: 1rem;
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
