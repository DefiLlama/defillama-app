import Link from 'next/link'
import React from 'react'
import { TitleLine } from '~/containers/Articles/landing/TitleLine'
import { articleHref } from '~/containers/Articles/landing/utils'
import type { ArticleDocument } from '~/containers/Articles/types'

const NAV_ITEMS: Array<{ id: string; label: string; anchor: string }> = [
	{ id: 'spotlight', label: 'Spotlight', anchor: '#spotlight' },
	{ id: 'interviews', label: 'Interviews', anchor: '#interviews' },
	{ id: 'reports', label: 'Reports', anchor: '#reports' },
	{ id: 'insights', label: 'Insights', anchor: '#insights' },
	{ id: 'clients', label: 'Trusted by', anchor: '#clients' },
	{ id: 'collections', label: 'Collections', anchor: '#collections' }
]

type TitlePlacement = 'bottom' | 'right50' | 'right33'

function TitleOverlay({
	title,
	placement
}: Readonly<{
	title: string
	placement: TitlePlacement
}>) {
	const base = 'absolute z-20 bg-[#0C2956]/70 p-[16px] text-[16px] font-semibold leading-[150%] text-white'

	const titleClamp = 'line-clamp-3 lg:line-clamp-4'

	if (placement === 'bottom') {
		return (
			<div className={`${base} right-0 bottom-0 left-0 flex min-h-[110px] w-full items-start`}>
				<div className={`w-full ${titleClamp}`}>{title}</div>
			</div>
		)
	}

	if (placement === 'right33') {
		return (
			<div
				className={`${base} top-auto right-0 bottom-0 left-0 flex min-h-[110px] w-full items-start text-left lg:top-0 lg:right-0 lg:bottom-0 lg:left-auto lg:w-1/3`}
			>
				<div className={`w-full ${titleClamp}`}>{title}</div>
			</div>
		)
	}

	return (
		<div
			className={`${base} top-auto right-0 bottom-0 left-0 flex min-h-[110px] w-full items-start text-left lg:top-0 lg:right-0 lg:bottom-0 lg:left-auto lg:w-1/2`}
		>
			<div className={`w-full ${titleClamp}`}>{title}</div>
		</div>
	)
}

type NormalizedItem = {
	_key: string
	label: string
	title: string
	image?: string
	href: string
}

function normalizeItem(article: ArticleDocument, index: number): NormalizedItem | null {
	const label = article.tags?.[0]?.replace(/-/g, ' ') ?? 'Research'
	return {
		_key: `${article.id}-${index}`,
		label: label.toUpperCase(),
		title: article.title,
		image: article.coverImage?.url,
		href: articleHref(article)
	}
}

const ContentCard = ({
	item,
	titlePlacement,
	className = ''
}: {
	item: NormalizedItem
	titlePlacement: TitlePlacement
	className?: string
}) => (
	<Link href={item.href} className={`group relative flex flex-col overflow-hidden rounded-[16px] ${className}`}>
		<div className="absolute inset-0">
			{item.image ? (
				<div className="relative h-full w-full">
					<img
						src={item.image}
						alt=""
						className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						loading="lazy"
						decoding="async"
					/>
				</div>
			) : null}
		</div>

		<span className="absolute top-[12px] left-[12px] rounded-[4px] border border-white px-[8px] py-[2px] text-[10px] font-semibold text-white uppercase backdrop-blur-sm">
			{item.label}
		</span>

		<TitleOverlay title={item.title} placement={titlePlacement} />
	</Link>
)

interface ResearchLatestProps {
	articles?: ArticleDocument[]
}

export const ResearchLatest: React.FC<ResearchLatestProps> = ({ articles = [] }) => {
	const normalized = articles
		.slice(0, 6)
		.map((a, i) => normalizeItem(a, i))
		.filter(Boolean) as NormalizedItem[]

	if (normalized.length === 0) return null

	const [item1, item2, item3, item4, item5, item6] = normalized

	return (
		<div>
			<div className="mb-[32px]">
				<TitleLine title="Latest from DefiLlama Research" />
			</div>

			<div className="mb-[16px] grid grid-cols-1 gap-[12px] lg:mb-[32px] lg:grid-cols-2 lg:gap-[20px]">
				<div className="flex flex-col gap-[12px] lg:h-[490px] lg:flex-row lg:gap-[20px]">
					{item1 ? (
						<div className="h-[200px] w-full lg:h-full lg:w-1/2">
							<ContentCard item={item1} titlePlacement="bottom" className="h-full" />
						</div>
					) : null}
					<div className="flex w-full gap-[12px] lg:flex lg:h-full lg:w-1/2 lg:flex-col lg:gap-[20px]">
						{item2 ? (
							<div className="h-[250px] w-1/2 lg:h-[calc((100%-20px)*286/473)] lg:w-full">
								<ContentCard item={item2} titlePlacement="bottom" className="h-full" />
							</div>
						) : null}
						{item3 ? (
							<div className="h-[250px] w-1/2 lg:h-[calc((100%-20px)*187/473)] lg:w-full">
								<ContentCard item={item3} titlePlacement="right50" className="h-full" />
							</div>
						) : null}
					</div>
				</div>

				<div className="flex flex-col gap-[12px] lg:h-full lg:gap-[20px]">
					<div className="flex gap-[12px] lg:h-[calc((100%-20px)*211/474)] lg:gap-[20px]">
						{item4 ? (
							<div className="h-[250px] w-1/2 lg:h-full">
								<ContentCard item={item4} titlePlacement="bottom" className="h-full" />
							</div>
						) : null}
						{item5 ? (
							<div className="h-[250px] w-1/2 lg:h-full">
								<ContentCard item={item5} titlePlacement="bottom" className="h-full" />
							</div>
						) : null}
					</div>
					{item6 ? (
						<div className="h-[250px] w-full lg:h-[calc((100%-20px)*263/474)]">
							<ContentCard item={item6} titlePlacement="bottom" className="h-full" />
						</div>
					) : null}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-[12px] lg:flex lg:flex-wrap lg:justify-start">
				{NAV_ITEMS.map((cat) => (
					<Link
						key={cat.id}
						href={cat.anchor}
						className="w-full rounded-[4px] bg-[#D7E7FE] px-[15px] py-[3px] text-center text-[14px] font-medium text-[#3A8BFF] uppercase transition-colors hover:bg-[#0c2956]/10 lg:w-auto dark:border dark:border-white dark:bg-transparent dark:text-white"
					>
						{cat.label}
					</Link>
				))}
			</div>
		</div>
	)
}
