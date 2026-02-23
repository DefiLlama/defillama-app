interface TextTabProps {
	textTitle: string
	textContent: string
	onTextTitleChange: (title: string) => void
	onTextContentChange: (content: string) => void
}

export function TextTab({ textTitle, textContent, onTextTitleChange, onTextContentChange }: TextTabProps) {
	const titleInputId = 'add-chart-text-tab-title'
	const contentInputId = 'add-chart-text-tab-content'

	return (
		<div className="space-y-3 md:space-y-4">
			<div>
				<label htmlFor={titleInputId} className="mb-1.5 block text-sm font-medium pro-text2 md:mb-2">
					Title (Optional)
				</label>
				<input
					id={titleInputId}
					type="text"
					value={textTitle}
					onChange={(e) => onTextTitleChange(e.target.value)}
					placeholder="Enter text title..."
					className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-sm pro-text1 placeholder:pro-text3 focus:ring-1 focus:ring-(--primary) focus:outline-hidden md:text-base"
				/>
			</div>
			<div>
				<label htmlFor={contentInputId} className="mb-1.5 block text-sm font-medium pro-text2 md:mb-2">
					Content (Markdown)
				</label>
				<textarea
					id={contentInputId}
					value={textContent}
					onChange={(e) => onTextContentChange(e.target.value)}
					placeholder="Enter markdown content..."
					rows={8}
					className="md:rows-12 w-full resize-none rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-xs pro-text1 placeholder:pro-text3 focus:ring-1 focus:ring-(--primary) focus:outline-hidden md:text-sm"
				/>
				<div className="mt-1.5 text-xs pro-text3 md:mt-2">
					Supports markdown: **bold**, *italic*, # headers, - lists, `code`, [links](url)
				</div>
			</div>
		</div>
	)
}
