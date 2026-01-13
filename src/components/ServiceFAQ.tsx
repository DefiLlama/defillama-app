import { useState } from 'react'
import { Icon } from '~/components/Icon'

interface FAQItem {
	id: string
	question: string
	answer: string
}

const faqItems: FAQItem[] = [
	{
		id: 'whats-included',
		question: "What's included in a DefiLlama Pro subscription?",
		answer:
			'Pro includes access to advanced dashboards, CSV downloads, custom columns, LlamaFeed premium insights, DefiLlama Sheets integration, and early access to new products. Free tier users get basic protocol data and general statistics.'
	},
	{
		id: 'data-sources',
		question: 'Where does your data come from?',
		answer:
			'We aggregate data directly from blockchain nodes, smart contracts, and verified protocol sources with multi-layer validation to ensure accuracy. All data points include source attribution for full transparency.'
	},
	{
		id: 'data-freshness',
		question: 'How often is the data updated?',
		answer:
			'Free tier data updates daily, Pro tier updates multiple times daily, and API/Enterprise tiers offer hourly or real-time updates. Custom refresh intervals available for Enterprise customers.'
	},
	{
		id: 'api-access',
		question: 'Do I get API access with Pro?',
		answer:
			'Pro tier includes dashboard and analysis tools but not API endpoints. API access requires our dedicated API tier (starting at $300/month) which provides programmatic access to all data.'
	},
	{
		id: 'who-uses',
		question: 'Who uses DefiLlama Pro?',
		answer:
			'Our users include DeFi traders, portfolio managers, research analysts, developers, and institutional investors who need advanced analytics and data export capabilities for decision-making.'
	},
	{
		id: 'free-vs-pro',
		question: 'What are the limitations of the free tier?',
		answer:
			'The free tier offers read-only access to basic protocol metrics with daily updates and no data exports. Pro removes these limitations with full feature access and multiple daily updates.'
	},
	{
		id: 'cancellation',
		question: 'Can I cancel anytime? What about refunds?',
		answer:
			'Yes, cancel your subscription anytime with no penalties. Monthly subscriptions can be canceled immediately, and we offer pro-rata refunds if you cancel mid-month.'
	}
]

export function ServiceFAQ() {
	const [expandedId, setExpandedId] = useState<string | null>(null)

	return (
		<div className="relative z-10 w-full py-20">
			{/* Centered container with max-width 700px */}
			<div className="mx-auto w-full max-w-[700px] px-5">
				{/* Section Header */}
				<div className="mb-12 text-center">
					<h2 className="text-3xl font-bold text-white mb-3">Frequently Asked Questions</h2>
					<p className="text-[#8a8c90] text-sm">
						Everything you need to know about DefiLlama Pro
					</p>
				</div>

				{/* FAQ Accordion - Single Column */}
				<div className="space-y-3 mb-12">
					{faqItems.map((item) => (
						<div
							key={item.id}
							className="group relative overflow-hidden rounded-xl border border-[#5C5CF9]/20 bg-gradient-to-br from-[#1a1f35]/40 to-[#0f1119]/40 backdrop-blur-sm transition-all duration-300 hover:border-[#5C5CF9]/40"
						>
							{/* Question Button */}
							<button
								onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
								className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left transition-colors hover:bg-white/5"
							>
								<span
									className={`text-sm font-semibold leading-snug transition-colors ${
										expandedId === item.id ? 'text-white' : 'text-[#c5c7cb] group-hover:text-white'
									}`}
								>
									{item.question}
								</span>
								<Icon
									name="chevron-down"
									height={18}
									width={18}
									className={`flex-shrink-0 text-[#5C5CF9] transition-transform duration-300 ${
										expandedId === item.id ? 'rotate-180' : ''
									}`}
								/>
							</button>

							{/* Answer - Collapsible */}
							<div
								className="overflow-hidden transition-all duration-300 ease-in-out"
								style={{
									maxHeight: expandedId === item.id ? '200px' : '0px'
								}}
							>
								<div className="px-6 pt-4 pb-4 pt-0">
									<p className="text-sm leading-relaxed text-[#8a8c90]">{item.answer}</p>
								</div>
							</div>

							{/* Subtle accent line at bottom */}
							<div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5C5CF9]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
						</div>
					))}
				</div>

				{/* CTA Footer */}
				<div className="text-center pt-8 border-t border-[#5C5CF9]/10">
					<p className="text-sm text-[#8a8c90] mb-5">Still have questions?</p>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
						<a
							href="https://api-docs.defillama.com/"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#5C5CF9]/30 text-[#5C5CF9] text-sm font-medium hover:bg-[#5C5CF9]/10 hover:border-[#5C5CF9]/50 transition-all"
						>
							<Icon name="file-text" height={16} width={16} />
							View Docs
						</a>
						<a
							href="mailto:sales@defillama.com"
							className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#5C5CF9] to-[#7B7BFF] text-white text-sm font-medium hover:shadow-lg hover:shadow-[#5C5CF9]/30 transition-all"
						>
							<Icon name="mail" height={16} width={16} />
							Contact Sales
						</a>
					</div>
				</div>
			</div>
		</div>
	)
}

