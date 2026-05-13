// Cache for highlightWord regex (js-hoist-regexp best practice)
// Avoids recreating RegExp on every keystroke - significant perf win for IME input
let highlightRegexCache: { key: string; regex: RegExp } | null = null

// Hoisted HTML escape regex (js-hoist-regexp)
const HTML_ESCAPE_REGEX = /[&<>"']/g
const HTML_ESCAPE_MAP: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
}

// Hoisted regex escape pattern (js-hoist-regexp)
const REGEX_ESCAPE_PATTERN = /[.*+?^${}()|[\]\\]/g

export function escapeHtml(str: string): string {
	return str.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] || char)
}

export function highlightWord(text: string, words: string[]) {
	if (typeof text !== 'string') return ''

	const escapedText = escapeHtml(text)

	if (!text || !Array.isArray(words) || words.length === 0) return escapedText

	const escapedWords: string[] = []
	for (const word of words) {
		if (!word || !word.trim()) continue
		const escapedWord = escapeHtml(word)
		escapedWords.push(escapedWord.replace(REGEX_ESCAPE_PATTERN, '\\$&'))
	}

	if (escapedWords.length === 0) return escapedText

	// Cache key based on sorted words to handle order-independent matching
	const cacheKey = escapedWords.slice().sort().join('|')

	// Reuse cached regex if words haven't changed
	if (!highlightRegexCache || highlightRegexCache.key !== cacheKey) {
		highlightRegexCache = {
			key: cacheKey,
			regex: new RegExp(`(${escapedWords.join('|')})`, 'gi')
		}
	}

	// Reset lastIndex to avoid issues with global regex state
	highlightRegexCache.regex.lastIndex = 0
	// Safety contract: both the full text and every matched token are escaped first.
	// The only HTML introduced here is the internal highlight span used by the input overlay.
	return escapedText.replace(highlightRegexCache.regex, '<span class="highlight">$1</span>')
}
