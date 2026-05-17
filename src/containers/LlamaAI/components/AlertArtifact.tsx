import { useMutation, useQuery } from '@tanstack/react-query'
import { memo, useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'
import { AI_SERVER } from '~/constants'
import { useSlackChannels } from '~/containers/LlamaAI/hooks/useSlackChannels'
import { useSlackWorkspaces } from '~/containers/LlamaAI/hooks/useSlackIntegrationLink'
import type { AlertIntent } from '~/containers/LlamaAI/types'
import { assertResponse } from '~/containers/LlamaAI/utils/assertResponse'
import { useAuthContext } from '~/containers/Subscription/auth'

export const AlertArtifactLoading = memo(function AlertArtifactLoading() {
	return (
		<div className="my-2 flex flex-col gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 dark:border-[#222324] dark:bg-[#181A1C]">
			<div className="flex items-center gap-3">
				<div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
					<div className="h-3 w-44 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
				</div>
			</div>
			<div className="h-10 w-full animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
			<div className="flex flex-wrap items-center gap-2">
				<div className="h-10 w-20 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
				<div className="h-10 w-16 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
				<div className="ml-auto h-10 w-28 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
			</div>
		</div>
	)
})

interface AlertArtifactProps {
	alertId: string
	alertIntent: AlertIntent
	messageId?: string
	savedAlertIds?: string[]
	defaultTitle?: string
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
type TestSentState = 'sent' | 'already' | null

const getTimezoneLabel = (timezone: string): string => {
	if (timezone === 'UTC') return 'UTC'
	try {
		const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
		const parts = formatter.formatToParts(new Date())
		const tzPart = parts.find((p) => p.type === 'timeZoneName')
		if (tzPart?.value) {
			return tzPart.value.replace('GMT', 'UTC')
		}
	} catch {}
	return timezone.split('/').pop()?.replace(/_/g, ' ') || timezone
}

export const AlertArtifact = memo(function AlertArtifact({
	alertId,
	alertIntent,
	messageId,
	savedAlertIds,
	defaultTitle
}: AlertArtifactProps) {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	const [title, setTitle] = useState(defaultTitle || 'Untitled alert')
	const [frequency, setFrequency] = useState<'daily' | 'weekly'>(alertIntent.frequency)
	const [hour, setHour] = useState(alertIntent.hour)
	const [dayOfWeek, setDayOfWeek] = useState(alertIntent.dayOfWeek ?? 1)
	const [timezone] = useState(alertIntent.timezone)
	const [savedDbId, setSavedDbId] = useState<string | null>(savedAlertIds?.includes(alertId) ? alertId : null)
	const [hasRetriedTest, setHasRetriedTest] = useState(false)
	const [testSent, setTestSent] = useState<TestSentState>(null)

	const deliveryChannel = alertIntent.deliveryChannel || 'email'
	const isSlack = deliveryChannel === 'slack'
	const [slackTeamId, setSlackTeamId] = useState<string>(alertIntent.slackTeamId ?? '')
	const [slackChannelId, setSlackChannelId] = useState<string>(alertIntent.slackChannelId ?? '')
	const slackWorkspacesQuery = useSlackWorkspaces()
	const slackChannelsQuery = useSlackChannels(isSlack && slackTeamId ? slackTeamId : null)
	const activeWorkspaces = (slackWorkspacesQuery.data?.workspaces ?? []).filter((w) => !w.revoked)
	const selectedWorkspace = activeWorkspaces.find((w) => w.team_id === slackTeamId) ?? null
	const selectedChannel = (slackChannelsQuery.data?.channels ?? []).find((c) => c.id === slackChannelId) ?? null
	const slackTeamName = selectedWorkspace?.team_name ?? alertIntent.slackTeamName ?? null
	const slackChannelName = selectedChannel?.name ?? alertIntent.slackChannelName ?? null
	const isSaved = savedDbId !== null

	useEffect(() => {
		if (!isSlack || slackTeamId || activeWorkspaces.length !== 1) return
		setSlackTeamId(activeWorkspaces[0].team_id)
		if (!slackChannelId && activeWorkspaces[0].default_channel_id) {
			setSlackChannelId(activeWorkspaces[0].default_channel_id)
		}
	}, [isSlack, slackTeamId, slackChannelId, activeWorkspaces])

	const alertDetailQuery = useQuery<{ alert?: { test_sent?: boolean } }>({
		queryKey: ['llamaai-alert-detail', savedDbId],
		queryFn: async () => {
			const res = await authorizedFetch(`${AI_SERVER}/alerts/${savedDbId}`)
			if (!res?.ok) throw new Error('Failed to load alert')
			return res.json()
		},
		enabled: !!savedDbId,
		staleTime: 30_000
	})

	useEffect(() => {
		if (alertDetailQuery.data?.alert?.test_sent === true) setTestSent('already')
	}, [alertDetailQuery.data?.alert?.test_sent])

	const {
		mutate: saveAlert,
		isPending: isSaving,
		error: saveError
	} = useMutation({
		mutationFn: async (payload: {
			messageId: string
			alertId: string
			title: string
			alertConfig: { frequency: 'daily' | 'weekly'; hour: number; dayOfWeek: number; timezone: string }
			delivery_channel: 'email' | 'telegram' | 'slack'
			slack_team_id?: string | null
			slack_channel_id?: string | null
			slack_channel_name?: string | null
		}) => {
			const response = await authorizedFetch(`${AI_SERVER}/alerts`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			})
			assertResponse(response, 'Failed to save alert')
			return response!.json()
		},
		onSuccess: (data: any) => {
			setSavedDbId(data.id)
		}
	})

	const testMutation = useMutation<{ alreadySent: boolean }, Error, string>({
		mutationFn: async (dbId: string) => {
			const res = await authorizedFetch(`${AI_SERVER}/alerts/${dbId}/test`, { method: 'POST' })
			if (!res) throw new Error('Not authenticated')
			if (res.status === 429) return { alreadySent: true }
			if (!res.ok) throw new Error(`Test failed: ${res.status}`)
			const data: { success: boolean; error?: string } = await res.json()
			if (!data.success) throw new Error(data.error ?? 'Test failed')
			return { alreadySent: false }
		},
		onSuccess: (data) => {
			setTestSent(data.alreadySent ? 'already' : 'sent')
		}
	})

	const handleSave = () => {
		if (!messageId) return
		if (isSlack && (!slackTeamId || !slackChannelId)) return
		saveAlert({
			messageId,
			alertId,
			title: title.trim(),
			alertConfig: { frequency, hour, dayOfWeek, timezone },
			delivery_channel: deliveryChannel,
			...(isSlack
				? {
						slack_team_id: slackTeamId,
						slack_channel_id: slackChannelId,
						slack_channel_name: slackChannelName
					}
				: {})
		})
	}

	const handleTest = () => {
		if (!savedDbId || testSent) return
		if (testMutation.isError) setHasRetriedTest(true)
		testMutation.mutate(savedDbId)
	}

	if (!isAuthenticated) {
		return (
			<div className="my-2 flex items-center gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 dark:border-[#222324] dark:bg-[#181A1C]">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
					<Icon name="calendar-plus" className="h-5 w-5 text-amber-500" />
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<h3 className="m-0 text-sm font-medium text-(--text1)">Sign in to save alerts</h3>
					<p className="m-0 text-xs text-(--text3)">Scheduled alerts require authentication.</p>
				</div>
			</div>
		)
	}

	return (
		<div
			className={`my-2 flex flex-col gap-3 rounded-lg border p-3 ${
				isSaved
					? 'border-[#e6e6e6] bg-white dark:border-[#222324] dark:bg-[#181A1C]'
					: 'animate-[alertPulse_2s_ease-in-out_infinite] border-amber-500/50 bg-white dark:bg-[#181A1C]'
			}`}
			style={
				!isSaved
					? ({
							'--tw-shadow': '0 0 0 0 rgba(245, 158, 11, 0)',
							animation: 'alertPulse 2s ease-in-out infinite'
						} as React.CSSProperties)
					: undefined
			}
		>
			<style>{`
				@keyframes alertPulse {
					0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.15); }
					50% { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1); }
				}
			`}</style>
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
					<Icon name="calendar-plus" className="h-5 w-5 text-amber-500" />
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<h3 className="m-0 text-sm font-medium text-(--text1)">Schedule Alert</h3>
					<p className="m-0 text-xs text-(--text3)">
						{deliveryChannel === 'slack'
							? slackChannelName && slackTeamName
								? `Deliver to Slack — #${slackChannelName} · ${slackTeamName}`
								: slackChannelName
									? `Deliver to Slack — #${slackChannelName}`
									: 'Deliver to Slack'
							: deliveryChannel === 'telegram'
								? 'Get this data delivered to Telegram'
								: 'Get this data delivered to your inbox'}
					</p>
				</div>
			</div>

			<input
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				placeholder="Alert title"
				disabled={isSaved}
				className="w-full rounded-md border border-[#e6e6e6] bg-transparent px-3 py-2 text-sm text-(--text1) placeholder:text-(--text3) focus:border-[#2172E5] focus:outline-hidden disabled:opacity-50 dark:border-[#222324]"
			/>

			<div className="flex flex-wrap items-center gap-2">
				<select
					value={frequency}
					onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly')}
					disabled={isSaved}
					className="rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-hidden disabled:opacity-50 dark:border-[#222324] dark:bg-[#222]"
				>
					<option value="daily">Daily</option>
					<option value="weekly">Weekly</option>
				</select>

				{frequency === 'weekly' ? (
					<select
						value={dayOfWeek}
						onChange={(e) => setDayOfWeek(Number(e.target.value))}
						disabled={isSaved}
						className="rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-hidden disabled:opacity-50 dark:border-[#222324] dark:bg-[#222]"
					>
						{DAYS_OF_WEEK.map((day, idx) => (
							<option key={day} value={idx}>
								{day}
							</option>
						))}
					</select>
				) : null}

				<span className="text-sm text-(--text3)">at</span>

				<select
					value={hour}
					onChange={(e) => setHour(Number(e.target.value))}
					disabled={isSaved}
					className="rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-hidden disabled:opacity-50 dark:border-[#222324] dark:bg-[#222]"
				>
					{Array.from({ length: 24 }, (_, h) => (
						<option key={`llamai-alert-h${h}`} value={h}>
							{h.toString().padStart(2, '0')}:00
						</option>
					))}
				</select>

				<span className="text-xs text-(--text3)">({getTimezoneLabel(timezone)})</span>
			</div>

			{isSlack ? (
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm text-(--text3)">Send to</span>
					{slackWorkspacesQuery.isLoading ? (
						<span className="text-xs text-(--text3)">Loading workspaces…</span>
					) : activeWorkspaces.length === 0 ? (
						<span className="text-xs text-amber-600 dark:text-amber-400">No Slack workspaces connected.</span>
					) : (
						<select
							value={slackTeamId}
							disabled={isSaved}
							onChange={(e) => {
								const nextTeamId = e.target.value
								setSlackTeamId(nextTeamId)
								const nextWorkspace = activeWorkspaces.find((w) => w.team_id === nextTeamId)
								setSlackChannelId(nextWorkspace?.default_channel_id ?? '')
							}}
							className="rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-hidden disabled:opacity-50 dark:border-[#222324] dark:bg-[#222]"
						>
							<option value="" disabled>
								Pick workspace
							</option>
							{activeWorkspaces.map((w) => (
								<option key={w.team_id} value={w.team_id}>
									{w.team_name}
								</option>
							))}
						</select>
					)}

					{slackTeamId ? (
						slackChannelsQuery.isLoading ? (
							<span className="text-xs text-(--text3)">Loading channels…</span>
						) : slackChannelsQuery.isError ? (
							<span className="text-xs text-red-500">Failed to load channels</span>
						) : (
							<select
								value={slackChannelId}
								disabled={isSaved}
								onChange={(e) => setSlackChannelId(e.target.value)}
								className="rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-hidden disabled:opacity-50 dark:border-[#222324] dark:bg-[#222]"
							>
								<option value="" disabled>
									Pick channel
								</option>
								{(slackChannelsQuery.data?.channels ?? [])
									.filter((c) => !c.is_archived)
									.sort((a, b) => Number(a.is_private) - Number(b.is_private) || a.name.localeCompare(b.name))
									.map((c) => (
										<option key={c.id} value={c.id} disabled={c.is_private && !c.is_member}>
											{c.is_private ? '🔒 ' : '# '}
											{c.name}
											{c.is_private && !c.is_member ? ' (invite bot first)' : ''}
										</option>
									))}
							</select>
						)
					) : null}
				</div>
			) : null}

			{!isSaved ? (
				<p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
					<Icon name="alert-triangle" className="h-3.5 w-3.5 shrink-0" />
					Action required — confirm your alert settings and save
				</p>
			) : null}

			<button
				onClick={handleSave}
				disabled={!messageId || isSaving || isSaved || !title.trim() || (isSlack && (!slackTeamId || !slackChannelId))}
				className={`flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
					isSaved
						? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
						: 'bg-[#2172E5] text-white hover:bg-[#1a5cc7] disabled:cursor-not-allowed disabled:opacity-50'
				}`}
			>
				{isSaved ? (
					<>
						<Icon name="check" className="h-4 w-4" />
						<span>Saved</span>
					</>
				) : isSaving ? (
					<span>Saving...</span>
				) : (
					<>
						<Icon name="calendar-plus" className="h-4 w-4" />
						<span>Save Alert</span>
					</>
				)}
			</button>
			{saveError ? <p className="text-center text-xs text-(--error)">{saveError.message}</p> : null}

			{isSaved && testMutation.isIdle && !testSent ? (
				<button
					onClick={handleTest}
					disabled={alertDetailQuery.isLoading}
					className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[#e6e6e6] px-4 py-2 text-sm font-medium text-(--text1) transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-[#222324] dark:hover:bg-[#222324]"
				>
					<Icon name="mail" className="h-4 w-4" />
					<span>Send test alert</span>
				</button>
			) : null}

			{isSaved && testSent === 'already' && !testMutation.isPending ? (
				<p className="flex items-center justify-center gap-1.5 text-xs text-(--text3)">
					<Icon name="check" className="h-3.5 w-3.5" />
					Test already sent for this alert
				</p>
			) : null}

			{isSaved && testSent === 'sent' && !testMutation.isPending ? (
				<p className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
					<Icon name="check" className="h-3.5 w-3.5" />
					{deliveryChannel === 'slack'
						? slackChannelName
							? `Test sent! Check #${slackChannelName} in Slack`
							: 'Test sent! Check your Slack channel'
						: deliveryChannel === 'telegram'
							? 'Test sent! Check your Telegram'
							: 'Test sent! Check your inbox'}
				</p>
			) : null}

			{testMutation.isPending ? (
				<p className="flex items-center justify-center gap-1.5 text-xs text-(--text3)">
					<span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
					Sending test alert...
				</p>
			) : null}

			{testMutation.isError && !hasRetriedTest ? (
				<div className="flex flex-col items-center gap-1.5">
					<p className="text-xs text-(--error)">{testMutation.error.message}</p>
					<button onClick={handleTest} className="text-xs font-medium text-[#2172E5] hover:underline">
						Retry
					</button>
				</div>
			) : null}

			{testMutation.isError && hasRetriedTest ? (
				<p className="text-center text-xs text-(--error)">{testMutation.error.message}</p>
			) : null}
		</div>
	)
})
