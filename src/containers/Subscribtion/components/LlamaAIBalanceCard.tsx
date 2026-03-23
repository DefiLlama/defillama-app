import { Icon } from '~/components/Icon'

interface LlamaAIBalanceCardProps {
	freeRemaining: string
	toppedUpBalance: string
	freeLimit: string
	freeSpent: string
	isLoading: boolean
	onTopUp: () => void
}

const formatUsd = (value: string) => {
	const num = parseFloat(value)
	return `$${num.toFixed(2)}`
}

export const LlamaAIBalanceCard = ({
	freeRemaining,
	toppedUpBalance,
	freeLimit,
	freeSpent,
	isLoading,
	onTopUp
}: LlamaAIBalanceCardProps) => {
	if (isLoading) {
		return (
			<div className="relative overflow-hidden rounded-xl border border-[#39393E] bg-linear-to-b from-[#222429] to-[#1d1f24] shadow-xl">
				<div className="absolute -inset-1 -z-10 bg-linear-to-r from-[#5C5EFC]/20 to-[#462A92]/20 opacity-70 blur-[100px]" />
				<div className="border-b border-[#39393E]/40 p-4 sm:p-6">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 animate-pulse rounded-lg bg-[#39393E]/20" />
						<div className="space-y-2">
							<div className="h-5 w-40 animate-pulse rounded bg-[#39393E]/20" />
							<div className="h-3.5 w-56 animate-pulse rounded bg-[#39393E]/20" />
						</div>
					</div>
				</div>
				<div className="space-y-4 p-4 sm:p-6">
					<div className="h-4 w-32 animate-pulse rounded bg-[#39393E]/20" />
					<div className="h-3 w-full animate-pulse rounded-full bg-[#39393E]/20" />
					<div className="h-6 w-24 animate-pulse rounded bg-[#39393E]/20" />
					<div className="border-t border-[#39393E]" />
					<div className="flex items-center justify-between">
						<div className="h-7 w-28 animate-pulse rounded bg-[#39393E]/20" />
						<div className="h-9 w-20 animate-pulse rounded-lg bg-[#39393E]/20" />
					</div>
				</div>
			</div>
		)
	}

	const freeSpentNum = parseFloat(freeSpent)
	const freeLimitNum = parseFloat(freeLimit)
	const totalAvailable = parseFloat(freeRemaining) + parseFloat(toppedUpBalance)
	const usagePercent = freeLimitNum > 0 ? Math.min(100, (freeSpentNum / freeLimitNum) * 100) : 0
	const isLowBalance = totalAvailable < 1

	return (
		<div className="relative overflow-hidden rounded-xl border border-[#39393E] bg-linear-to-b from-[#222429] to-[#1d1f24] shadow-xl">
			<div className="absolute -inset-1 -z-10 bg-linear-to-r from-[#5C5EFC]/20 to-[#462A92]/20 opacity-70 blur-[100px]" />

			{/* Header */}
			<div className="border-b border-[#39393E]/40 p-4 sm:p-6">
				<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
					<div className="flex items-center gap-2.5 sm:gap-3">
						<div className="relative rounded-lg bg-[#5C5CF9]/10 p-2 text-[#5C5CF9] sm:p-2.5">
							<Icon name="package" height={18} width={18} className="sm:h-5 sm:w-5" />
						</div>
						<div>
							<h3 className="text-lg font-bold sm:text-xl">LlamaAI Premium Data Balance</h3>
							<p className="text-xs text-[#b4b7bc] sm:text-sm">
								Credits give LlamaAI access to premium data: onchain data, X profiles and posts, LinkedIn, and more.
								<br></br>Pro Subscribers get $10 per month in credits
							</p>
						</div>
					</div>
					<button
						onClick={onTopUp}
						className="flex items-center justify-center gap-2 rounded-lg bg-[#5C5CF9] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4A4AF0] sm:px-5 sm:py-2.5"
					>
						<Icon name="plus" height={14} width={14} />
						<span>Top Up</span>
					</button>
				</div>
			</div>

			{/* Body */}
			<div className="p-4 sm:p-6">
				<div className="rounded-lg border border-[#39393E] bg-linear-to-r from-[#1a1b1f] to-[#1a1b1f]/80 p-4 sm:p-5">
					<div className="grid gap-4 sm:gap-6 md:grid-cols-2">
						{/* Free credits */}
						<div>
							<div className="mb-2 flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<Icon name="pie-chart" height={14} width={14} className="text-[#5C5CF9]" />
									<span className="text-sm">Free This Month</span>
								</div>
								<div className="flex items-baseline gap-1">
									<span className="font-jetbrains font-semibold text-white">{formatUsd(freeRemaining)}</span>
									<span className="text-xs text-[#8a8c90]">/ {formatUsd(freeLimit)}</span>
								</div>
							</div>

							<div className="mb-2 h-3 overflow-hidden rounded-full bg-[#39393E]/20">
								<div
									className="relative h-full overflow-hidden bg-linear-to-r from-[#5C5CF9]/80 to-[#5842C3]"
									style={{ width: `${Math.max(1, usagePercent).toFixed(1)}%` }}
								>
									<div className="absolute inset-0 animate-shimmer bg-[linear-gradient(45deg,transparent_25%,rgba(92,92,249,0.4)_50%,transparent_75%)] bg-size-[1rem_1rem]" />
								</div>
							</div>

							<div className="flex items-center justify-between text-xs text-[#8a8c90]">
								<span>{formatUsd(freeSpent)} used</span>
								<span>{usagePercent.toFixed(0)}% used</span>
							</div>
						</div>

						{/* Topped-up balance */}
						<div>
							<div className="mb-2 flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<Icon name="pie-chart" height={14} width={14} className="text-[#5C5CF9]" />
									<span className="text-sm">Topped Up</span>
								</div>
								<div className="flex items-baseline gap-1">
									<span className="font-jetbrains font-semibold text-white">{formatUsd(toppedUpBalance)}</span>
								</div>
							</div>

							<div className="mb-2 h-3 overflow-hidden rounded-full bg-[#39393E]/20">
								<div className="relative h-full w-full bg-linear-to-r from-[#22c55e]/60 to-[#16a34a]">
									<div className="absolute inset-0 animate-shimmer bg-[linear-gradient(45deg,transparent_25%,rgba(34,197,94,0.3)_50%,transparent_75%)] bg-size-[1rem_1rem]" />
								</div>
							</div>

							<div className="flex items-center justify-between text-xs text-[#8a8c90]">
								<span>Available for premium data</span>
							</div>
						</div>
					</div>
				</div>

				{/* Total */}
				<div className="mt-4 rounded-lg bg-[#13141a]/60 p-3 sm:p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-sm text-[#8a8c90]">Total Available</span>
						</div>
						<span className={`font-jetbrains text-xl font-bold ${isLowBalance ? 'text-yellow-400' : 'text-white'}`}>
							${totalAvailable.toFixed(2)}
						</span>
					</div>
				</div>
			</div>
		</div>
	)
}
