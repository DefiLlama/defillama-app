import { useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { ApiUsageBreakdown } from './ApiUsageBreakdown'
import { ToggleSwitch } from './ToggleSwitch'

const API_CREDITS_LIMIT = 1_000_000

interface ApiAccessCardProps {
	apiKey: string | null
	credits: number | null
	overageEnabled: boolean
	usageStats: any
	isUsageStatsLoading: boolean
	isUsageStatsError: boolean
	onRegenerateKey: () => void
	onToggleOverage: () => void
	isRegenerateLoading?: boolean
	isOverageLoading?: boolean
}

export function ApiAccessCard({
	apiKey,
	credits,
	overageEnabled,
	usageStats,
	isUsageStatsLoading,
	isUsageStatsError,
	onRegenerateKey,
	onToggleOverage,
	isRegenerateLoading,
	isOverageLoading
}: ApiAccessCardProps) {
	const [copied, setCopied] = useState(false)
	const [showKey, setShowKey] = useState(false)

	const remaining = credits ?? 0
	const usagePercentage = ((remaining / API_CREDITS_LIMIT) * 100).toFixed(1)

	const handleCopy = () => {
		if (apiKey) {
			navigator.clipboard.writeText(apiKey)
			setCopied(true)
			toast.success('API key copied to clipboard')
			setTimeout(() => setCopied(false), 2000)
		}
	}

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-c-ced8e6) bg-white p-4 dark:border-(--sub-c-2f3336) dark:bg-(--sub-c-131516)">
			{/* Header */}
			<div className="flex items-center gap-2">
				<Icon name="cli" height={28} width={28} className="text-(--sub-c-090b0c) dark:text-white" />
				<span className="text-base leading-5 font-medium text-(--sub-c-090b0c) dark:text-white">API Access</span>
			</div>

			{/* API Key Section */}
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<span className="text-sm text-(--sub-c-090b0c) dark:text-white">Your API Key</span>
					<div className="flex gap-2">
						<button
							onClick={() => setShowKey((v) => !v)}
							disabled={!apiKey}
							className="flex h-6 items-center gap-1 rounded-md border border-(--sub-c-dedede) px-2 text-[10px] leading-3 font-medium text-(--sub-c-090b0c) disabled:opacity-50 dark:border-(--sub-c-2f3336) dark:text-white"
							aria-label={showKey ? 'Hide API key' : 'Show API key'}
						>
							<Icon name={showKey ? 'eye-off' : 'eye'} height={12} width={12} />
							{showKey ? 'Hide' : 'Show'}
						</button>
						<button
							onClick={handleCopy}
							disabled={!apiKey}
							className="flex h-6 items-center gap-1 rounded-md border border-(--sub-c-dedede) px-2 text-[10px] leading-3 font-medium text-(--sub-c-090b0c) disabled:opacity-50 dark:border-(--sub-c-2f3336) dark:text-white"
						>
							<Icon name="copy" height={12} width={12} />
							{copied ? 'Copied' : 'Copy'}
						</button>
						<button
							onClick={() => {
								if (
									window.confirm(
										'Regenerating will invalidate your current API key. All existing integrations will stop working. Continue?'
									)
								) {
									onRegenerateKey()
								}
							}}
							disabled={isRegenerateLoading}
							className="flex h-6 items-center gap-1 rounded-md border border-(--sub-c-dedede) px-2 text-[10px] leading-3 font-medium text-(--sub-c-090b0c) disabled:opacity-50 dark:border-(--sub-c-2f3336) dark:text-white"
						>
							<Icon name="repeat" height={12} width={12} />
							{isRegenerateLoading ? 'Regenerating...' : 'Regenerate'}
						</button>
					</div>
				</div>
				<div className="rounded-lg bg-(--sub-c-f6f7f9) px-3 py-2.5 dark:bg-(--sub-c-090b0c)">
					<code className="font-mono text-xs leading-5 break-all text-(--sub-c-878787)">
						{!apiKey ? '...' : showKey ? apiKey : '•'.repeat(apiKey.length)}
					</code>
				</div>
			</div>

			{/* Enable Overage */}
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<span className="text-sm text-(--sub-c-090b0c) dark:text-white">Enable Overage</span>
					<ToggleSwitch
						checked={overageEnabled}
						onClick={onToggleOverage}
						disabled={isOverageLoading}
						aria-label="Enable overage billing"
					/>
				</div>
				<p className="text-xs leading-4 text-(--sub-c-878787)">
					Continue API calls beyond 1M/month at $0.60 per 1,000 calls.
				</p>
			</div>

			{/* API Usage */}
			<div className="flex flex-col gap-4 rounded-lg bg-(--sub-c-f6f7f9) p-3 dark:bg-(--sub-c-090b0c)">
				<span className="text-sm text-(--sub-c-090b0c) dark:text-white">API Usage</span>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-xs text-(--sub-c-878787)">Remaining API Calls: {usagePercentage}%</span>
						<span className="text-xs text-(--sub-c-090b0c) dark:text-white">
							{remaining.toLocaleString()}{' '}
							<span className="text-(--sub-c-878787)">/{API_CREDITS_LIMIT.toLocaleString()}</span>
						</span>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-(--sub-c-eeeeee) dark:bg-white/[0.08]">
						<div className="h-full rounded-full bg-(--sub-c-1f67d2)" style={{ width: `${usagePercentage}%` }} />
					</div>
					<div className="flex items-center justify-between">
						<span className="text-xs text-(--sub-c-878787)">Rate Limit:</span>
						<span className="text-xs text-(--sub-c-090b0c) dark:text-white">
							1,000 Requests<span className="text-(--sub-c-878787)">/minute</span>
						</span>
					</div>
				</div>
			</div>

			{/* API Usage Breakdown */}
			<ApiUsageBreakdown usageStats={usageStats} isLoading={isUsageStatsLoading} isError={isUsageStatsError} />
		</div>
	)
}
