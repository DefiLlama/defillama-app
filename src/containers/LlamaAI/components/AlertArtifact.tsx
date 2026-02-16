import { useMutation } from '@tanstack/react-query'
import { memo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { handleSimpleFetchResponse } from '~/utils/async'
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
	defaultTitle?: string
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const getUserTimezone = () => {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone
	} catch {
		return 'UTC'
	}
}

const getTimezoneLabel = (timezone: string): string => {
	if (timezone === 'UTC') return 'UTC'
	try {
		const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
		const parts = formatter.formatToParts(new Date())
		const tzPart = parts.find((p) => p.type === 'timeZoneName')
		if (tzPart?.value) {
			return tzPart.value.replace('GMT', 'GMT+').replace('+-', '-').replace('++', '+')
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
	const [title, setTitle] = useState(defaultTitle || alertId.replace(/_/g, ' '))
	const [frequency, setFrequency] = useState<'daily' | 'weekly'>(alertIntent.frequency ?? 'daily')
	const [hour, setHour] = useState(alertIntent.hour ?? 9)
	const [dayOfWeek, setDayOfWeek] = useState(alertIntent.dayOfWeek ?? 1)
	const [timezone] = useState(alertIntent.timezone ?? getUserTimezone())
	const [saved, setSaved] = useState(savedAlertIds?.includes(alertId) || false)

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
		}) => {
			return authorizedFetch(`${MCP_SERVER}/alerts`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			}).then(handleSimpleFetchResponse)
		},
		onSuccess: () => {
			setSaved(true)
		}
	})

	const canSave = !!messageId && !isSaving && !saved && !!title.trim()

	const handleSave = () => {
		if (!messageId) return
		saveAlert({
			messageId,
			alertId,
			title: title.trim(),
			alertConfig: { frequency, hour, dayOfWeek, timezone }
		})
	}

	const saveErrorMessage = saveError ? (saveError instanceof Error ? saveError.message : String(saveError)) : null

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

				<span className="text-xs text-(--text3)">({getTimezoneLabel(timezone)})</span>

				<button
					onClick={handleSave}
					disabled={!canSave}
					className="ml-auto flex items-center gap-1.5 rounded-md bg-[#2172E5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a5cc7] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{saved ? (
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
			</div>
			{saveErrorMessage ? <p className="text-center text-xs text-(--error)">{saveErrorMessage}</p> : null}
		</div>
	)
})
