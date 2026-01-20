import { useState } from 'react'
import { Icon, type IIcon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'

const ITEMS_PER_PAGE = 4

interface Category {
	key: string
	name: string
	icon: IIcon['name']
	prompts: string[]
}

interface PromptCarouselProps {
	categories: Category[]
	setPrompt: (prompt: string) => void
	submitPrompt: (prompt: { userQuestion: string }) => void
	isPending: boolean
	isLoading?: boolean
	error?: Error | null
}

export function PromptCarousel({
	categories,
	setPrompt,
	submitPrompt,
	isPending,
	isLoading,
	error
}: PromptCarouselProps) {
	const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
	const [currentPage, setCurrentPage] = useState(0)

	const safeIndex = categories.length > 0 ? Math.min(currentCategoryIndex, categories.length - 1) : 0
	const currentCategory = categories[safeIndex]
	const questions = currentCategory?.prompts || []
	const totalPages = Math.ceil(questions.length / ITEMS_PER_PAGE)
	const startIndex = currentPage * ITEMS_PER_PAGE
	const visibleQuestions = questions.slice(startIndex, startIndex + ITEMS_PER_PAGE)

	const handlePreviousCategory = () => {
		setCurrentCategoryIndex((prev) => (prev - 1 + categories.length) % categories.length)
		setCurrentPage(0)
	}

	const handleNextCategory = () => {
		setCurrentCategoryIndex((prev) => (prev + 1) % categories.length)
		setCurrentPage(0)
	}

	const handlePreviousPage = () => {
		setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)
	}

	const handleNextPage = () => {
		setCurrentPage((prev) => (prev + 1) % totalPages)
	}

	const handleClick = (question: string) => {
		setPrompt(question)
		submitPrompt({ userQuestion: question })
	}

	if (isLoading) {
		return (
			<div className="flex w-full flex-col pt-1">
				<Header
					category={{ key: '', name: 'Suggestions', icon: 'help-circle', prompts: [] }}
					totalCategories={0}
					onPreviousCategory={handlePreviousCategory}
					onNextCategory={handleNextCategory}
				/>
				<div className="flex min-h-[120px] items-center justify-center">
					<LoadingSpinner size={12} />
				</div>
			</div>
		)
	}

	if (error || categories.length === 0) {
		return (
			<div className="flex w-full flex-col pt-1">
				<Header
					category={{ key: '', name: 'Suggestions', icon: 'help-circle', prompts: [] }}
					totalCategories={0}
					onPreviousCategory={handlePreviousCategory}
					onNextCategory={handleNextCategory}
				/>
				<div className="flex min-h-[80px] items-center justify-center gap-1.5 text-[11px] text-[#a0a0a0] dark:text-[#555]">
					<Icon name="alert-triangle" height={11} width={11} className="opacity-60" />
					<span>{error?.message ?? 'Unable to load suggestions'}</span>
				</div>
			</div>
		)
	}

	return (
		<div className="flex w-full flex-col pt-1">
			<Header
				category={currentCategory}
				totalCategories={categories.length}
				onPreviousCategory={handlePreviousCategory}
				onNextCategory={handleNextCategory}
			/>
			<div className="flex flex-col">
				{visibleQuestions.map((question, idx) => (
					<button
						key={`${currentCategory.key}-${startIndex + idx}`}
						onClick={() => handleClick(question)}
						disabled={isPending}
						className="group relative flex w-full items-baseline gap-2.5 py-[7px] text-left transition-colors duration-150 first:pt-0 disabled:pointer-events-none disabled:opacity-40"
					>
						<span className="absolute left-0 top-1 bottom-1 w-px bg-[#2563eb]/0 transition-colors duration-150 group-hover:bg-[#2563eb]/30 dark:group-hover:bg-[#60a5fa]/25" />
						<span className="shrink-0 pt-px text-[10px] tracking-wide text-[#b0b0b0] transition-colors duration-150 group-hover:text-[#888] dark:text-[#505050] dark:group-hover:text-[#707070]">
							{currentCategory.name}
						</span>
						<span className="flex-1 truncate text-[13px] leading-snug text-[#707070] transition-colors duration-150 group-hover:text-[#404040] dark:text-[#808080] dark:group-hover:text-[#b0b0b0]">
							{question}
						</span>
						<Icon
							name="arrow-right"
							height={10}
							width={10}
							className="shrink-0 translate-x-0 opacity-0 transition-all duration-150 text-[#2563eb]/50 group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-[#60a5fa]/50"
						/>
					</button>
				))}
			</div>
			{totalPages > 1 && (
				<div className="mt-2.5 flex items-center justify-center gap-3">
					<button
						onClick={handlePreviousPage}
						className="flex h-5 w-5 items-center justify-center text-[#c0c0c0] transition-colors hover:text-[#808080] dark:text-[#404040] dark:hover:text-[#606060]"
						aria-label="Previous page"
					>
						<Icon name="chevron-left" height={11} width={11} />
					</button>
					<div className="flex items-center gap-1.5">
						{Array.from({ length: totalPages }).map((_, i) => (
							<button
								key={i}
								onClick={() => setCurrentPage(i)}
								className={`h-1 rounded-full transition-all duration-200 ${
									i === currentPage
										? 'w-3 bg-[#2563eb]/40 dark:bg-[#60a5fa]/30'
										: 'w-1 bg-[#d0d0d0] hover:bg-[#b0b0b0] dark:bg-[#303030] dark:hover:bg-[#404040]'
								}`}
								aria-label={`Page ${i + 1}`}
							/>
						))}
					</div>
					<button
						onClick={handleNextPage}
						className="flex h-5 w-5 items-center justify-center text-[#c0c0c0] transition-colors hover:text-[#808080] dark:text-[#404040] dark:hover:text-[#606060]"
						aria-label="Next page"
					>
						<Icon name="chevron-right" height={11} width={11} />
					</button>
				</div>
			)}
		</div>
	)
}

function Header({
	category,
	totalCategories,
	onPreviousCategory,
	onNextCategory
}: {
	category: Category
	totalCategories: number
	onPreviousCategory: () => void
	onNextCategory: () => void
}) {
	return (
		<div className="mb-2 flex items-center justify-between">
			<div className="flex items-center gap-1.5">
				<Icon name={category.icon} height={11} width={11} className="text-[#c0c0c0] dark:text-[#404040]" />
				<span className="text-[11px] font-medium tracking-wide text-[#a0a0a0] uppercase dark:text-[#505050]">
					{category.name}
				</span>
				{totalCategories > 1 && <span className="ml-0.5 text-[10px] text-[#d0d0d0] dark:text-[#353535]">·</span>}
			</div>
			{totalCategories > 1 && (
				<div className="flex items-center gap-0.5">
					<button
						onClick={onPreviousCategory}
						disabled={totalCategories <= 1}
						className="flex h-5 w-5 items-center justify-center text-[#c0c0c0] transition-colors hover:text-[#909090] disabled:opacity-30 dark:text-[#404040] dark:hover:text-[#606060]"
						aria-label="Previous category"
					>
						<Icon name="chevron-left" height={11} width={11} />
					</button>
					<button
						onClick={onNextCategory}
						disabled={totalCategories <= 1}
						className="flex h-5 w-5 items-center justify-center text-[#c0c0c0] transition-colors hover:text-[#909090] disabled:opacity-30 dark:text-[#404040] dark:hover:text-[#606060]"
						aria-label="Next category"
					>
						<Icon name="chevron-right" height={11} width={11} />
					</button>
				</div>
			)}
		</div>
	)
}
