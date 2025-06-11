interface TextTabProps {
	textTitle: string
	textContent: string
	onTextTitleChange: (title: string) => void
	onTextContentChange: (content: string) => void
}

export function TextTab({ textTitle, textContent, onTextTitleChange, onTextContentChange }: TextTabProps) {
	return (
		<div className="space-y-4">
			<div>
				<label className="block mb-2 text-sm font-medium text-[var(--text2)]">Title (Optional)</label>
				<input
					type="text"
					value={textTitle}
					onChange={(e) => onTextTitleChange(e.target.value)}
					placeholder="Enter text title..."
					className="w-full px-3 py-2 border border-white/20 text-[var(--text1)] placeholder-[var(--text3)] focus:border-[var(--primary1)] focus:outline-none"
					style={{ backgroundColor: '#070e0f' }}
				/>
			</div>
			<div>
				<label className="block mb-2 text-sm font-medium text-[var(--text2)]">Content (Markdown)</label>
				<textarea
					value={textContent}
					onChange={(e) => onTextContentChange(e.target.value)}
					placeholder="Enter markdown content..."
					rows={12}
					className="w-full px-3 py-2 border border-white/20 text-[var(--text1)] placeholder-[var(--text3)] focus:border-[var(--primary1)] focus:outline-none resize-none font-mono text-sm"
					style={{ backgroundColor: '#070e0f' }}
				/>
				<div className="mt-2 text-xs text-[var(--text3)]">
					Supports markdown: **bold**, *italic*, # headers, - lists, `code`, [links](url)
				</div>
			</div>
		</div>
	)
}