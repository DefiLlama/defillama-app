import { useState } from 'react'
import { Icon } from '~/components/Icon'

const FAQ_ITEMS: { question: string; answer: string }[] = [
	{
		question: 'Who is the team plan for?',
		answer:
			'Organizations and teams that want to share Pro or API access across multiple members from a single admin account. An admin purchases seats and assigns them to specific team members, so you do not need to maintain separate subscriptions per person.'
	},
	{
		question: 'What do I get by managing subscriptions through a team?',
		answer:
			'Centralized billing and seat management in one place. Admins can assign or reassign subscriptions between members at any time without creating or paying for individual accounts, and keep full control over who has access.'
	},
	{
		question: 'Can members keep their existing subscriptions?',
		answer:
			'No. A team member cannot have an active personal Pro or API subscription while holding a team-assigned seat of the same type. Cancel your individual subscription or wait for it to expire before joining a team.'
	},
	{
		question: 'Do I pay for unassigned seats?',
		answer:
			'Yes. You are billed for every seat you purchase, whether it is assigned to a member or not. If you do not plan to fill them, reduce your seat count from the Seats section — you cannot drop below the number of currently occupied seats.'
	}
]

export function TeamFaqCard({ defaultOpenIndex = 0 }: { defaultOpenIndex?: number | null } = {}) {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(defaultOpenIndex)

	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
			<div className="flex items-center gap-2">
				<Icon name="help-circle" height={20} width={20} className="text-(--sub-ink-primary) dark:text-white" />
				<span className="text-base leading-5 font-medium text-(--sub-ink-primary) dark:text-white">
					Frequently Asked Questions
				</span>
			</div>

			<div className="flex flex-col">
				{FAQ_ITEMS.map((item, index) => {
					const isExpanded = expandedIndex === index
					const questionId = `team-faq-question-${index}`
					const answerId = `team-faq-answer-${index}`
					const isLast = index === FAQ_ITEMS.length - 1

					return (
						<div
							key={index}
							className={`py-3 ${!isLast ? 'border-b border-(--sub-border-slate-100) dark:border-(--sub-border-strong)' : ''}`}
						>
							<button
								type="button"
								id={questionId}
								aria-expanded={isExpanded}
								aria-controls={answerId}
								onClick={() => setExpandedIndex(isExpanded ? null : index)}
								className="flex w-full items-center justify-between gap-4 text-left"
							>
								<p className="text-sm leading-5 text-(--sub-ink-primary) dark:text-white">{item.question}</p>
								<Icon
									name={isExpanded ? 'x' : 'plus'}
									height={16}
									width={16}
									className="shrink-0 text-(--sub-text-muted)"
								/>
							</button>
							<div
								id={answerId}
								role="region"
								aria-labelledby={questionId}
								className={`grid transition-[grid-template-rows] duration-250 ease-in-out ${
									isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
								}`}
							>
								<div className="overflow-hidden">
									<p className="pt-2 text-xs leading-5 text-(--sub-text-muted)">{item.answer}</p>
								</div>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
