import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { LocalArticleDocument } from '../types'
import { Icon } from './ArticleEditorIcon'
import type { ArticleFieldUpdater } from './ArticleEditorTypes'

type ArticleCoverImageEditorProps = {
	article: LocalArticleDocument
	coverFileInputRef: RefObject<HTMLInputElement | null>
	coverHovered: boolean
	isUploadingCover: boolean
	publishError?: string
	handleCoverFile: (file: File | null | undefined) => void
	openCoverPicker: () => void
	onOpenCoverDetails: () => void
	setCoverHovered: Dispatch<SetStateAction<boolean>>
	updateArticle: ArticleFieldUpdater
}

export function ArticleCoverImageEditor({
	article,
	coverFileInputRef,
	coverHovered,
	handleCoverFile,
	isUploadingCover,
	onOpenCoverDetails,
	openCoverPicker,
	publishError,
	setCoverHovered,
	updateArticle
}: ArticleCoverImageEditorProps) {
	return (
		<div className="mt-5 mb-4">
			<input
				ref={coverFileInputRef}
				type="file"
				accept="image/png,image/jpeg,image/webp,image/gif"
				className="sr-only"
				onChange={(e) => handleCoverFile(e.target.files?.[0])}
			/>
			{article.coverImage?.url ? (
				<figure className="grid gap-2">
					<div
						className="group relative aspect-[700/400] w-full overflow-hidden rounded-md border border-(--cards-border)"
						onMouseEnter={() => setCoverHovered(true)}
						onMouseLeave={() => setCoverHovered(false)}
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={article.coverImage.url}
							alt={article.coverImage.alt || article.title || ''}
							className="block h-full w-full object-cover"
						/>
						<div
							className={`pointer-events-none absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/55 via-black/10 to-transparent p-3 transition-opacity ${
								coverHovered || isUploadingCover ? 'opacity-100' : 'opacity-0'
							}`}
						>
							<button
								type="button"
								onClick={onOpenCoverDetails}
								className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-md border border-white/30 bg-black/40 px-2.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/55"
							>
								<Icon name="pencil" className="h-3.5 w-3.5" />
								<span>Edit details</span>
							</button>
							<button
								type="button"
								disabled={isUploadingCover}
								onClick={openCoverPicker}
								className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-md border border-white/30 bg-black/40 px-2.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/55 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isUploadingCover ? 'Uploading…' : 'Replace'}
							</button>
							<button
								type="button"
								disabled={isUploadingCover}
								aria-label="Remove cover"
								title="Remove cover"
								onClick={() => updateArticle('coverImage', null)}
								className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-md border border-white/30 bg-black/40 text-white backdrop-blur-sm transition-colors hover:border-red-400/60 hover:bg-red-500/70 disabled:cursor-not-allowed disabled:opacity-60"
							>
								<Icon name="trash" className="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
					{(() => {
						const headline = (article.coverImage.headline ?? '').trim()
						const caption = (article.coverImage.caption ?? '').trim()
						const credit = (article.coverImage.credit ?? '').trim()
						const copyright = (article.coverImage.copyright ?? '').trim()
						const metaParts = [credit ? `Credit: ${credit}` : '', copyright ? `© ${copyright}` : ''].filter(Boolean)
						const hasAny = headline || caption || metaParts.length > 0
						if (!hasAny) {
							return (
								<button
									type="button"
									onClick={onOpenCoverDetails}
									className="flex items-center gap-1.5 self-start rounded-md border border-dashed border-(--cards-border) px-2.5 py-1 text-[11px] font-medium text-(--text-tertiary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary)"
								>
									<Icon name="plus" className="h-3 w-3" />
									<span>Add caption & credits</span>
								</button>
							)
						}
						return (
							<figcaption className="group/cap flex items-start justify-between gap-3">
								<div className="grid gap-0.5 text-xs">
									{headline ? <span className="font-medium text-(--text-secondary)">{headline}</span> : null}
									{caption ? <span className="text-(--text-tertiary)">{caption}</span> : null}
									{metaParts.length > 0 ? (
										<span className="text-(--text-tertiary)/75">{metaParts.join(' · ')}</span>
									) : null}
								</div>
								<button
									type="button"
									onClick={onOpenCoverDetails}
									aria-label="Edit cover details"
									title="Edit cover details"
									className="shrink-0 rounded-md p-1.5 text-(--text-tertiary) opacity-0 transition-opacity group-hover/cap:opacity-100 hover:bg-(--link-hover-bg) hover:text-(--text-primary) focus-visible:opacity-100"
								>
									<Icon name="pencil" className="h-3.5 w-3.5" />
								</button>
							</figcaption>
						)
					})()}
				</figure>
			) : (
				<button
					type="button"
					disabled={isUploadingCover}
					onClick={openCoverPicker}
					className="group flex aspect-[700/400] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-(--cards-border) bg-(--app-bg) text-(--text-tertiary) transition-colors hover:border-(--link-text)/50 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
				>
					<svg
						viewBox="0 0 24 24"
						className="h-6 w-6"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<rect x="3" y="3" width="18" height="18" rx="2" />
						<circle cx="9" cy="9" r="2" />
						<path d="m21 15-4.586-4.586a2 2 0 0 0-2.828 0L3 21" />
					</svg>
					<span className="text-sm font-medium">{isUploadingCover ? 'Uploading…' : 'Add cover image'}</span>
					<span className="text-[11px] text-(--text-tertiary)/80">PNG, JPEG, WebP, or GIF · up to 8 MB</span>
				</button>
			)}
			{publishError ? <p className="mt-2 text-xs text-red-500">{publishError}</p> : null}
		</div>
	)
}
