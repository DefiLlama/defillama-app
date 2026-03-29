import { Announcement } from '~/components/Announcement'
import { BasicLink } from '~/components/Link'

export const ChainOverviewAnnouncement = () => {
	return (
		<Announcement announcementId="mcp-server" version="2026-03">
			NEW!{' '}
			<BasicLink href="/mcp" className="underline">
				DefiLlama MCP Server
			</BasicLink>{' '}
			| Connect your AI agent to DeFi data
		</Announcement>
	)
}
