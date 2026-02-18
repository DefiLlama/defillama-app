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

function escapeHtml(str: string): string {
	return str.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] || char)
}

export function highlightWord(text: string, words: string[]) {
	if (!text || typeof text !== 'string') return text
	if (!Array.isArray(words) || words.length === 0) return text

	const escapedText = escapeHtml(text)

	const escapedWords: string[] = []
	for (const word of words) {
		if (!word || !word.trim()) continue
		escapedWords.push(word.replace(REGEX_ESCAPE_PATTERN, '\\$&'))
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
	return escapedText.replace(highlightRegexCache.regex, '<span class="highlight">$1</span>')
}
