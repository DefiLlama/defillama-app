import { Icon } from '~/components/Icon'
import type { Availability, FeatureItem, PlanKey, PricingCardData } from '~/containers/subscription/types'

/* ── Style maps ─────────────────────────────────────────────────────── */

const cardWrapperStyles = {
	highlighted: 'relative w-full rounded-[24px] bg-(--sub-c-1f67d2) p-[2px] pb-12 md:w-[284px] md:pb-[2px]',
	default:
		'relative w-full rounded-[24px] border border-(--sub-c-ced8e6) bg-white dark:border-(--sub-c-2f3336) dark:bg-(--sub-c-131516) md:w-[284px] md:border'
}

const cardInnerStyles = {
	highlighted:
		'rounded-[22px] px-5 py-6 bg-white dark:bg-(--sub-c-131516) md:flex md:flex-col md:justify-between md:overflow-hidden md:px-4',
	default:
		'rounded-[24px] px-5 py-6 bg-white dark:bg-(--sub-c-131516) md:flex md:flex-col md:justify-between md:overflow-hidden md:rounded-[24px] md:px-4'
}

const proColumnStyles = {
	active: 'border-x border-(--sub-c-1f67d2) bg-(--sub-c-1f67d214) dark:bg-(--sub-c-1f67d20d)',
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
					<Icon name="check" height={24} width={24} className="text-(--sub-c-4b86db) md:h-5 md:w-5" />
				) : (
					<Icon
						name="minus"
						height={24}
						width={24}
						className="text-(--sub-c-8c9aaf) dark:text-(--sub-c-5f6369) md:h-5 md:w-5"
					/>
				)}
			</span>
			{item.highlightText ? (
				<span className="bg-linear-to-r from-(--sub-c-1f67d2) to-(--sub-c-6e9ddf) dark:from-(--sub-c-4b86db) dark:to-(--sub-c-a5c3ed) bg-clip-text text-[16px] leading-6 text-transparent md:pt-0.5 md:text-[12px] md:leading-4">
					<span className="underline">{highlightPrefix}</span>
					{highlightSuffix ? `: ${highlightSuffix}` : ''}
				</span>
			) : (
				<span
					className={`text-[16px] leading-6 md:pt-0.5 md:text-[12px] md:leading-4 ${item.availability === 'check' ? 'text-(--sub-c-090b0c) dark:text-(--sub-c-f6f7f9)' : 'text-(--sub-c-878787) dark:text-(--sub-c-71757c)'}`}
				>
					{item.label}
				</span>
			)}
		</li>
	)
}

/* ── PricingCard (responsive) ───────────────────────────────────────── */

export function PricingCard({ card }: { card: PricingCardData }) {
	const isHighlighted = card.highlighted === true
	const wrapperClass = isHighlighted ? cardWrapperStyles.highlighted : cardWrapperStyles.default
	const innerClass = isHighlighted ? cardInnerStyles.highlighted : cardInnerStyles.default
	const contentWidth = card.key === 'pro' ? 'md:w-[248px]' : 'md:w-[252px]'

	return (
		<div className={wrapperClass}>
			<div className={innerClass}>
				<div className={`mx-auto flex flex-col gap-7 md:gap-5 ${contentWidth}`}>
					<div className="flex flex-col gap-2 md:min-h-[104px] md:gap-3">
						<h3 className="text-[18px] leading-[22px] font-semibold text-(--sub-c-0f172a) dark:text-white md:text-(--sub-c-090b0c)">
							{card.title}
						</h3>
						{card.priceMain ? (
							<div className="flex flex-col gap-1 md:gap-0">
								<div className="flex items-end gap-0.5">
									<p className="bg-linear-to-r from-(--sub-c-1f67d2) to-(--sub-c-6e9ddf) dark:from-(--sub-c-4b86db) dark:to-(--sub-c-a5c3ed) bg-clip-text text-[42px] leading-[42px] font-semibold text-transparent md:to-(--sub-c-5f95e2)">
										{card.priceMain}
									</p>
									<p className="text-[16px] leading-6 text-(--sub-c-64758c) dark:text-(--sub-c-c6c6c6) md:text-base md:text-(--sub-c-484848)">
										{card.priceUnit}
									</p>
								</div>
								{card.priceSecondary ? (
									<p className="text-[24px] leading-6 text-(--sub-c-8a97aa) dark:text-(--sub-c-878787)">
										{card.priceSecondary}
									</p>
								) : null}
							</div>
						) : null}
						{card.description ? (
							<p className="text-[16px] leading-6 text-(--sub-c-334155) dark:text-(--sub-c-f6f7f9) md:text-[12px] md:leading-4 md:text-(--sub-c-484848)">
								{card.description}
							</p>
						) : null}
					</div>

					{card.includedTierText ? (
						<ul className="flex flex-col gap-3 md:gap-2">
							<FeatureBullet item={{ label: card.includedTierText, availability: 'check' }} />
						</ul>
					) : null}

					{card.sections.map((section) => (
						<div key={`${card.key}-${section.title}`} className="flex flex-col gap-3">
							<h4 className="text-[20px] leading-7 font-semibold text-(--sub-c-0f172a) dark:text-white md:text-[16px] md:leading-5 md:font-medium md:text-(--sub-c-090b0c)">
								{section.title}
							</h4>
							<ul className="flex flex-col gap-3 md:gap-2">
								{section.items.map((item) => (
									<FeatureBullet key={`${card.key}-${section.title}-${item.label}`} item={item} />
								))}
							</ul>
						</div>
					))}
				</div>

				<div className={`mx-auto mt-7 flex w-full flex-col gap-4 md:mt-0 md:gap-3 ${contentWidth}`}>
					{card.secondaryCta ? (
						<button
							type="button"
							className="h-14 w-full rounded-[12px] border border-(--sub-c-ced8e6) bg-(--sub-c-f8fafd) text-[16px] leading-5 font-medium text-(--sub-c-1e293b) dark:border-(--sub-c-2f3336) dark:text-white md:h-10 md:rounded-lg md:border-(--sub-c-dedede) md:bg-white md:text-sm md:text-(--sub-c-090b0c)"
						>
							{card.secondaryCta}
						</button>
					) : null}
					<button
						type="button"
						className="h-14 w-full rounded-[12px] bg-(--sub-c-1f67d2) text-[16px] leading-5 font-medium text-white md:h-10 md:rounded-lg md:text-sm"
					>
						{card.primaryCta}
					</button>
				</div>
			</div>

			{card.recommendedLabel ? (
				<div className="absolute right-0 bottom-0 left-0 flex h-10 items-center justify-center rounded-b-[24px] bg-(--sub-c-1f67d2) text-[16px] leading-5 font-medium text-(--sub-c-a5c3ed) md:h-[39px] md:text-[14px]">
					{card.recommendedLabel}
				</div>
			) : null}
		</div>
	)
}

/* ── ComparisonCell (responsive) ────────────────────────────────────── */

export function ComparisonCell({ value, plan }: { value: Availability; plan: PlanKey }) {
	const isPro = plan === 'pro'
	const proStyle = isPro ? proColumnStyles.active : proColumnStyles.inactive
	const borderEnd = plan === 'enterprise' ? 'border-r' : ''

	return (
		<div
			className={`flex h-full w-[132px] items-center justify-center border-l text-center border-(--sub-c-cad6e4) dark:border-(--sub-c-232628) md:w-[146px] md:border-(--sub-c-eeeeee) ${proStyle} ${borderEnd}`}
		>
			{value === 'check' ? (
				<Icon name="check" height={24} width={24} className="text-(--sub-c-4b86db)" />
			) : (
				<Icon name="minus" height={24} width={24} className="text-(--sub-c-90a0b6) dark:text-(--sub-c-4d5158) md:text-(--sub-c-dedede)" />
			)}
		</div>
	)
}
