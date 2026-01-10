export class StreamingContent {
	private content: string = ''

	addChunk(chunk: string): string {
		this.content += chunk
		return this.content
	}

	getContent(): string {
		return this.content
	}

	reset(): void {
		this.content = ''
	}
}

export function highlightWord(text: string, words: string[]) {
	if (!text || typeof text !== 'string') return text
	if (!Array.isArray(words) || words.length === 0) return text

	const escapeHtml = (str: string) =>
		str.replace(
			/[&<>"']/g,
			(char) =>
				({
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					"'": '&#39;'
				})[char] || char
		)

	const escapedText = escapeHtml(text)

	const escapedWords = words
		.filter((word) => word && word.trim())
		.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

	if (escapedWords.length === 0) return escapedText

	const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi')
	return escapedText.replace(regex, '<span class="highlight">$1</span>')
}
