export function InlineSuggestions({ text }: { text: string }) {
	return (
		<div className="prose prose-sm dark:prose-invert max-w-none leading-normal">
			<p>{text}</p>
		</div>
	)
}
