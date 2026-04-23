import { Announcement } from '~/components/Announcement'
import { TokenLogo } from '~/components/TokenLogo'
import { useAuthContext } from '../Subscription/auth'

export const ChainOverviewAnnouncement = ({ chainName }: { chainName?: string }) => {
	const { user } = useAuthContext()

	if (chainName === 'Sonic') {
		return (
			<Announcement
				announcementId="sonic-investor-relations"
				version="2026-04-23"
				className="border border-[#7aa8ff] bg-[linear-gradient(90deg,rgba(234,242,255,0.98),rgba(213,229,255,0.98)_38%,rgba(219,225,255,0.95)_100%)] text-[#0c3d7a] shadow-[0_8px_20px_rgba(43,108,255,0.14)] dark:border-[#1e528f] dark:bg-[linear-gradient(90deg,rgba(27,43,66,0.96),rgba(33,55,81,0.94)_55%,rgba(26,40,94,0.94)_100%)] dark:text-[#d5e3ff]"
				contentClassName="text-center"
			>
				<span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
					<span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-2 py-0.5 text-xs font-semibold text-[#124c8d] shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-[#aac7ff]">
						<TokenLogo name="Sonic" kind="chain" size={14} alt="Logo of Sonic" />
						Sonic IR
					</span>
					<span>View Sonic&apos;s</span>
					<a
						href={`https://investors.defillama.com/sonic${user?.id ? `?referrer=${user.id}` : ''}`}
						target="_blank"
						rel="noopener noreferrer"
						className="underline decoration-2 underline-offset-[3px]"
					>
						investor relations dashboard
					</a>
					<span className="opacity-90">for deeper analytics and investor reports.</span>
				</span>
			</Announcement>
		)
	}

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
