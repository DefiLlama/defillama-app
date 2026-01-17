import { memo, useCallback, useEffect, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'

interface Alert {
	id: string
	title: string
	original_query: string
	schedule_expression: string
	next_run_at: string
	last_run_at: string | null
	last_run_status: 'success' | 'error' | null
	enabled: boolean
	run_count: number
	created_at: string
}

interface AlertsModalProps {
	isOpen: boolean
	onClose: () => void
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const BLOCKED_HOURS_UTC = [0, 1, 2]
const GMT_OFFSETS = [
	{ label: 'GMT-12', value: 'Etc/GMT+12' },
	{ label: 'GMT-11', value: 'Etc/GMT+11' },
	{ label: 'GMT-10', value: 'Etc/GMT+10' },
	{ label: 'GMT-9', value: 'Etc/GMT+9' },
	{ label: 'GMT-8', value: 'Etc/GMT+8' },
	{ label: 'GMT-7', value: 'Etc/GMT+7' },
	{ label: 'GMT-6', value: 'Etc/GMT+6' },
	{ label: 'GMT-5', value: 'Etc/GMT+5' },
	{ label: 'GMT-4', value: 'Etc/GMT+4' },
	{ label: 'GMT-3', value: 'Etc/GMT+3' },
	{ label: 'GMT-2', value: 'Etc/GMT+2' },
	{ label: 'GMT-1', value: 'Etc/GMT+1' },
	{ label: 'GMT+0 (UTC)', value: 'UTC' },
	{ label: 'GMT+1', value: 'Etc/GMT-1' },
	{ label: 'GMT+2', value: 'Etc/GMT-2' },
	{ label: 'GMT+3', value: 'Etc/GMT-3' },
	{ label: 'GMT+4', value: 'Etc/GMT-4' },
	{ label: 'GMT+5', value: 'Etc/GMT-5' },
	{ label: 'GMT+6', value: 'Etc/GMT-6' },
	{ label: 'GMT+7', value: 'Etc/GMT-7' },
	{ label: 'GMT+8', value: 'Etc/GMT-8' },
	{ label: 'GMT+9', value: 'Etc/GMT-9' },
	{ label: 'GMT+10', value: 'Etc/GMT-10' },
	{ label: 'GMT+11', value: 'Etc/GMT-11' },
	{ label: 'GMT+12', value: 'Etc/GMT-12' },
	{ label: 'GMT+13', value: 'Etc/GMT-13' },
	{ label: 'GMT+14', value: 'Etc/GMT-14' }
]

const getUserTimezone = (): string => {
	try {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
		const offset = new Date().getTimezoneOffset()
		const hours = Math.floor(Math.abs(offset) / 60)
		const sign = offset <= 0 ? '-' : '+'
		const etcTz = `Etc/GMT${sign}${hours}`
		if (GMT_OFFSETS.some((g) => g.value === etcTz)) return etcTz
		if (GMT_OFFSETS.some((g) => g.value === tz)) return tz
		return 'UTC'
	} catch {
		return 'UTC'
	}
}

const convertHourToUTC = (localHour: number, timezone: string): number => {
	if (timezone === 'UTC') return localHour
	const match = timezone.match(/Etc\/GMT([+-])(\d+)/)
	if (match) {
		const sign = match[1] === '+' ? -1 : 1
		const offset = parseInt(match[2], 10)
		let utcHour = localHour - sign * offset
		if (utcHour < 0) utcHour += 24
		if (utcHour >= 24) utcHour -= 24
		return utcHour
	}
	return localHour
}

const getBlockedLocalHours = (timezone: string): number[] => {
	const blocked: number[] = []
	for (let h = 0; h < 24; h++) {
		const utcHour = convertHourToUTC(h, timezone)
		if (BLOCKED_HOURS_UTC.includes(utcHour)) {
			blocked.push(h)
		}
	}
	return blocked
}

const getTimezoneLabel = (timezone: string): string => {
	if (timezone === 'UTC') return 'UTC'
	const found = GMT_OFFSETS.find((g) => g.value === timezone)
	return found?.label || timezone
}

export const AlertsModal = memo(function AlertsModal({ isOpen, onClose }: AlertsModalProps) {
	const { authorizedFetch } = useAuthContext()
	const [alerts, setAlerts] = useState<Alert[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [editingAlert, setEditingAlert] = useState<Alert | null>(null)
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

	const fetchAlerts = useCallback(async () => {
		if (!authorizedFetch) return
		setIsLoading(true)
		try {
			const res = await authorizedFetch(`${MCP_SERVER}/alerts`)
			if (res.ok) {
				const data = await res.json()
				setAlerts(data.alerts || [])
			}
		} catch (e) {
			console.log('Failed to fetch alerts:', e)
		} finally {
			setIsLoading(false)
		}
	}, [authorizedFetch])

	useEffect(() => {
		if (isOpen) {
			fetchAlerts()
		}
	}, [isOpen, fetchAlerts])

	const handleToggleEnabled = useCallback(
		async (alert: Alert) => {
			if (!authorizedFetch) return
			const newEnabled = !alert.enabled
			setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, enabled: newEnabled } : a)))
			try {
				const res = await authorizedFetch(`${MCP_SERVER}/alerts/${alert.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ enabled: newEnabled })
				})
				if (!res.ok) {
					setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, enabled: !newEnabled } : a)))
					toast.error('Failed to update alert')
				}
			} catch (e) {
				setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, enabled: !newEnabled } : a)))
				toast.error('Failed to update alert')
			}
		},
		[authorizedFetch]
	)

	const handleDelete = useCallback(
		async (alertId: string) => {
			if (!authorizedFetch) return
			try {
				const res = await authorizedFetch(`${MCP_SERVER}/alerts/${alertId}`, { method: 'DELETE' })
				if (res.ok) {
					setAlerts((prev) => prev.filter((a) => a.id !== alertId))
					toast.success('Alert deleted')
				} else {
					toast.error('Failed to delete alert')
				}
			} catch (e) {
				toast.error('Failed to delete alert')
			}
			setDeleteConfirm(null)
		},
		[authorizedFetch]
	)

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && onClose()}>
			<Ariakit.Dialog
				className="dialog max-h-[85vh] max-w-lg gap-0 overflow-hidden rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-0 shadow-xl dark:border-[#39393E] dark:bg-[#222429]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-sm" />}
				portal
				unmountOnHide
			>
				<div className="flex items-center justify-between border-b border-[#E6E6E6] px-5 py-4 dark:border-[#39393E]">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
							<Icon name="calendar-plus" className="h-5 w-5 text-amber-500" />
						</div>
						<h2 className="text-lg font-semibold text-black dark:text-white">Your Alerts</h2>
					</div>
					<Ariakit.DialogDismiss className="rounded-full p-1.5 text-[#666] transition-colors hover:bg-[#f7f7f7] hover:text-black dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white">
						<Icon name="x" className="h-5 w-5" />
					</Ariakit.DialogDismiss>
				</div>

				<div className="thin-scrollbar max-h-[calc(85vh-73px)] overflow-y-auto">
					{isLoading ? (
						<div className="flex items-center justify-center py-16">
							<LoadingSpinner size={24} />
						</div>
					) : alerts.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
							<div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f7f7f7] dark:bg-[#333]">
								<Icon name="calendar" className="h-7 w-7 text-[#999]" />
							</div>
							<p className="text-sm text-[#666] dark:text-[#919296]">No alerts yet</p>
							<p className="max-w-xs text-xs text-[#999] dark:text-[#666]">
								Ask LlamaAI to set up alerts like "Send me AAVE TVL daily at 9 AM"
							</p>
						</div>
					) : (
						<div className="flex flex-col">
							{alerts.map((alert) => (
								<AlertRow
									key={alert.id}
									alert={alert}
									isEditing={editingAlert?.id === alert.id}
									isDeleting={deleteConfirm === alert.id}
									onToggle={() => handleToggleEnabled(alert)}
									onEdit={() => setEditingAlert(editingAlert?.id === alert.id ? null : alert)}
									onDelete={() => setDeleteConfirm(alert.id)}
									onDeleteConfirm={() => handleDelete(alert.id)}
									onDeleteCancel={() => setDeleteConfirm(null)}
									onSave={(updates) => {
										setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, ...updates } : a)))
										setEditingAlert(null)
									}}
								/>
							))}
						</div>
					)}
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
})

interface AlertRowProps {
	alert: Alert
	isEditing: boolean
	isDeleting: boolean
	onToggle: () => void
	onEdit: () => void
	onDelete: () => void
	onDeleteConfirm: () => void
	onDeleteCancel: () => void
	onSave: (updates: Partial<Alert>) => void
}

const AlertRow = memo(function AlertRow({
	alert,
	isEditing,
	isDeleting,
	onToggle,
	onEdit,
	onDelete,
	onDeleteConfirm,
	onDeleteCancel,
	onSave
}: AlertRowProps) {
	const { authorizedFetch } = useAuthContext()
	const [title, setTitle] = useState(alert.title)
	const [frequency, setFrequency] = useState<'daily' | 'weekly'>(alert.schedule_expression.includes('Weekly') ? 'weekly' : 'daily')
	const [hour, setHour] = useState(() => {
		const match = alert.schedule_expression.match(/at (\d+)/)
		return match ? parseInt(match[1]) : 9
	})
	const [dayOfWeek, setDayOfWeek] = useState(() => {
		const match = alert.schedule_expression.match(/on (\w+)/)
		if (match) {
			const idx = DAYS_OF_WEEK.findIndex((d) => d.toLowerCase() === match[1].toLowerCase())
			return idx >= 0 ? idx : 1
		}
		return 1
	})
	const [isSaving, setIsSaving] = useState(false)
	const [timezone, setTimezone] = useState(() => getUserTimezone())

	const blockedHours = getBlockedLocalHours(timezone)

	useEffect(() => {
		if (blockedHours.includes(hour)) {
			const firstAvailable = Array.from({ length: 24 }, (_, i) => i).find((h) => !blockedHours.includes(h))
			if (firstAvailable !== undefined) setHour(firstAvailable)
		}
	}, [timezone, blockedHours, hour])

	const handleSave = async () => {
		if (!authorizedFetch) return
		setIsSaving(true)
		try {
			const res = await authorizedFetch(`${MCP_SERVER}/alerts/${alert.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					alertConfig: { frequency, hour, dayOfWeek, timezone }
				})
			})
			if (res.ok) {
				const tzLabel = getTimezoneLabel(timezone)
				const newExpression =
					frequency === 'weekly' ? `Weekly on ${DAYS_OF_WEEK[dayOfWeek]} at ${hour}:00 ${tzLabel}` : `Daily at ${hour}:00 ${tzLabel}`
				onSave({ title, schedule_expression: newExpression })
				toast.success('Alert updated')
			} else {
				toast.error('Failed to update alert')
			}
		} catch (e) {
			toast.error('Failed to update alert')
		} finally {
			setIsSaving(false)
		}
	}

	const formatNextRun = (date: string) => {
		const d = new Date(date)
		const now = new Date()
		const diffMs = d.getTime() - now.getTime()
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
		const diffDays = Math.floor(diffHours / 24)
		if (diffDays > 1) return `in ${diffDays} days`
		if (diffDays === 1) return 'tomorrow'
		if (diffHours > 0) return `in ${diffHours}h`
		return 'soon'
	}

	if (isDeleting) {
		return (
			<div className="flex items-center justify-between gap-3 border-b border-[#E6E6E6] px-5 py-4 dark:border-[#39393E]">
				<p className="text-sm text-[#666] dark:text-[#919296]">Delete "{alert.title}"?</p>
				<div className="flex gap-2">
					<button
						onClick={onDeleteCancel}
						className="rounded-md px-3 py-1.5 text-xs text-[#666] hover:bg-[#f7f7f7] dark:text-[#919296] dark:hover:bg-[#333]"
					>
						Cancel
					</button>
					<button onClick={onDeleteConfirm} className="rounded-md bg-red-500 px-3 py-1.5 text-xs text-white hover:bg-red-600">
						Delete
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="border-b border-[#E6E6E6] px-5 py-4 dark:border-[#39393E]">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<h3 className="truncate text-sm font-medium text-black dark:text-white">{alert.title}</h3>
						{alert.last_run_status === 'error' && (
							<span className="shrink-0 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-500">Error</span>
						)}
					</div>
					<p className="mt-0.5 text-xs text-[#666] dark:text-[#919296]">{alert.schedule_expression.replace('Etc/', '')}</p>
					<p className="mt-1 text-[10px] text-[#999] dark:text-[#666]">
						{alert.enabled ? `Next run ${formatNextRun(alert.next_run_at)}` : 'Paused'} · {alert.run_count} runs
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<button
						onClick={onEdit}
						className={`flex h-7 w-7 items-center justify-center rounded-md text-[#666] hover:bg-[#f7f7f7] hover:text-black dark:text-[#919296] dark:hover:bg-[#333] dark:hover:text-white ${isEditing ? 'bg-[#f7f7f7] text-black dark:bg-[#333] dark:text-white' : ''}`}
						title="Edit"
					>
						<Icon name="pencil" className="h-3.5 w-3.5" />
					</button>
					<button
						onClick={onDelete}
						className="flex h-7 w-7 items-center justify-center rounded-md text-[#666] hover:bg-red-500/10 hover:text-red-500 dark:text-[#919296]"
						title="Delete"
					>
						<Icon name="trash-2" className="h-3.5 w-3.5" />
					</button>
					<button
						onClick={onToggle}
						className={`ml-1 flex h-7 w-12 items-center rounded-full px-0.5 transition-colors ${alert.enabled ? 'bg-[#2172E5]' : 'bg-[#ccc] dark:bg-[#444]'}`}
						title={alert.enabled ? 'Disable' : 'Enable'}
					>
						<span
							className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${alert.enabled ? 'translate-x-5' : 'translate-x-0'}`}
						/>
					</button>
				</div>
			</div>

			{isEditing && (
				<div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#e6e6e6] bg-[#fafafa] p-3 dark:border-[#333] dark:bg-[#1a1a1a]">
					<input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Alert title"
						className="w-full rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-(--text1) placeholder:text-(--text3) focus:border-[#2172E5] focus:outline-none dark:border-[#333] dark:bg-[#222]"
					/>
					<div className="flex flex-wrap items-center gap-2">
						<select
							value={frequency}
							onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly')}
							className="rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-none dark:border-[#333] dark:bg-[#222]"
						>
							<option value="daily">Daily</option>
							<option value="weekly">Weekly</option>
						</select>
						{frequency === 'weekly' && (
							<select
								value={dayOfWeek}
								onChange={(e) => setDayOfWeek(Number(e.target.value))}
								className="rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-none dark:border-[#333] dark:bg-[#222]"
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
							key={`hour-${timezone}`}
							value={hour}
							onChange={(e) => setHour(Number(e.target.value))}
							className="rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-none dark:border-[#333] dark:bg-[#222]"
						>
							{Array.from({ length: 24 }, (_, i) => (
								<option key={`${timezone}-${i}`} value={i} disabled={blockedHours.includes(i)}>
									{i.toString().padStart(2, '0')}:00{blockedHours.includes(i) ? ' (blocked)' : ''}
								</option>
							))}
						</select>
						<select
							value={timezone}
							onChange={(e) => setTimezone(e.target.value)}
							className="rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-(--text1) focus:border-[#2172E5] focus:outline-none dark:border-[#333] dark:bg-[#222]"
						>
							{GMT_OFFSETS.map((tz) => (
								<option key={tz.value} value={tz.value}>
									{tz.label}
								</option>
							))}
						</select>
					</div>
					<div className="flex justify-end gap-2">
						<button
							onClick={onEdit}
							className="rounded-md px-3 py-1.5 text-xs text-[#666] hover:bg-[#eee] dark:text-[#919296] dark:hover:bg-[#333]"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={isSaving || !title.trim()}
							className="flex items-center gap-1.5 rounded-md bg-[#2172E5] px-3 py-1.5 text-xs text-white hover:bg-[#1a5cc7] disabled:opacity-50"
						>
							{isSaving ? <LoadingSpinner size={12} /> : <Icon name="check" className="h-3.5 w-3.5" />}
							Save
						</button>
					</div>
				</div>
			)}
		</div>
	)
})
