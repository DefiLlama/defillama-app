import Link from 'next/link'
import React from 'react'
import { ResearchIcon } from '~/components/ResearchIcon'
import { FEATURES_SERVER } from '~/constants'
import { ReportsCarousel } from '~/containers/Articles/landing/ReportsCarousel'
import type { ArticleDocument } from '~/containers/Articles/types'

interface ResearchHeroProps {
	title: React.ReactNode
	subtitle: React.ReactNode
	reports: ArticleDocument[]
}

export const ResearchHero: React.FC<ResearchHeroProps> = ({ title, subtitle, reports }) => {
	return (
		<div className="pt-[32px] text-white lg:pt-[45px]">
			<div>
				<div className="flex flex-col items-center">
					<img src="/assets/research_logo_dark.webp" alt="DefiLlama" width={229} height={72} />
					<h1 className="mt-[35px] mb-[12px] text-center text-[22px] leading-[130%] font-semibold lg:mb-[16px] lg:text-[32px]">
						{title}
					</h1>
					<h2 className="mb-[24px] text-center text-[16px] leading-[130%] font-light lg:mb-[35px] lg:text-[20px]">
						{subtitle}
					</h2>

					<div className="flex flex-col items-center gap-[36px] lg:flex-row">
						<div className="flex gap-[12px]">
							<a
								href="mailto:research@defillama.com"
								className="flex items-center rounded-full bg-white px-[14px] py-[12px] text-[16px] leading-[50%] text-[#237BFF] md:px-[24px] md:py-[14px]"
							>
								Contact us
							</a>
							<Link
								href="https://calendly.com/research-defillama/30min"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 rounded-full border border-white px-[14px] py-[12px] text-[16px] leading-[50%] text-white md:px-[24px] md:py-[14px]"
							>
								<span>Book a call</span>

								<ResearchIcon name="calendly-mark" width={28} height={29} className="text-white" aria-hidden />
							</Link>
						</div>

						<div className="flex gap-[7px]">
							<Link
								href="https://x.com/defillama_res"
								aria-label="Follow us on X"
								rel="noopener noreferrer"
								target="_blank"
							>
								<ResearchIcon name="x-social" width={36} height={36} className="text-white" aria-hidden />
							</Link>
							<Link
								href="https://t.me/defillama_research"
								aria-label="Follow us on Telegram"
								rel="noopener noreferrer"
								target="_blank"
							>
								<ResearchIcon name="telegram" width={36} height={36} className="text-white" aria-hidden />
							</Link>
							<Link
								href="https://www.linkedin.com/company/defillama/"
								aria-label="Follow us on LinkedIn"
								rel="noopener noreferrer"
								target="_blank"
							>
								<ResearchIcon name="linkedin" width={36} height={36} className="text-white" aria-hidden />
							</Link>
							<Link href="/research/feed" aria-label="Subscribe via RSS">
								<ResearchIcon name="rss" width={36} height={36} aria-hidden />
							</Link>
						</div>
					</div>
				</div>

				{reports.length > 0 ? (
					<div className="mt-[45px] w-full pb-[24px]">
						<ReportsCarousel reports={reports} showButtons={false} />
					</div>
				) : null}

				<div className="mt-[8px] mb-8 flex justify-center">
					<a
						href={`${FEATURES_SERVER}/uploads/media-kit.pdf`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-x-2 text-[16px] font-semibold tracking-wide uppercase"
						style={{ color: '#237BFF' }}
					>
						<span>Explore our media kit here</span>
						<span aria-hidden>→</span>
					</a>
				</div>
			</div>
		</div>
	)
}
