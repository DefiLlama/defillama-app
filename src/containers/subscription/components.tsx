import { Icon } from '~/components/Icon'
import type { Availability, FeatureItem, PlanKey, PricingCardData } from '~/containers/subscription/types'

function FeatureBullet({ item, mobile = false }: { item: FeatureItem; mobile?: boolean }) {
	const highlightPrefix = item.highlightText ? item.label.split(':')[0] : null
	const highlightSuffix = item.highlightText ? item.label.slice((highlightPrefix?.length ?? 0) + 1).trim() : null
	const iconSize = mobile ? 24 : 20
	const textClass = mobile ? 'text-[16px] leading-6' : 'pt-0.5 text-[12px] leading-4'

	return (
		<li className="flex items-start gap-2">
			<span className="shrink-0">
				{item.availability === 'check' ? (
					<Icon name="check" height={iconSize} width={iconSize} className="text-(--sub-c-4b86db)" />
				) : (
					<Icon
						name="minus"
						height={iconSize}
						width={iconSize}
						className="text-(--sub-c-8c9aaf) dark:text-(--sub-c-5f6369)"
					/>
				)}
			</span>
			{item.highlightText ? (
				<span
					className={`bg-linear-to-r from-(--sub-c-1f67d2) to-(--sub-c-6e9ddf) dark:from-(--sub-c-4b86db) dark:to-(--sub-c-a5c3ed) bg-clip-text text-transparent ${textClass}`}
				>
					<span className="underline">{highlightPrefix}</span>
					{highlightSuffix ? `: ${highlightSuffix}` : ''}
				</span>
			) : (
				<span
					className={`${textClass} ${item.availability === 'check' ? 'text-(--sub-c-090b0c) dark:text-(--sub-c-f6f7f9)' : 'text-(--sub-c-878787) dark:text-(--sub-c-71757c)'}`}
				>
					{item.label}
				</span>
			)}
		</li>
	)
}

export function PricingCardDesktop({ card }: { card: PricingCardData }) {
	const isHighlighted = card.highlighted === true
	const cardInnerWidth = card.key === 'pro' ? 'w-[248px]' : 'w-[252px]'
	const wrapperClass = isHighlighted
		? 'relative h-[598px] w-[284px] rounded-[24px] bg-(--sub-c-1f67d2) p-[2px]'
		: 'relative h-[557px] w-[284px]'
	const cardClass = isHighlighted
		? 'flex h-[557px] flex-col justify-between overflow-hidden rounded-[22px] px-4 py-6 bg-white dark:bg-(--sub-c-131516)'
		: 'flex h-full flex-col justify-between overflow-hidden rounded-[24px] border px-4 py-6 border-(--sub-c-dedede) bg-white dark:border-(--sub-c-2f3336) dark:bg-(--sub-c-131516)'

	return (
		<div className={wrapperClass}>
			<div className={cardClass}>
				<div className={`mx-auto flex flex-col gap-5 ${cardInnerWidth}`}>
					<div className="flex min-h-[104px] flex-col gap-3">
						<h3 className="text-[18px] leading-[22px] font-semibold text-(--sub-c-090b0c) dark:text-white">{card.title}</h3>
						{card.priceMain ? (
							<div className="flex items-end gap-0.5">
								<p className="bg-linear-to-r from-(--sub-c-1f67d2) to-(--sub-c-5f95e2) dark:from-(--sub-c-4b86db) dark:to-(--sub-c-a5c3ed) bg-clip-text text-[42px] leading-[42px] font-semibold text-transparent">
									{card.priceMain}
								</p>
								<p className="text-base leading-6 text-(--sub-c-484848) dark:text-(--sub-c-c6c6c6)">{card.priceUnit}</p>
							</div>
						) : null}
						{card.priceSecondary ? <p className="text-[24px] leading-6 text-(--sub-c-878787)">{card.priceSecondary}</p> : null}
						{card.description ? <p className="text-[12px] leading-4 text-(--sub-c-484848) dark:text-(--sub-c-f6f7f9)">{card.description}</p> : null}
					</div>

					{card.includedTierText ? (
						<ul className="flex flex-col gap-2">
							<FeatureBullet item={{ label: card.includedTierText, availability: 'check' }} />
						</ul>
					) : null}

					{card.sections.map((section) => (
						<div key={`${card.key}-${section.title}`} className="flex flex-col gap-3">
							<h4 className="text-[16px] leading-5 font-medium text-(--sub-c-090b0c) dark:text-white">{section.title}</h4>
							<ul className="flex flex-col gap-2">
								{section.items.map((item) => (
									<FeatureBullet key={`${card.key}-${section.title}-${item.label}`} item={item} />
								))}
							</ul>
						</div>
					))}
				</div>

				<div className={`mx-auto flex w-full flex-col gap-3 ${cardInnerWidth}`}>
					{card.secondaryCta ? (
						<button
							type="button"
							className="h-10 w-full rounded-lg border border-(--sub-c-dedede) bg-white text-sm font-medium text-(--sub-c-090b0c) dark:border-(--sub-c-2f3336) dark:text-white"
						>
							{card.secondaryCta}
						</button>
					) : null}
					<button type="button" className="h-10 w-full rounded-lg bg-(--sub-c-1f67d2) text-sm font-medium text-white">
						{card.primaryCta}
					</button>
				</div>
			</div>

			{card.recommendedLabel ? (
				<div className="absolute right-0 bottom-0 left-0 flex h-[39px] items-center justify-center rounded-b-[24px] bg-(--sub-c-1f67d2) text-[14px] font-medium text-(--sub-c-a5c3ed)">
					{card.recommendedLabel}
				</div>
			) : null}
		</div>
	)
}

export function ComparisonCellDesktop({ value, plan }: { value: Availability; plan: PlanKey }) {
	const isPro = plan === 'pro'
	const cellBase = 'flex h-full w-[146px] items-center justify-center border-l text-center border-(--sub-c-eeeeee) dark:border-(--sub-c-232628)'

	return (
		<div
			className={`${cellBase} ${isPro ? 'border-x border-(--sub-c-1f67d2) bg-(--sub-c-1f67d214) dark:bg-(--sub-c-1f67d20d)' : ''} ${plan === 'enterprise' ? 'border-r' : ''}`}
		>
			{value === 'check' ? (
				<Icon name="check" height={24} width={24} className="text-(--sub-c-4b86db)" />
			) : (
				<Icon name="minus" height={24} width={24} className="text-(--sub-c-dedede) dark:text-(--sub-c-4d5158)" />
			)}
		</div>
	)
}

export function getPlanMeta(plan: PlanKey) {
	if (plan === 'free') return { title: 'Free', price: '$0/month', action: 'Get Started' }
	if (plan === 'pro') return { title: 'Pro', price: '$49/month', action: 'Get Started' }
	if (plan === 'api') return { title: 'API', price: '$300/month', action: 'Get Started' }
	return { title: 'Enterprise', price: 'Custom', action: 'Contact us' }
}

export function PricingCardMobile({ card }: { card: PricingCardData }) {
	const isHighlighted = card.highlighted === true

	return (
		<div
			className={`relative ${isHighlighted ? 'rounded-[24px] bg-(--sub-c-1f67d2) p-[2px] pb-12' : 'rounded-[24px] border border-(--sub-c-ced8e6) bg-white dark:border-(--sub-c-2f3336) dark:bg-(--sub-c-131516)'}`}
		>
			<div className={`rounded-[22px] px-5 py-6 ${isHighlighted ? '' : 'rounded-[24px]'} bg-white dark:bg-(--sub-c-131516)`}>
				<div className="flex flex-col gap-7">
					<div className="flex flex-col gap-7">
						<div className="flex flex-col gap-2">
							<h3 className="text-[18px] leading-[22px] font-semibold text-(--sub-c-0f172a) dark:text-white">{card.title}</h3>
							{card.priceMain ? (
								<div className="flex flex-col gap-1">
									<div className="flex items-end gap-0.5">
										<p className="bg-linear-to-r from-(--sub-c-1f67d2) to-(--sub-c-6e9ddf) dark:from-(--sub-c-4b86db) dark:to-(--sub-c-a5c3ed) bg-clip-text text-[42px] leading-[42px] font-semibold text-transparent">
											{card.priceMain}
										</p>
										<p className="text-[16px] leading-6 text-(--sub-c-64758c) dark:text-(--sub-c-c6c6c6)">{card.priceUnit}</p>
									</div>
									{card.priceSecondary ? <p className="text-[24px] leading-6 text-(--sub-c-8a97aa) dark:text-(--sub-c-878787)">{card.priceSecondary}</p> : null}
								</div>
							) : null}
							{card.description ? <p className="text-[16px] leading-6 text-(--sub-c-334155) dark:text-(--sub-c-f6f7f9)">{card.description}</p> : null}
						</div>

						{card.includedTierText ? (
							<ul className="flex flex-col gap-3">
								<FeatureBullet item={{ label: card.includedTierText, availability: 'check' }} mobile />
							</ul>
						) : null}

						{card.sections.map((section) => (
							<div key={`${card.key}-mobile-${section.title}`} className="flex flex-col gap-3">
								<h4 className="text-[20px] leading-7 font-semibold text-(--sub-c-0f172a) dark:text-white">{section.title}</h4>
								<ul className="flex flex-col gap-3">
									{section.items.map((item) => (
										<FeatureBullet key={`${card.key}-mobile-${section.title}-${item.label}`} item={item} mobile />
									))}
								</ul>
							</div>
						))}
					</div>

					<div className="flex flex-col gap-4">
						{card.secondaryCta ? (
							<button
								type="button"
								className="h-14 w-full rounded-[12px] border border-(--sub-c-ced8e6) bg-(--sub-c-f8fafd) text-[16px] leading-5 font-medium text-(--sub-c-1e293b) dark:border-(--sub-c-2f3336) dark:text-white"
							>
								{card.secondaryCta}
							</button>
						) : null}
						<button type="button" className="h-14 w-full rounded-[12px] bg-(--sub-c-1f67d2) text-[16px] leading-5 font-medium text-white">
							{card.primaryCta}
						</button>
					</div>
				</div>
			</div>

			{card.recommendedLabel ? (
				<div className="absolute right-0 bottom-0 left-0 flex h-10 items-center justify-center rounded-b-[24px] bg-(--sub-c-1f67d2) text-[16px] leading-5 font-medium text-(--sub-c-a5c3ed)">
					{card.recommendedLabel}
				</div>
			) : null}
		</div>
	)
}

export function ComparisonCellMobile({ value, plan }: { value: Availability; plan: PlanKey }) {
	const isPro = plan === 'pro'

	return (
		<div
			className={`flex h-full w-[132px] items-center justify-center border-l text-center border-(--sub-c-cad6e4) dark:border-(--sub-c-232628) ${isPro ? 'border-x border-(--sub-c-1f67d2) bg-(--sub-c-1f67d214) dark:bg-(--sub-c-1f67d20d)' : ''} ${plan === 'enterprise' ? 'border-r' : ''}`}
		>
			{value === 'check' ? (
				<Icon name="check" height={24} width={24} className="text-(--sub-c-4b86db)" />
			) : (
				<Icon name="minus" height={24} width={24} className="text-(--sub-c-90a0b6) dark:text-(--sub-c-4d5158)" />
			)}
		</div>
	)
}
