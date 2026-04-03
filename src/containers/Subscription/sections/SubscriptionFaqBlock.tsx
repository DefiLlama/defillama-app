import { useState } from 'react'
import { Icon } from '~/components/Icon'
import type { FaqItem } from '~/containers/Subscription/types'

export function SubscriptionFaqBlock({ faqItems }: { faqItems: FaqItem[] }) {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(0)

	return (
		<div className="mt-16 w-full md:mt-32 md:w-[384px]">
			<h2 className="text-center text-2xl leading-8 font-semibold text-(--sub-text-navy-900) md:text-(--sub-ink-primary) dark:text-white dark:md:text-white">
				Frequently Asked Questions
			</h2>
			<div className="mt-7 md:mt-9 md:flex md:flex-col md:gap-4">
				{faqItems.map((item, index) => {
					const questionId = `subscription-faq-question-${index}`
					const answerId = `subscription-faq-answer-${index}`
					const isExpanded = expandedIndex === index

					return (
						<div
							key={index}
							className="border-b border-(--sub-mobile-table-border) py-4 md:border-(--sub-desktop-table-border) md:py-0 md:pb-4"
						>
							<button
								type="button"
								id={questionId}
								aria-expanded={isExpanded}
								aria-controls={answerId}
								onClick={() => setExpandedIndex(isExpanded ? null : index)}
								className="flex w-full items-center justify-between gap-4 text-left"
							>
								<p className="text-sm leading-5 text-(--sub-text-navy-900) md:text-base md:leading-6 md:text-(--sub-ink-primary) dark:text-white dark:md:text-white">
									{item.question}
								</p>
								<Icon
									name={isExpanded ? 'x' : 'plus'}
									height={18}
									width={18}
									className="shrink-0 text-(--sub-text-navy-900) md:text-(--sub-ink-primary) dark:text-white dark:md:text-white"
								/>
							</button>
							<div
								id={answerId}
								role="region"
								aria-labelledby={questionId}
								className={`grid transition-[grid-template-rows] duration-250 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
							>
								<div className="overflow-hidden">
									<p className="pt-2 text-sm leading-6 text-(--sub-text-secondary) dark:text-(--sub-text-secondary-dark) md:text-[15px] md:leading-7">
										{item.answer}
									</p>
								</div>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
