import type { ArticleStatus } from './types'

export function isScheduled(article: { status: ArticleStatus | string; goLiveAt?: string | null }): boolean {
	return article.status === 'draft' && article.goLiveAt != null && new Date(article.goLiveAt) > new Date()
}
