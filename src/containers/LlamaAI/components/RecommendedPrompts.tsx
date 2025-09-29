const defaultPrompts = ['Top 5 protocols by tvl', 'Recent hacks', 'Total amount raised by category']

export const RecommendedPrompts = ({
	setPrompt,
	submitPrompt,
	isPending
}: {
	setPrompt: (prompt: string) => void
	submitPrompt: (prompt: { userQuestion: string }) => void
	isPending: boolean
}) => {
	return (
		<div className="flex w-full flex-wrap items-center justify-center gap-2.5">
			{defaultPrompts.map((prompt) => (
				<button
					key={prompt}
					onClick={() => {
						setPrompt(prompt)
						submitPrompt({ userQuestion: prompt })
					}}
					disabled={isPending}
					className="flex items-center justify-center gap-2 rounded-lg border border-[#e6e6e6] px-4 py-1 text-[#666] hover:bg-[#e6e6e6] hover:text-black focus-visible:bg-[#e6e6e6] focus-visible:text-black dark:border-[#222324] dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white dark:focus-visible:bg-[#222324] dark:focus-visible:text-white"
				>
					{prompt}
				</button>
			))}
		</div>
	)
}
