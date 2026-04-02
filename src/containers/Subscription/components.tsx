import { Icon } from '~/components/Icon'
import type {
	Availability,
	BillingCycle,
	FeatureItem,
	PlanKey,
	PricingCardCallbacks,
	PricingCardData
} from '~/containers/Subscription/types'

const PLAN_TIER: Record<PlanKey, number> = { free: 0, pro: 1, api: 2, enterprise: 3 }

/* ── Style maps ─────────────────────────────────────────────────────── */

const cardWrapperStyles = {
	highlighted:
		'w-full flex-[1_1_260px] flex flex-col gap-[10px] rounded-[24px] bg-(--sub-brand-primary) px-[2px] pt-[2px] pb-3 sm:max-w-[300px]',
	default: 'w-full flex-[1_1_260px] flex flex-col sm:max-w-[300px] sm:gap-[10px] sm:pb-3'
}

const cardShellStyles = {
	highlighted: 'relative flex flex-1 flex-col',
	default:
		'relative flex flex-1 flex-col rounded-[24px] border border-(--sub-border-slate-100) bg-white dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)'
}

const cardInnerStyles = {
	highlighted:
		'flex h-full flex-1 flex-col justify-between overflow-hidden rounded-[22px] bg-white px-5 py-6 dark:bg-(--sub-surface-dark) sm:px-4',
	default:
		'flex h-full flex-1 flex-col justify-between overflow-hidden rounded-[24px] bg-white px-5 py-6 dark:bg-(--sub-surface-dark) sm:px-4'
}

export const SELECTED_COLUMN_HIGHLIGHT = 'bg-[rgba(31,103,210,0.06)] dark:bg-(--sub-brand-primary-alpha-5)'

const selectedColumnStyles = {
	active: SELECTED_COLUMN_HIGHLIGHT,
	inactive: ''
}

/* ── Shared helpers ─────────────────────────────────────────────────── */

function FeatureBullet({ item }: { item: FeatureItem }) {
	const highlightPrefix = item.highlightText ? item.label.split(':')[0] : null
	const highlightSuffix = item.highlightText ? item.label.slice((highlightPrefix?.length ?? 0) + 1).trim() : null

	return (
		<li className="flex items-start gap-2">
			<span className="shrink-0">
				{item.availability === 'check' ? (
					<Icon name="check" height={24} width={24} className="text-(--sub-brand-secondary) sm:h-5 sm:w-5" />
				) : (
					<Icon
						name="minus"
						height={24}
						width={24}
						className="text-(--sub-icon-muted) sm:h-5 sm:w-5 dark:text-(--sub-icon-muted-dark)"
					/>
				)}
			</span>
			{item.highlightText ? (
				<span className="bg-linear-to-r from-(--sub-brand-primary) to-(--sub-brand-soft) bg-clip-text text-[16px] leading-6 text-transparent sm:pt-0.5 sm:text-[12px] sm:leading-4 dark:from-(--sub-brand-secondary) dark:to-(--sub-brand-softest)">
					{item.link ? (
						<a href={item.link} className="underline">
							{highlightPrefix}
						</a>
					) : (
						<span className="underline">{highlightPrefix}</span>
					)}
					{highlightSuffix ? `: ${highlightSuffix}` : ''}
				</span>
			) : (
				<span
					className={`text-[16px] leading-6 sm:pt-0.5 sm:text-[12px] sm:leading-4 ${item.availability === 'check' ? 'text-(--sub-ink-primary) dark:text-(--sub-text-primary-dark)' : 'text-(--sub-text-muted) dark:text-(--sub-text-muted-dark)'}`}
				>
					{item.link ? (
						<a href={item.link} className="underline">
							{item.label}
						</a>
					) : (
						item.label
					)}
				</span>
			)}
		</li>
	)
}

/* ── PricingCardCta ────────────────────────────────────────────────── */

const outlineBtnCls =
	'h-14 w-full rounded-[12px] border border-(--sub-border-slate-100) bg-(--sub-surface-slate-10) text-[16px] leading-5 font-medium text-(--sub-text-slate-900) dark:border-(--sub-border-strong) dark:bg-transparent dark:text-white sm:h-10 sm:rounded-lg sm:border-(--sub-border-muted) sm:bg-white sm:text-sm sm:text-(--sub-ink-primary) dark:sm:border-(--sub-border-strong) dark:sm:bg-transparent dark:sm:text-white'
const filledBtnCls =
	'h-14 w-full rounded-[12px] bg-(--sub-brand-primary) text-[16px] leading-5 font-medium text-white sm:h-10 sm:rounded-lg sm:text-sm'

function PricingCardCta({
	card,
	isCurrentPlan,
	isTrial,
	isCancelPending,
	isAuthenticated,
	canUpgradeCycle,
	isUpgradeTier,
	isLowerTier,
	billingCycle,
	onPrimaryCtaClick,
	onSecondaryCtaClick,
	onUpgradeToYearly,
	onUpgradeTier,
	onStartTrial,
	onEndTrial,
	onRevertCancellation,
	isTrialAvailable,
	loading
}: {
	card: PricingCardData
	isCurrentPlan: boolean
	isTrial: boolean
	isCancelPending: boolean
	isAuthenticated: boolean
	canUpgradeCycle: boolean
	isUpgradeTier: boolean
	isLowerTier: boolean | '' | null | 0
	billingCycle: BillingCycle
} & PricingCardCallbacks) {
	/* ── Lower tier than current subscription: no CTA ── */
	if (isLowerTier) return null

	/* ── Current plan: show label + optional yearly upgrade ── */
	if (isCurrentPlan) {
		return (
			<>
				<p className="mt-4 text-center text-[16px] leading-5 font-medium text-(--sub-brand-primary) sm:text-sm dark:text-(--sub-brand-secondary)">
					{isTrial ? 'Current Plan (trial)' : 'Current Plan'}
				</p>
				{isCancelPending ? (
					<div className="flex flex-col gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
						<p className="text-center text-[13px] leading-5 font-medium text-yellow-500">Cancellation scheduled</p>
						<p className="text-center text-[12px] leading-4 text-(--sub-text-muted)">
							Your plan stays active until the end of the billing period.
						</p>
						<button
							type="button"
							className="mt-1 text-[13px] leading-5 font-medium text-(--sub-brand-primary) underline hover:text-(--sub-brand-secondary)"
							onClick={onRevertCancellation}
						>
							Revert Cancellation
						</button>
					</div>
				) : null}
				{isTrial ? (
					<button type="button" className={filledBtnCls} onClick={onEndTrial}>
						Upgrade to Full Access
					</button>
				) : null}
				{canUpgradeCycle && !isCancelPending ? (
					<>
						<button type="button" className={filledBtnCls} onClick={() => onUpgradeToYearly?.(card.key)}>
							Upgrade to Yearly
						</button>
						<p className="text-center text-[12px] leading-4 text-(--sub-text-slate-400) dark:text-(--sub-text-muted)">
							Switch to annual billing and get 2 months free
						</p>
					</>
				) : null}
			</>
		)
	}

	/* ── Higher-tier upgrade ── */
	if (isUpgradeTier) {
		if (card.key === 'enterprise') {
			return (
				<a href="mailto:sales@defillama.com" className={`${filledBtnCls} flex items-center justify-center`}>
					Contact Us
				</a>
			)
		}
		return (
			<button
				type="button"
				className={filledBtnCls}
				onClick={() => onUpgradeTier?.(card.key)}
				disabled={loading === 'stripe'}
			>
				{loading === 'stripe' ? 'Processing...' : `Upgrade to ${card.title} with Card`}
			</button>
		)
	}

	/* ── Default: standard CTAs ── */
	return (
		<>
			{card.key === 'pro' && isTrialAvailable ? (
				<>
					<button type="button" className={outlineBtnCls} onClick={onStartTrial}>
						Free trial for 7 days
					</button>
					<p className="text-center text-[11px] leading-4 text-(--sub-text-slate-400) dark:text-(--sub-text-muted)">
						Trial includes 3 deep research questions/day and 1 CSV download
					</p>
				</>
			) : null}
			{card.secondaryCta && billingCycle === 'monthly' ? (
				<button
					type="button"
					className={outlineBtnCls}
					onClick={() => onSecondaryCtaClick?.(card.key)}
					disabled={loading === 'llamapay'}
				>
					{loading === 'llamapay' ? 'Processing...' : card.secondaryCta}
				</button>
			) : null}
			<button
				type="button"
				className={filledBtnCls}
				onClick={() => onPrimaryCtaClick?.(card.key)}
				disabled={loading === 'stripe'}
			>
				{loading === 'stripe' ? 'Processing...' : card.primaryCta}
			</button>
			{!isAuthenticated && card.key !== 'free' && card.key !== 'enterprise' ? (
				<button
					type="button"
					className="text-[13px] leading-5 text-(--sub-text-slate-400) underline hover:text-(--sub-brand-primary) dark:text-(--sub-text-muted) dark:hover:text-(--sub-brand-secondary)"
					onClick={() => onPrimaryCtaClick?.('free')}
				>
					Already a subscriber? Sign In
				</button>
			) : null}
		</>
	)
}

/* ── PricingCard (responsive) ───────────────────────────────────────── */

export function PricingCard({
	card,
	isCurrentPlan = false,
	isTrial = false,
	isCancelPending = false,
	isAuthenticated = false,
	currentPlan = null,
	billingCycle = 'monthly',
	userBillingCycle = null,
	onPrimaryCtaClick,
	onSecondaryCtaClick,
	onUpgradeToYearly,
	onUpgradeTier,
	onStartTrial,
	onEndTrial,
	onRevertCancellation,
	isTrialAvailable,
	loading
}: {
	card: PricingCardData
	isCurrentPlan?: boolean
	isTrial?: boolean
	isCancelPending?: boolean
	isAuthenticated?: boolean
	currentPlan?: PlanKey | null
	billingCycle?: BillingCycle
	userBillingCycle?: BillingCycle | null
} & PricingCardCallbacks) {
	const canUpgradeCycle = isCurrentPlan && userBillingCycle === 'monthly'
	const isUpgradeTier =
		isAuthenticated &&
		currentPlan &&
		currentPlan !== 'free' &&
		!isCurrentPlan &&
		card.key !== 'free' &&
		PLAN_TIER[card.key] > PLAN_TIER[currentPlan]
	const isLowerTier =
		isAuthenticated &&
		currentPlan &&
		currentPlan !== 'free' &&
		!isCurrentPlan &&
		PLAN_TIER[card.key] < PLAN_TIER[currentPlan]
	const isHighlighted = card.highlighted === true
	const wrapperClass = isHighlighted ? cardWrapperStyles.highlighted : cardWrapperStyles.default
	const shellClass = isHighlighted ? cardShellStyles.highlighted : cardShellStyles.default
	const innerClass = isHighlighted ? cardInnerStyles.highlighted : cardInnerStyles.default
	const contentWidth = ''
	const badgeSlotClass = card.recommendedLabel
		? 'flex items-center justify-center text-center'
		: 'hidden sm:flex sm:h-[17px] sm:items-center sm:justify-center sm:opacity-0'

	return (
		<div className={wrapperClass}>
			<div className={shellClass}>
				<div className={innerClass}>
					<div className={`mx-auto flex flex-col gap-7 sm:gap-5 ${contentWidth}`}>
						<div className="flex flex-col gap-2 sm:min-h-[104px] sm:gap-3">
							<h3 className="text-[18px] leading-[22px] font-semibold text-(--sub-text-slate-950) sm:text-(--sub-ink-primary) dark:text-white dark:sm:text-white">
								{card.title}
							</h3>
							{card.priceMain ? (
								<div className="flex flex-col gap-1 sm:gap-0">
									<div className="flex items-end gap-0.5">
										<p className="bg-linear-to-r from-(--sub-brand-primary) to-(--sub-text-navy-900) bg-clip-text text-[40px] leading-[40px] font-semibold text-transparent sm:text-[32px] sm:leading-[42px] dark:from-(--sub-brand-secondary) dark:to-(--sub-brand-softest)">
											{card.priceMain}
										</p>
										<p className="text-[16px] leading-6 text-(--sub-text-slate-600) sm:text-base sm:text-(--sub-text-secondary) dark:text-(--sub-text-secondary-dark) dark:sm:text-(--sub-text-secondary-dark)">
											{card.priceUnit}
										</p>
									</div>
									{card.priceSecondary ? (
										<p className="text-[22px] leading-6 text-(--sub-text-slate-400) sm:text-[16px] dark:text-(--sub-text-muted)">
											{card.priceSecondary}
										</p>
									) : null}
								</div>
							) : null}
							{card.description ? (
								<p className="text-[16px] leading-6 text-(--sub-text-slate-800) sm:text-[12px] sm:leading-4 sm:text-(--sub-text-secondary) dark:text-(--sub-text-primary-dark) dark:sm:text-(--sub-text-primary-dark)">
									{card.description}
								</p>
							) : null}
						</div>

						{card.includedTierText ? (
							<ul className="flex flex-col gap-3 sm:gap-2">
								<FeatureBullet item={{ label: card.includedTierText, availability: 'check' }} />
							</ul>
						) : null}

						{card.sections.map((section) => (
							<div key={`${card.key}-${section.title}`} className="flex flex-col gap-3">
								<h4 className="text-[20px] leading-7 font-semibold text-(--sub-text-slate-950) sm:text-[16px] sm:leading-5 sm:font-medium sm:text-(--sub-ink-primary) dark:text-white dark:sm:text-white">
									{section.title}
								</h4>
								<ul className="flex flex-col gap-3 sm:gap-2">
									{section.items.map((item) => (
										<FeatureBullet key={`${card.key}-${section.title}-${item.label}`} item={item} />
									))}
								</ul>
							</div>
						))}
					</div>

					<div className={`mx-auto mt-7 flex w-full flex-col gap-4 sm:mt-5 sm:gap-3 ${contentWidth}`}>
						<PricingCardCta
							card={card}
							isCurrentPlan={isCurrentPlan}
							isTrial={isTrial}
							isCancelPending={isCancelPending}
							isAuthenticated={isAuthenticated}
							canUpgradeCycle={canUpgradeCycle}
							isUpgradeTier={isUpgradeTier}
							isLowerTier={isLowerTier}
							billingCycle={billingCycle}
							onPrimaryCtaClick={onPrimaryCtaClick}
							onSecondaryCtaClick={onSecondaryCtaClick}
							onUpgradeToYearly={onUpgradeToYearly}
							onUpgradeTier={onUpgradeTier}
							onStartTrial={onStartTrial}
							onEndTrial={onEndTrial}
							onRevertCancellation={onRevertCancellation}
							isTrialAvailable={isTrialAvailable}
							loading={loading}
						/>
					</div>
				</div>
			</div>

			{card.recommendedLabel ? (
				<div className={badgeSlotClass}>
					<div className="text-center text-[14px] leading-[17px] font-medium text-(--sub-brand-softest)">
						{card.recommendedLabel}
					</div>
				</div>
			) : (
				<div className={badgeSlotClass} aria-hidden="true" />
			)}
		</div>
	)
}

/* ── ComparisonCell (responsive) ────────────────────────────────────── */

export function ComparisonCell({
	value,
	plan,
	isSelected = false,
	className = '',
	hideBorderLeft = false
}: {
	value: Availability
	plan: PlanKey
	isSelected?: boolean
	className?: string
	hideBorderLeft?: boolean
}) {
	const selectedStyle = isSelected ? `relative z-10 ${selectedColumnStyles.active}` : selectedColumnStyles.inactive
	const borderColor =
		'border-(--sub-border-slate-150) dark:border-(--sub-surface-elevated-2) md:border-(--sub-border-light) dark:md:border-(--sub-surface-elevated-2)'
	const borderEnd = plan === 'enterprise' ? 'border-r' : ''
	const isIncluded = value === 'check'

	return (
		<div
			role="cell"
			aria-label={isIncluded ? 'Included' : 'Not included'}
			className={`box-border flex w-[132px] shrink-0 items-center justify-center self-stretch ${isSelected || hideBorderLeft ? '' : 'border-l'} text-center md:w-[146px] ${borderColor} ${selectedStyle} ${borderEnd} ${className}`}
		>
			{isIncluded ? (
				<Icon name="check" height={24} width={24} className="text-(--sub-brand-secondary)" aria-hidden="true" />
			) : (
				<Icon
					name="minus"
					height={24}
					width={24}
					className="text-(--sub-text-slate-300) md:text-(--sub-border-muted) dark:text-(--sub-border-strong-muted) dark:md:text-(--sub-border-strong-muted)"
					aria-hidden="true"
				/>
			)}
		</div>
	)
}
