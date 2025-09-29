import { useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'

const defaultPrompts = ['Top 5 protocols by tvl', 'Recent hacks', 'Total amount raised by category']

const promptCategories = [
	{
		name: 'Trending',
		icon: 'trending-up'
	},
	{
		name: 'Protocols',
		icon: 'package'
	},
	{
		name: 'Blockchains',
		icon: 'link'
	},
	{
		name: 'Code',
		icon: 'code'
	},
	{
		name: 'Llama’s choice',
		icon: 'sparkles'
	},
	{
		name: 'See all',
		icon: 'layout-grid'
	}
] as const

async function getRecommendedPrompts() {
	try {
		return Object.fromEntries(promptCategories.map((category) => [category.name, defaultPrompts]))
	} catch (error) {
		console.log(error)
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch recommended prompts')
	}
}

export const RecommendedPrompts = ({
	setPrompt,
	submitPrompt,
	isPending
}: {
	setPrompt: (prompt: string) => void
	submitPrompt: (prompt: { userQuestion: string }) => void
	isPending: boolean
}) => {
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
	const { data, isLoading, error } = useQuery({
		queryKey: ['recommended-prompts'],
		queryFn: getRecommendedPrompts
	})
	return (
		<div className="relative flex w-full flex-wrap items-center justify-center gap-2.5">
			{promptCategories.map((category) => (
				<Ariakit.DisclosureProvider
					key={`prompt-category-${category.name}`}
					open={selectedCategory === category.name}
					setOpen={(open) => setSelectedCategory(open ? category.name : null)}
				>
					<Ariakit.Disclosure
						disabled={isPending}
						className="flex items-center justify-center gap-2.5 rounded-lg border border-[#e6e6e6] px-4 py-1 text-[#666] hover:bg-[#f7f7f7] hover:text-black focus-visible:bg-[#f7f7f7] focus-visible:text-black dark:border-[#222324] dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white dark:focus-visible:bg-[#222324] dark:focus-visible:text-white"
					>
						<Icon name={category.icon} height={16} width={16} />
						<span>{category.name}</span>
					</Ariakit.Disclosure>
					<Ariakit.DisclosureContent className="absolute top-0 left-0 w-full bg-(--cards-bg)">
						<div className="flex w-full flex-col rounded-lg border border-[#e6e6e6] bg-(--app-bg) text-black md:mx-auto md:max-w-[80dvh] dark:border-[#222324] dark:text-white">
							<div className="flex items-center justify-end gap-2.5 p-2.5 text-[#666] dark:text-[#919296]">
								<Icon name={category.icon} height={16} width={16} />
								<h1 className="mr-auto">{category.name}</h1>
								<button
									onClick={() => setSelectedCategory(null)}
									className="-m-2 rounded-tr-lg p-2 hover:bg-red-500/20 hover:text-red-500 focus-visible:bg-red-500/20 focus-visible:text-red-500"
								>
									<Icon name="x" height={16} width={16} />
									<span className="sr-only">Close</span>
								</button>
							</div>
							{isLoading ? (
								<div className="my-[40px] flex items-center justify-center p-2.5">
									<LoadingSpinner size={16} />
								</div>
							) : error || !data?.[category.name] || data?.[category.name].length === 0 ? (
								<div className="my-[40px] flex items-center justify-center gap-1 p-2.5 text-xs text-(--error)">
									<Icon name="alert-triangle" height={14} width={14} />
									<span>{error?.message ?? 'Failed to fetch recommended prompts'}</span>
								</div>
							) : (
								data?.[category.name]?.map((prompt) => (
									<button
										key={`${category.name}-${prompt}`}
										onClick={() => {
											setPrompt(prompt)
											submitPrompt({ userQuestion: prompt })
										}}
										disabled={isPending}
										className="w-full border-t border-[#e6e6e6] p-2.5 text-left last:rounded-b-lg hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white dark:border-[#222324]"
									>
										{prompt}
									</button>
								))
							)}
						</div>
					</Ariakit.DisclosureContent>
				</Ariakit.DisclosureProvider>
			))}
		</div>
	)
}
