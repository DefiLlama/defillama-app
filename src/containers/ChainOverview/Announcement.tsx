import { Announcement } from '~/components/Announcement'
import { BasicLink } from '~/components/Link'

export const ChainOverviewAnnouncement = () => {
	return (
		<Announcement announcementId="rwa-dashboard" version="2026-03">
			NEW!{' '}
			<BasicLink href="/rwa" className="underline">
				RWA dashboard
			</BasicLink>
		</Announcement>
	)
}
