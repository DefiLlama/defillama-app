import { type ReactNode } from 'react'
import type { SlackLink, SlackStatus } from '~/containers/LlamaAI/api/slack'
import { useSlackIntegrationLink } from '~/containers/LlamaAI/hooks/useSlackIntegrationLink'

type Props = {
	title: string
	description: string
	glyph?: ReactNode
	initialStatus?: SlackStatus | null
}

function ConnectButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
	return (
		<a
			href="#slack-connect"
			onClick={(e) => {
				e.preventDefault()
				if (!disabled) onClick()
			}}
			aria-disabled={disabled}
			className={`inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#4A154B] px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white hover:bg-[#3a1140] ${
				disabled ? 'pointer-events-none opacity-50' : ''
			}`}
		>
			<SlackLogo />
			{label}
		</a>
	)
}

function SlackLogo() {
	return (
		<svg width="14" height="14" viewBox="0 0 122.8 122.8" aria-hidden="true">
			<path
				d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
				fill="#E01E5A"
			/>
			<path
				d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
				fill="#36C5F0"
			/>
			<path
				d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
				fill="#2EB67D"
			/>
			<path
				d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
				fill="#ECB22E"
			/>
		</svg>
	)
}

function WorkspaceRow({
	workspace,
	onDisconnect,
	onReconnect,
	isDisconnecting
}: {
	workspace: SlackLink
	onDisconnect: () => void
	onReconnect: () => void
	isDisconnecting: boolean
}) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/[0.06] bg-black/[0.02] p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
			<div className="min-w-0 flex-1">
				<p className="m-0 text-[13px] font-medium text-[#1a1a1a] dark:text-white">{workspace.team_name}</p>
				<p className="m-0 mt-0.5 text-xs text-[#777] dark:text-[#919296]">
					{workspace.revoked ? (
						<span className="text-amber-600 dark:text-amber-400">
							Disconnected by Slack — reconnect to resume alerts
						</span>
					) : workspace.default_channel_name ? (
						<>Default channel: #{workspace.default_channel_name}</>
					) : (
						<>No default channel set</>
					)}
				</p>
				{workspace.last_error && !workspace.revoked && (
					<p className="m-0 mt-0.5 text-xs text-amber-600 dark:text-amber-400">{workspace.last_error}</p>
				)}
			</div>
			<div className="flex shrink-0 gap-2">
				{workspace.revoked ? (
					<button
						onClick={onReconnect}
						className="rounded-lg bg-[#4A154B] px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white hover:bg-[#3a1140]"
					>
						Reconnect
					</button>
				) : (
					<button
						onClick={onDisconnect}
						disabled={isDisconnecting}
						className="rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs whitespace-nowrap hover:bg-black/[0.04] disabled:opacity-50 dark:border-white/[0.08] dark:hover:bg-white/[0.04]"
					>
						{isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
					</button>
				)}
			</div>
		</div>
	)
}

export function SlackIntegrationRow({ title, description, glyph, initialStatus }: Props) {
	const link = useSlackIntegrationLink({ initialStatus })

	const handleDisconnect = (teamId: string, teamName: string) => {
		if (typeof window !== 'undefined') {
			const confirmed = window.confirm(
				`Disconnect ${teamName}? Existing alerts targeting this workspace will be paused.`
			)
			if (!confirmed) return
		}
		link.disconnect(teamId)
	}

	return (
		<div className="rounded-xl border border-black/[0.06] bg-black/[0.015] p-4 dark:border-white/[0.06] dark:bg-white/[0.015]">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					{glyph}
					<div className="min-w-0">
						<p className="m-0 text-[13.5px] font-medium text-[#1a1a1a] dark:text-white">{title}</p>
						<p className="m-0 mt-0.5 text-xs text-[#777] dark:text-[#919296]">{description}</p>
					</div>
				</div>
				{(link.state.status === 'idle' || link.state.status === 'starting' || link.state.status === 'loading') && (
					<ConnectButton
						onClick={() => link.connect()}
						disabled={link.state.status === 'starting' || link.state.status === 'loading'}
						label={
							link.state.status === 'starting'
								? 'Opening…'
								: link.state.status === 'loading'
									? 'Loading…'
									: 'Add to Slack'
						}
					/>
				)}
			</div>

			{link.state.status === 'pending' && (
				<div className="mt-3 rounded-lg bg-black/[0.04] p-3 text-xs text-[#777] dark:bg-white/[0.04] dark:text-[#919296]">
					Waiting for confirmation in Slack… Once you finish in Slack, come back to this page to see your workspace
					here.
				</div>
			)}

			{link.state.status === 'linked' && (
				<div className="mt-3 flex flex-col gap-2">
					{link.state.workspaces.map((w) => (
						<WorkspaceRow
							key={w.team_id}
							workspace={w}
							onDisconnect={() => handleDisconnect(w.team_id, w.team_name)}
							onReconnect={() => link.connect()}
							isDisconnecting={link.isDisconnecting}
						/>
					))}
					<div className="flex justify-end">
						<ConnectButton onClick={() => link.connect()} label="Add another workspace" />
					</div>
				</div>
			)}

			{link.state.status === 'error' && (
				<div className="mt-3 rounded-lg border border-red-500/40 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-200">
					{link.state.message}
				</div>
			)}
		</div>
	)
}
