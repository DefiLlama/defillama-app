import { MarkdownRenderer } from './MarkdownRenderer'

export function InlineSuggestions({ text }: { text: string }) {
	return <MarkdownRenderer content={text} />
}
