function stripProtocol(url: string): string {
	return url.replace(/^[a-z]+:\/\//i, '')
}

export function feedSchemeUrl(feedUrl: string): string {
	return `feed://${stripProtocol(feedUrl)}`
}
