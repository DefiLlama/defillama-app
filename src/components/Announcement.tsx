import * as React from 'react'
import { Icon } from '~/components/Icon'
import { createAnnouncementDismissalToken, dismissAnnouncement, isAnnouncementDismissed } from '~/utils/cookies'

type DismissibleAnnouncementProps = {
	children: React.ReactNode
	announcementId: string
	version: string
	notCancellable?: false
	warning?: boolean
}

type PermanentAnnouncementProps = {
	children: React.ReactNode
	notCancellable: true
	warning?: boolean
	announcementId?: never
	version?: never
}

type AnnouncementProps = DismissibleAnnouncementProps | PermanentAnnouncementProps

export function Announcement(props: AnnouncementProps) {
	const { children, notCancellable, warning = false } = props
	const dismissalToken = props.notCancellable
		? null
		: createAnnouncementDismissalToken(props.announcementId, props.version)
	const [isDismissed, setIsDismissed] = React.useState(false)

	React.useEffect(() => {
		if (!dismissalToken) return
		if (isAnnouncementDismissed(dismissalToken)) {
			setIsDismissed(true)
		}
	}, [dismissalToken])

	if (isDismissed) {
		return null
	}

	const closeAnnouncement = () => {
		if (!dismissalToken) return
		dismissAnnouncement(dismissalToken)
		setIsDismissed(true)
	}

	const wrapperStyle: React.CSSProperties & Record<'--link-bg', string> = {
		'--link-bg': warning ? '#41440d' : 'hsl(215deg 79% 51% / 12%)'
	}

	return (
		<div
			className={[
				'flex min-h-[38px] items-center justify-between gap-2 rounded-md border border-(--link-bg) bg-(--link-bg) p-1.5 text-sm',
				dismissalToken ? `announcement-token--${dismissalToken}` : ''
			]
				.filter(Boolean)
				.join(' ')}
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
