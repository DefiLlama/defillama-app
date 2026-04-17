import clsx from 'clsx'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { createAnnouncementDismissalToken, dismissAnnouncement, isAnnouncementDismissed } from '~/utils/cookies'

type DismissibleAnnouncementProps = {
	children: React.ReactNode
	announcementId: string
	version: string
	notCancellable?: false
	warning?: boolean
	className?: string
	contentClassName?: string
}

type PermanentAnnouncementProps = {
	children: React.ReactNode
	notCancellable: true
	warning?: boolean
	className?: string
	contentClassName?: string
	announcementId?: never
	version?: never
}

type AnnouncementProps = DismissibleAnnouncementProps | PermanentAnnouncementProps

export function Announcement(props: AnnouncementProps) {
	const { children, notCancellable, warning = false, className, contentClassName } = props
	const dismissalToken = props.notCancellable
		? null
		: createAnnouncementDismissalToken(props.announcementId, props.version)
	const [isDismissed, setIsDismissed] = React.useState(false)

	React.useEffect(() => {
		setIsDismissed(dismissalToken ? isAnnouncementDismissed(dismissalToken) : false)
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
		'--link-bg': warning ? 'hsl(45deg 80% 50% / 18%)' : 'hsl(215deg 79% 51% / 12%)'
	}

	return (
		<div
			className={clsx(
				'flex min-h-[38px] items-center justify-between gap-2 rounded-md p-1.5 text-sm',
				className ?? clsx('border border-(--link-bg) bg-(--link-bg)', warning && 'text-amber-900 dark:text-amber-200'),
				dismissalToken ? `announcement-token--${dismissalToken}` : ''
			)}
			style={wrapperStyle}
		>
			<div className={clsx('flex-1 text-center', contentClassName)}>{children}</div>
			{!notCancellable ? (
				<button
					className="flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-md hover:bg-(--bg-input)"
					onClick={closeAnnouncement}
				>
					<Icon name="x" height={16} width={16} />
					<span className="sr-only">Close</span>
				</button>
			) : null}
		</div>
	)
}
