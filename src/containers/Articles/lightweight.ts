import type { ArticleDocument, LightweightArticleDocument } from './types'

// List endpoints return full ArticleDocument objects, but list/card UIs only need
// metadata. Body fields, SEO duplicates, and empty relation arrays inflate serialized
// getServerSideProps payloads; omit them before props reach the client.
export function toLightweightArticleDocument(article: ArticleDocument): LightweightArticleDocument {
	const {
		contentJson: _contentJson,
		plainText: _plainText,
		entities: _entities,
		charts: _charts,
		citations: _citations,
		embeds: _embeds,
		tags: _tags,
		editorialTags: _editorialTags,
		seoTitle: _seoTitle,
		seoDescription: _seoDescription,
		...rest
	} = article
	return rest
}

export function toLightweightArticleDocuments(articles: ArticleDocument[]): LightweightArticleDocument[] {
	return articles.map(toLightweightArticleDocument)
}
