import { Icon } from '~/components/Icon'

interface TrialUpgradeBannerProps {
	onUpgrade: () => void
	isLoading: boolean
}

const BENEFITS = [
	'Full CSV download access',
	'5 deep research questions per day',
	'$10/month in LlamaAI data credits',
	'All Pro features without limitations'
]

export function TrialUpgradeBanner({ onUpgrade, isLoading }: TrialUpgradeBannerProps) {
	return (
		<div className="flex items-center rounded-2xl border border-(--sub-c-1f67d2) bg-(--sub-c-1f67d2)/20 p-4">
			<div className="flex w-full flex-col gap-4 sm:w-[200px]">
				<div className="flex flex-col gap-3">
					<p className="bg-linear-to-r from-(--sub-c-1f67d2) to-(--sub-c-6e9ddf) dark:from-(--sub-c-4b86db) dark:to-[64%] dark:to-(--sub-c-a5c3ed) bg-clip-text text-lg font-semibold leading-[22px] text-transparent">
						Unlock the full power of DefiLlama
					</p>
					<ul className="flex flex-col gap-1.5">
						{BENEFITS.map((b) => (
							<li key={b} className="flex items-start gap-1.5">
								<Icon name="check" height={14} width={14} className="mt-0.5 shrink-0 text-(--sub-c-1f67d2)" />
								<span className="text-xs leading-4 text-(--sub-c-090b0c) dark:text-white">{b}</span>
							</li>
						))}
					</ul>
				</div>
				<button
					onClick={onUpgrade}
					disabled={isLoading}
					className="flex h-8 w-full items-center justify-center rounded-lg bg-(--sub-c-1f67d2) px-3 text-xs font-medium text-white disabled:opacity-50"
				>
					{isLoading ? 'Processing...' : 'Upgrade to Pro'}
				</button>
			</div>
		</div>
	)
}
