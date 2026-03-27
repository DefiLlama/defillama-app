import { useEffect, useState } from 'react'
import { useContentReady } from '~/containers/SuperLuminal/index'

interface ParagraphPost {
	id: string
	title: string
	subtitle?: string
	slug: string
	publishedAt: string
	imageUrl?: string
	categories?: string[]
}

function formatDate(timestamp: string): string {
	const date = new Date(parseInt(timestamp))
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatRelativeTime(timestamp: string): string {
	const date = new Date(parseInt(timestamp))
	const now = new Date()
	const diffInMs = now.getTime() - date.getTime()
	const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

	if (diffInDays === 0) return 'Today'
	if (diffInDays === 1) return 'Yesterday'
	if (diffInDays < 7) return `${diffInDays} days ago`
	if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
	if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
	return `${Math.floor(diffInDays / 365)} years ago`
}

export default function PressReleases() {
	const contentReady = useContentReady()
	const [pressReleases, setPressReleases] = useState<ParagraphPost[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		fetch('https://public.api.paragraph.com/api/v1/publications/b00mE4GGi4yHkul5EqRd/posts?limit=50')
			.then((res) => res.json())
			.then((apiData) => {
				setPressReleases(apiData.items || [])
				setLoading(false)
				contentReady()
			})
			.catch((err) => {
				console.error('Failed to fetch press releases:', err)
				setLoading(false)
				contentReady()
			})
	}, [contentReady])

	if (loading) {
		return (
			<div className="flex h-96 items-center justify-center">
				<div className="flex flex-col items-center gap-3">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-(--text-label) border-t-transparent"></div>
					<p className="text-sm text-(--text-secondary)">Loading press releases...</p>
				</div>
			</div>
		)
	}

	if (pressReleases.length === 0) {
		return (
			<div className="flex h-96 items-center justify-center rounded-xl border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-col items-center gap-2">
					<svg className="h-12 w-12 text-(--text-label)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
						/>
					</svg>
					<p className="text-sm text-(--text-secondary)">No press releases available</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-8 py-6">
			{/* Header */}
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-bold text-(--text-primary)">Press Releases & Updates</h1>
				<p className="text-sm text-(--text-secondary)">Latest news, announcements, and updates from Spark Protocol</p>
			</div>

			{/* Grid */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
				{pressReleases.map((post) => (
					<a
						key={post.id}
						href={`https://paragraph.com/@spark-11/${post.slug}`}
						target="_blank"
						rel="noopener noreferrer"
						className="group flex flex-col overflow-hidden rounded-xl border border-(--cards-border) bg-(--cards-bg) transition-all duration-200 hover:border-(--sl-accent) hover:shadow-xl"
					>
						{/* Image */}
						{post.imageUrl && (
							<div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-(--sl-accent-muted) to-(--cards-border)">
								<img
									src={post.imageUrl}
									alt={post.title}
									className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
									loading="lazy"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
							</div>
						)}

						{/* Content */}
						<div className="flex flex-1 flex-col gap-3 p-5">
							{/* Meta */}
							<div className="flex flex-wrap items-center gap-2">
								<time className="text-xs font-medium text-(--text-label)" title={formatDate(post.publishedAt)}>
									{formatRelativeTime(post.publishedAt)}
								</time>
								{post.categories && post.categories.length > 0 && (
									<>
										<span className="text-xs text-(--text-label)">•</span>
										<span className="rounded-md bg-(--sl-accent-muted) px-2 py-0.5 text-xs font-semibold tracking-wide text-(--sl-accent) uppercase">
											{post.categories[0]}
										</span>
									</>
								)}
							</div>

							{/* Title */}
							<h3 className="line-clamp-2 text-lg leading-snug font-bold text-(--text-primary) transition-colors group-hover:text-(--sl-accent)">
								{post.title}
							</h3>

							{/* Subtitle */}
							{post.subtitle && (
								<p className="line-clamp-3 flex-1 text-sm leading-relaxed text-(--text-secondary)">{post.subtitle}</p>
							)}

							{/* Read More */}
							<div className="flex items-center gap-2 pt-2 text-sm font-medium text-(--link) transition-all group-hover:gap-3">
								<span>Read more</span>
								<svg
									className="h-4 w-4 transition-transform group-hover:translate-x-1"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
								</svg>
							</div>
						</div>
					</a>
				))}
			</div>

			{/* Footer */}
			<div className="flex items-center justify-center pt-4">
				<a
					href="https://paragraph.com/@spark-11"
					target="_blank"
					rel="noopener noreferrer"
					className="group flex items-center gap-2 rounded-lg border border-(--cards-border) bg-(--cards-bg) px-4 py-2.5 text-sm font-medium text-(--text-primary) transition-all hover:border-(--sl-accent) hover:bg-(--sl-hover-bg)"
				>
					<span>View all on Paragraph</span>
					<svg
						className="h-4 w-4 transition-transform group-hover:translate-x-1"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
						/>
					</svg>
				</a>
			</div>
		</div>
	)
}
