import { Announcement } from '~/components/Announcement'
import { useAuthContext } from '../Subscription/auth'

export const ChainOverviewAnnouncement = () => {
	const { user } = useAuthContext()
	return (
		<Announcement announcementId="investor-relations" version="2026-04-07">
			NEW!{' '}
			<a
				href={`https://investors.defillama.com/${user?.id ? `?referrer=${user.id}` : ''}`}
				target="_blank"
				rel="noopener"
				className="underline"
			>
				Investor Relations
			</a>{' '}
			| View curated protocol dashboards and announcements
		</Announcement>
	)
}
