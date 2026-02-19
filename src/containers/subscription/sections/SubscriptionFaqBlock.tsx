import { useState } from 'react'
import { Icon } from '~/components/Icon'
import type { FaqItem } from '~/containers/subscription/types'

export function SubscriptionFaqBlock({ faqItems }: { faqItems: FaqItem[] }) {
	const [expandedQuestion, setExpandedQuestion] = useState<string | null>(faqItems[0]?.question ?? null)

	return (
		<div className="mt-16 w-full md:mt-32 md:w-[384px]">
			<h2 className="text-center text-[20px] leading-7 font-semibold text-(--sub-c-111f34) dark:text-white md:text-(--sub-c-090b0c) dark:md:text-white">
				Frequently Asked Questions
			</h2>
			<div className="mt-7 md:mt-9 md:flex md:flex-col md:gap-4">
				{faqItems.map((item, index) => {
					const questionId = `subscription-faq-question-${index}`
					const answerId = `subscription-faq-answer-${index}`
					const isExpanded = expandedQuestion === item.question

					return (
						<div
							key={item.question}
							className="border-b border-(--sub-mobile-table-border) py-4 md:border-(--sub-desktop-table-border) md:py-0 md:pb-4"
						>
							<button
								type="button"
								id={questionId}
								aria-expanded={isExpanded}
								aria-controls={answerId}
								onClick={() => setExpandedQuestion(isExpanded ? null : item.question)}
								className="flex w-full items-center justify-between gap-4 text-left"
							>
								<p className="text-[12px] leading-4 text-(--sub-c-111f34) dark:text-white md:text-(--sub-c-090b0c) dark:md:text-white">
									{item.question}
								</p>
								<Icon
									name={isExpanded ? 'minus' : 'plus'}
									height={16}
									width={16}
									className="text-(--sub-c-111f34) dark:text-white md:text-(--sub-c-090b0c) dark:md:text-white"
								/>
							</button>
							{isExpanded ? (
								<div id={answerId} role="region" aria-labelledby={questionId}>
									<p className="mt-2 text-xs leading-4 text-(--sub-c-484848) dark:text-(--sub-c-c6c6c6)">
										{item.answer}
									</p>
								</div>
							) : null}
						</div>
					)
				})}
			</div>
		</div>
	)
}
