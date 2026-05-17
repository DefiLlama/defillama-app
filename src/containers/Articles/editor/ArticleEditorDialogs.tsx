import * as Ariakit from '@ariakit/react'
import type { LocalArticleDocument } from '../types'
import { Icon } from './ArticleEditorIcon'

type DialogStore = ReturnType<typeof Ariakit.useDialogStore>

type CoverDetailsDialogProps = {
	article: LocalArticleDocument
	publishErrors: Record<string, string>
	store: DialogStore
	updateCoverField: (key: 'headline' | 'caption' | 'credit' | 'copyright', value: string) => void
}

export function CoverDetailsDialog({ article, publishErrors, store, updateCoverField }: CoverDetailsDialogProps) {
	return (
		<Ariakit.Dialog
			store={store}
			backdrop={
				<div className="fixed inset-0 z-40 bg-black/40 opacity-0 backdrop-blur-sm transition-opacity duration-150 data-[enter]:opacity-100 data-[leave]:opacity-0" />
			}
			className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-5 opacity-0 shadow-2xl transition-opacity duration-150 data-[enter]:opacity-100"
		>
			<div className="mb-4 flex items-start justify-between gap-3">
				<div className="grid gap-1">
					<Ariakit.DialogHeading className="text-base font-semibold tracking-tight text-(--text-primary)">
						Cover details
					</Ariakit.DialogHeading>
					<p className="text-xs text-(--text-tertiary)">Optional captions and attribution shown below the cover.</p>
				</div>
				<Ariakit.DialogDismiss
					aria-label="Close"
					className="rounded-md p-1.5 text-(--text-secondary) hover:bg-(--link-hover-bg)"
				>
					<Icon name="x" className="h-4 w-4" />
				</Ariakit.DialogDismiss>
			</div>

			<div className="grid gap-3">
				<label className="grid gap-1">
					<span className="text-[11px] font-medium tracking-wide text-(--text-tertiary) uppercase">Headline</span>
					<input
						value={article.coverImage?.headline ?? ''}
						onChange={(e) => updateCoverField('headline', e.target.value)}
						placeholder="Image title"
						className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-2.5 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
					/>
				</label>
				<label className="grid gap-1">
					<span className="text-[11px] font-medium tracking-wide text-(--text-tertiary) uppercase">Caption</span>
					<input
						value={article.coverImage?.caption ?? ''}
						onChange={(e) => updateCoverField('caption', e.target.value)}
						placeholder="Caption shown under the cover"
						className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-2.5 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
					/>
					{publishErrors['coverImage.caption'] ? (
						<span className="text-[11px] text-red-500">{publishErrors['coverImage.caption']}</span>
					) : null}
				</label>
				<div className="grid grid-cols-2 gap-2">
					<label className="grid gap-1">
						<span className="text-[11px] font-medium tracking-wide text-(--text-tertiary) uppercase">Credit</span>
						<input
							value={article.coverImage?.credit ?? ''}
							onChange={(e) => updateCoverField('credit', e.target.value)}
							placeholder="Photographer"
							className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-2.5 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
						/>
						{publishErrors['coverImage.credit'] ? (
							<span className="text-[11px] text-red-500">{publishErrors['coverImage.credit']}</span>
						) : null}
					</label>
					<label className="grid gap-1">
						<span className="text-[11px] font-medium tracking-wide text-(--text-tertiary) uppercase">Copyright</span>
						<input
							value={article.coverImage?.copyright ?? ''}
							onChange={(e) => updateCoverField('copyright', e.target.value)}
							placeholder="Rights holder"
							className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-2.5 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
						/>
						{publishErrors['coverImage.copyright'] ? (
							<span className="text-[11px] text-red-500">{publishErrors['coverImage.copyright']}</span>
						) : null}
					</label>
				</div>
			</div>

			<div className="mt-5 flex justify-end">
				<Ariakit.DialogDismiss className="flex h-9 items-center rounded-md bg-(--link-text) px-3.5 text-xs font-medium text-white transition-opacity hover:opacity-90">
					Done
				</Ariakit.DialogDismiss>
			</div>
		</Ariakit.Dialog>
	)
}

type DeleteArticleDialogProps = {
	isPending: boolean
	isPublished: boolean
	store: DialogStore
	title: string
	confirmDeleteArticle: () => void
}

export function DeleteArticleDialog({
	confirmDeleteArticle,
	isPending,
	isPublished,
	store,
	title
}: DeleteArticleDialogProps) {
	return (
		<Ariakit.Dialog
			store={store}
			backdrop={
				<div className="fixed inset-0 z-40 bg-black/40 opacity-0 backdrop-blur-sm transition-opacity duration-150 data-[enter]:opacity-100 data-[leave]:opacity-0" />
			}
			className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-5 opacity-0 shadow-2xl transition-opacity duration-150 data-[enter]:opacity-100"
		>
			<div className="flex items-start gap-3">
				<div
					aria-hidden
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500"
				>
					<Icon name="trash" className="h-4 w-4" />
				</div>
				<div className="grid gap-1">
					<Ariakit.DialogHeading className="text-base font-semibold tracking-tight text-(--text-primary)">
						{isPublished ? 'Delete this article?' : 'Delete this draft?'}
					</Ariakit.DialogHeading>
					<Ariakit.DialogDescription className="text-sm text-(--text-secondary)">
						{title ? (
							<>
								<span className="font-medium text-(--text-primary)">{title}</span> will be permanently removed. This
								cannot be undone.
							</>
						) : (
							<>This will be permanently removed. This cannot be undone.</>
						)}
					</Ariakit.DialogDescription>
				</div>
			</div>
			<div className="mt-5 flex justify-end gap-2">
				<Ariakit.DialogDismiss
					disabled={isPending}
					className="flex h-9 items-center rounded-md border border-(--cards-border) bg-transparent px-3 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
				>
					Cancel
				</Ariakit.DialogDismiss>
				<button
					type="button"
					onClick={confirmDeleteArticle}
					disabled={isPending}
					className="flex h-9 items-center gap-1.5 rounded-md bg-red-600 px-3.5 text-xs font-medium text-white shadow-[0_4px_12px_-4px_rgba(220,38,38,0.45)] transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
				>
					<Icon name="trash" className="h-3.5 w-3.5" />
					<span>{isPending ? 'Deleting…' : 'Delete'}</span>
				</button>
			</div>
		</Ariakit.Dialog>
	)
}
