import * as React from 'react'
import Image from 'next/future/image'
import Cookies from 'js-cookie'
import styled from 'styled-components'
import lubb from '~/assets/lubb.png'
import { X } from 'react-feather'
import { useRouter } from 'next/router'

// change 'value' for new announcements
export const ANNOUNCEMENT = {
	defi: {
		key: 'defi-flag-announcement',
		value: 'defi1'
	},
	yields: {
		key: 'yield-flag-announcement',
		value: 'yield1'
	}
}

export default function Announcement({
	children,
	notCancellable
}: {
	children: React.ReactNode
	notCancellable?: boolean
}) {
	const router = useRouter()

	const { key, value } = ANNOUNCEMENT[router.pathname.startsWith('/yields') ? 'yields' : 'defi']

	const closeAnnouncement = () => {
		Cookies.set(key, value)

		const { announcement, ...queries } = router.query

		router.push({ pathname: router.pathname, query: { ...queries } }, undefined, { shallow: true })
	}

	if (notCancellable ? false : !router.query.announcement) {
		return null
	}

	return (
		<AnnouncementWrapper>
			{children}
			<Image src={lubb} width={18} height={18} alt="llama love" />
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
