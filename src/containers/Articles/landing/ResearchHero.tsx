import Link from 'next/link'
import React from 'react'
import { ReportsCarousel } from '~/containers/Articles/landing/ReportsCarousel'
import type { ArticleDocument } from '~/containers/Articles/types'

interface ResearchHeroProps {
	title: React.ReactNode
	subtitle: React.ReactNode
	reports: ArticleDocument[]
}

export const TwitterIcon = () => (
	<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M18 0C27.9411 0 36 8.05887 36 18C36 27.9411 27.9411 36 18 36C8.05887 36 0 27.9411 0 18C0 8.05887 8.05887 0 18 0ZM15.1934 19.4326L8.08398 27.75H10.7988L16.4512 21.1367L21.3291 27.75H28.5L20.4502 16.835L27.1475 9H24.4336L19.1914 15.1309L14.6709 9H7.5L15.1934 19.4326ZM24.4023 25.667H22.3535L11.5977 11.083H13.6465L24.4023 25.667Z"
			fill="white"
		/>
	</svg>
)

const TelegramIcon = () => (
	<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<mask
			id="mask0_30_8403"
			style={{ maskType: 'luminance' }}
			maskUnits="userSpaceOnUse"
			x="0"
			y="0"
			width="36"
			height="36"
		>
			<path d="M0 0H36V36H0V0Z" fill="white" />
		</mask>
		<g mask="url(#mask0_30_8403)">
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M36 18C36 27.9405 27.9405 36 18 36C8.0595 36 0 27.9405 0 18C0 8.0595 8.0595 0 18 0C27.9405 0 36 8.0595 36 18ZM18.645 13.2885C16.895 14.0165 13.396 15.5235 8.148 17.8095C7.296 18.1485 6.8495 18.48 6.8085 18.804C6.7395 19.353 7.4265 19.569 8.3595 19.8615L8.754 19.9875C9.6735 20.286 10.9095 20.6355 11.5515 20.649C12.1345 20.661 12.7855 20.421 13.5045 19.929C18.4065 16.619 20.937 14.946 21.096 14.91C21.2085 14.8845 21.3645 14.8515 21.4695 14.946C21.5745 15.039 21.564 15.216 21.5535 15.264C21.4845 15.5535 18.7935 18.057 17.3985 19.353C16.9635 19.7565 16.656 20.043 16.593 20.109C16.45 20.254 16.309 20.3935 16.17 20.5275C15.315 21.3495 14.676 21.9675 16.206 22.9755C16.941 23.46 17.529 23.8605 18.1155 24.2595C18.756 24.696 19.395 25.131 20.223 25.674C20.433 25.814 20.6355 25.954 20.8305 26.094C21.576 26.6265 22.2465 27.1035 23.0745 27.0285C23.5545 26.9835 24.0525 26.532 24.3045 25.1835C24.9 21.9945 26.073 15.0885 26.3445 12.2415C26.3625 12.0051 26.3524 11.7675 26.3145 11.5335C26.2935 11.3441 26.2013 11.1698 26.0565 11.046C25.842 10.8705 25.509 10.833 25.359 10.836C24.6825 10.848 23.6445 11.2095 18.645 13.2885Z"
				fill="white"
			/>
		</g>
	</svg>
)

const BookCallIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={18} height={16} fill="none">
		<path
			fill="#fff"
			d="M4.426 9.326.362 7.899s-.487-.212-.331-.695c.032-.1.098-.185.29-.33C1.225 6.2 16.995.092 16.995.092s.444-.162.707-.054a.37.37 0 0 1 .17.116.4.4 0 0 1 .091.192q.044.19.037.386c-.002.112-.014.216-.024.38-.096 1.67-2.971 14.134-2.971 14.134s-.172.729-.787.754a1.06 1.06 0 0 1-.443-.081 1.1 1.1 0 0 1-.38-.261c-1.209-1.12-5.387-4.148-6.31-4.812a.2.2 0 0 1-.076-.136c-.013-.07.058-.157.058-.157s7.275-6.97 7.469-7.702c.015-.057-.042-.085-.118-.06-.482.192-8.86 5.893-9.784 6.522a.4.4 0 0 1-.207.014"
			opacity=".8"
		/>
	</svg>
)

export const ResearchHero: React.FC<ResearchHeroProps> = ({ title, subtitle, reports }) => {
	return (
		<div className="pt-[32px] text-white lg:pt-[45px]">
			<div>
				<div className="flex flex-col items-center">
					<img src="/assets/research_logo_white.webp" alt="DefiLlama" width={229} height={99} />
					<h1 className="mt-[35px] mb-[12px] text-center text-[22px] leading-[130%] font-semibold lg:mb-[16px] lg:text-[32px]">
						{title}
					</h1>
					<h2 className="mb-[24px] text-center text-[16px] leading-[130%] font-light lg:mb-[35px] lg:text-[20px]">
						{subtitle}
					</h2>

					<div className="flex flex-col items-center gap-[36px] lg:flex-row">
						<div className="flex space-x-[12px]">
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
								className="flex items-center space-x-2 rounded-full border border-white px-[14px] py-[12px] text-[16px] leading-[50%] text-white md:px-[24px] md:py-[14px]"
							>
								<span>Book a call</span>

								<BookCallIcon />
							</Link>
						</div>

						<div className="flex space-x-[7px]">
							<Link
								href="https://x.com/defillama_res"
								aria-label="Follow us on X"
								rel="noopener noreferrer"
								target="_blank"
							>
								<TwitterIcon />
							</Link>
							<Link
								href="https://t.me/defillama_res"
								aria-label="Follow us on Telegram"
								rel="noopener noreferrer"
								target="_blank"
							>
								<TelegramIcon />
							</Link>
						</div>
					</div>
				</div>

				{reports.length > 0 ? (
					<div className="mt-[45px] w-full pb-[24px]">
						<ReportsCarousel reports={reports} showButtons={false} />
					</div>
				) : null}
			</div>
		</div>
	)
}
