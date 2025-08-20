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
				<label className="pro-text2 mb-1.5 block text-sm font-medium md:mb-2">Title (Optional)</label>
				<input
					type="text"
					value={textTitle}
					onChange={(e) => onTextTitleChange(e.target.value)}
					placeholder="Enter text title..."
					className="pro-border pro-bg2 pro-text1 placeholder:pro-text3 w-full border px-3 py-2 text-sm focus:border-(--primary) focus:outline-hidden md:text-base"
				/>
			</div>
			<div>
				<label className="pro-text2 mb-1.5 block text-sm font-medium md:mb-2">Content (Markdown)</label>
				<textarea
					value={textContent}
					onChange={(e) => onTextContentChange(e.target.value)}
					placeholder="Enter markdown content..."
					rows={8}
					className="pro-border pro-bg2 pro-text1 placeholder:pro-text3 md:rows-12 w-full resize-none border px-3 py-2 font-mono text-xs focus:border-(--primary) focus:outline-hidden md:text-sm"
				/>
				<div className="pro-text3 mt-1.5 text-xs md:mt-2">
					Supports markdown: **bold**, *italic*, # headers, - lists, `code`, [links](url)
				</div>
			</div>
		</div>
	)
}
