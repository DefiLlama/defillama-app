import { memo, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import type { AlertIntent } from '../types'

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
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Get user's timezone
const getUserTimezone = () => {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone
	} catch {
		return 'UTC'
	}
}

export const AlertArtifact = memo(function AlertArtifact({
	alertId,
	alertIntent,
	messageId,
	savedAlertIds
}: AlertArtifactProps) {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	const [title, setTitle] = useState(alertId.replace(/_/g, ' '))
	const [frequency, setFrequency] = useState<'daily' | 'weekly'>(alertIntent.frequency || 'daily')
	const [hour, setHour] = useState(alertIntent.hour || 9)
	const [dayOfWeek, setDayOfWeek] = useState(alertIntent.dayOfWeek || 1)
	const [timezone] = useState(() => getUserTimezone())
	const [saving, setSaving] = useState(false)
	const [saved, setSaved] = useState(savedAlertIds?.includes(alertId) || false)

	const handleSave = async () => {
		if (!messageId || !authorizedFetch) return

		setSaving(true)
		try {
			const res = await authorizedFetch(`${MCP_SERVER}/alerts`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messageId,
					alertId,
					title,
					alertConfig: { frequency, hour, dayOfWeek, timezone }
				})
			})

			if (res.ok) {
				setSaved(true)
				toast.success('Alert saved!')
			} else {
				const err = await res.json()
				toast.error(err.error || 'Failed to save alert')
			}
		} catch (e) {
			toast.error('Failed to save alert')
		} finally {
			setSaving(false)
		}
	}

	if (!isAuthenticated) {
		return (
			<div className="my-2 flex items-center gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 dark:border-[#222324] dark:bg-[#181A1C]">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
					<Icon name="calendar-plus" className="h-5 w-5 text-amber-500" />
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-sm font-medium text-(--text1)">Sign in to save alerts</span>
					<span className="text-xs text-(--text3)">Scheduled alerts require authentication</span>
				</div>
			</div>
		)
	}

	return (
		<div className="my-2 flex flex-col gap-3 rounded-lg border border-[#e6e6e6] bg-white p-3 dark:border-[#222324] dark:bg-[#181A1C]">
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
					<Icon name="calendar-plus" className="h-5 w-5 text-amber-500" />
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-sm font-medium text-(--text1)">Schedule Alert</span>
					<span className="text-xs text-(--text3)">Get this data delivered to your inbox</span>
				</div>
			</div>

			<input
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				placeholder="Alert title"
				disabled={saved}
				className="w-full rounded-md border border-[#e6e6e6] bg-transparent px-3 py-2 text-sm text-(--text1) placeholder:text-(--text3) focus:border-[#2172E5] focus:outline-none disabled:opacity-50 dark:border-[#222324]"
			/>

			<div className="flex flex-wrap items-center gap-2">
				<select
					value={frequency}
					onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly')}
					disabled={saved}
					className="rounded-md border border-[#e6e6e6] bg-transparent px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-none disabled:opacity-50 dark:border-[#222324]"
				>
					<option value="daily">Daily</option>
					<option value="weekly">Weekly</option>
				</select>

				{frequency === 'weekly' && (
					<select
						value={dayOfWeek}
						onChange={(e) => setDayOfWeek(Number(e.target.value))}
						disabled={saved}
						className="rounded-md border border-[#e6e6e6] bg-transparent px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-none disabled:opacity-50 dark:border-[#222324]"
					>
						{DAYS_OF_WEEK.map((day, idx) => (
							<option key={day} value={idx}>
								{day}
							</option>
						))}
					</select>
				)}

				<span className="text-sm text-(--text3)">at</span>

				<select
					value={hour}
					onChange={(e) => setHour(Number(e.target.value))}
					disabled={saved}
					className="rounded-md border border-[#e6e6e6] bg-transparent px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-none disabled:opacity-50 dark:border-[#222324]"
				>
					{Array.from({ length: 24 }, (_, i) => (
						<option key={i} value={i}>
							{i.toString().padStart(2, '0')}:00
						</option>
					))}
				</select>

				<span className="text-xs text-(--text3)">({timezone.split('/').pop()?.replace(/_/g, ' ') || timezone})</span>

				<button
					onClick={handleSave}
					disabled={saving || saved || !title.trim()}
					className="ml-auto flex items-center gap-1.5 rounded-md bg-[#2172E5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a5cc7] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{saved ? (
						<>
							<Icon name="check" className="h-4 w-4" />
							<span>Saved</span>
						</>
					) : saving ? (
						<span>Saving...</span>
					) : (
						<>
							<Icon name="calendar-plus" className="h-4 w-4" />
							<span>Save Alert</span>
						</>
					)}
				</button>
			</div>
		</div>
	)
})
