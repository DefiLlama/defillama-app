interface TextTabProps {
	textTitle: string
	textContent: string
	onTextTitleChange: (title: string) => void
	onTextContentChange: (content: string) => void
}

export function TextTab({ textTitle, textContent, onTextTitleChange, onTextContentChange }: TextTabProps) {
	return (
		<div className="space-y-3 md:space-y-4">
			<div>
				<label className="block mb-1.5 md:mb-2 text-sm font-medium pro-text2">Title (Optional)</label>
				<input
					type="text"
					value={textTitle}
					onChange={(e) => onTextTitleChange(e.target.value)}
					placeholder="Enter text title..."
					className="w-full px-3 py-2 border pro-border pro-bg2 pro-text1 placeholder:pro-text3 focus:border-(--primary1) focus:outline-hidden text-sm md:text-base"
				/>
			</div>
			<div>
				<label className="block mb-1.5 md:mb-2 text-sm font-medium pro-text2">Content (Markdown)</label>
				<textarea
					value={textContent}
					onChange={(e) => onTextContentChange(e.target.value)}
					placeholder="Enter markdown content..."
					rows={8}
					className="w-full px-3 py-2 border pro-border pro-bg2 pro-text1 placeholder:pro-text3 focus:border-(--primary1) focus:outline-hidden resize-none font-mono text-xs md:text-sm md:rows-12"
				/>
				<div className="mt-1.5 md:mt-2 text-xs pro-text3">
					Supports markdown: **bold**, *italic*, # headers, - lists, `code`, [links](url)
				</div>
			</div>
		</div>
	)
}