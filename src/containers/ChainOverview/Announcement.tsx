import { Announcement } from '~/components/Announcement'

export const ChainOverviewAnnouncement = () => {
	return (
		<Announcement announcementId="investor-relations" version="2026-04-07">
			NEW!{' '}
			<a href="https://investors.defillama.com/" target="_blank" rel="noreferrer noopener" className="underline">
				Investor Relations
			</a>{' '}
			| View curated protocol dashboards and announcements
		</Announcement>
	)
}
