import * as Ariakit from '@ariakit/react'
import Link from 'next/link'
import type { Dispatch, SetStateAction } from 'react'
import type { LocalArticleDocument } from '../types'
import { Icon } from './ArticleEditorIcon'
import type { SavePillState } from './ArticleEditorTypes'

type ArticleEditorHeaderProps = {
	article: LocalArticleDocument
	articleViewHref: string
	deletePending: boolean
	hasPendingEdits: boolean
	isDiscarding: boolean
	isOwner: boolean
	isPublished: boolean
	isPublishing: boolean
	pillDot: string
	pillLabel: string
	pillState: SavePillState
	savedLabel: string | null
	slugDraft: string
	slugEditing: boolean
	beginSlugEdit: () => void
	cancelSlugEdit: () => void
	commitSlugEdit: () => void
	handleDeleteArticle: () => void
	handleDiscardPending: () => void
	handlePublish: () => Promise<boolean>
	handleUnpublish: () => Promise<void>
	onOpenHistory: () => void
	onOpenMeta: () => void
	saveArticle: () => Promise<void>
	setSlugDraft: Dispatch<SetStateAction<string>>
}

export function ArticleEditorHeader({
	article,
	articleViewHref,
	beginSlugEdit,
	cancelSlugEdit,
	commitSlugEdit,
	deletePending,
	handleDeleteArticle,
	handleDiscardPending,
	handlePublish,
	handleUnpublish,
	hasPendingEdits,
	isDiscarding,
	isOwner,
	isPublished,
	isPublishing,
	onOpenHistory,
	onOpenMeta,
	pillDot,
	pillLabel,
	pillState,
	saveArticle,
	savedLabel,
	setSlugDraft,
	slugDraft,
	slugEditing
}: ArticleEditorHeaderProps) {
	return (
		<header
			className={`mb-8 flex flex-wrap items-center justify-between gap-3 border-b py-4 lg:-mx-[80px] lg:px-2 xl:-mx-[170px] xl:px-4 ${
				isPublished ? 'border-emerald-500/25' : 'border-(--cards-border)'
			}`}
		>
			<nav className="flex min-w-0 items-center gap-2.5 text-sm">
				<Link href="/research" className="text-(--text-tertiary) hover:text-(--text-primary)">
					Articles
				</Link>
				<span aria-hidden className="text-(--text-tertiary)/50">
					›
				</span>
				{slugEditing ? (
					<input
						autoFocus
						value={slugDraft}
						onChange={(event) => setSlugDraft(event.target.value)}
						onBlur={commitSlugEdit}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault()
								commitSlugEdit()
							}
							if (event.key === 'Escape') {
								event.preventDefault()
								cancelSlugEdit()
							}
						}}
						className="w-[24ch] rounded border border-(--link-text)/40 bg-(--app-bg) px-1.5 py-0.5 font-jetbrains text-xs text-(--text-primary) focus:border-(--link-text) focus:outline-none"
					/>
				) : (
					<button
						type="button"
						onClick={beginSlugEdit}
						title="Click to edit slug"
						className={`group flex ${
							hasPendingEdits ? 'max-w-[18ch] sm:max-w-[24ch] lg:max-w-[32ch]' : 'max-w-[24ch] sm:max-w-[32ch]'
						} items-center gap-1 truncate rounded px-1 py-0.5 font-jetbrains text-xs tracking-tight text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)`}
					>
						<span className="truncate">{article.slug}</span>
						<span aria-hidden className="text-(--text-tertiary) opacity-0 transition-opacity group-hover:opacity-100">
							✎
						</span>
					</button>
				)}
				<span aria-hidden className="text-(--text-tertiary)/40">
					·
				</span>
				<span
					className={`font-jetbrains text-[10px] font-medium tracking-[0.22em] uppercase ${
						isPublished ? 'text-emerald-500' : 'text-amber-500'
					}`}
				>
					{article.status}
				</span>
			</nav>

			<div className="flex items-center gap-2">
				<button
					type="button"
					aria-live="polite"
					aria-label={
						pillState === 'error'
							? 'Save failed — retry'
							: pillState === 'unsaved'
								? 'Save now'
								: pillState === 'saving'
									? 'Saving'
									: pillState === 'saved'
										? `Saved ${savedLabel ?? ''} — save again`
										: 'Save'
					}
					title={pillState === 'error' ? 'Click to retry. Cmd/Ctrl+S also saves.' : 'Cmd/Ctrl+S to save'}
					disabled={pillState === 'saving' || pillState === 'idle'}
					onClick={() => void saveArticle()}
					className={`hidden items-center gap-2 rounded-md border px-2.5 py-1.5 font-jetbrains text-[11px] tracking-tight transition-colors disabled:cursor-default ${
						hasPendingEdits ? 'lg:flex' : 'sm:flex'
					} ${
						pillState === 'error'
							? 'border-red-500/40 bg-red-500/5 text-red-500 hover:bg-red-500/10'
							: pillState === 'unsaved'
								? 'border-amber-500/35 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400'
								: 'border-transparent text-(--text-secondary) hover:border-(--cards-border) hover:bg-(--link-hover-bg) disabled:hover:border-transparent disabled:hover:bg-transparent'
					}`}
				>
					<span aria-hidden className={`h-1.5 w-1.5 rounded-full ${pillDot}`} />
					<span className="tabular-nums">
						{pillState === 'error' ? 'Save failed · Retry' : pillState === 'unsaved' ? 'Save' : pillLabel}
					</span>
					{pillState === 'unsaved' || pillState === 'error' ? (
						<kbd
							aria-hidden
							className="hidden rounded border border-current/25 px-1 py-px font-jetbrains text-[9px] tracking-wider opacity-70 lg:inline"
						>
							⌘S
						</kbd>
					) : null}
				</button>

				{article.id ? (
					<button
						type="button"
						onClick={onOpenHistory}
						title="Revision history"
						className="flex h-9 w-9 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary)"
					>
						<svg
							className="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.75"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<circle cx="12" cy="12" r="9" />
							<polyline points="12 7 12 12 15.5 14" />
						</svg>
					</button>
				) : null}

				{isPublished ? (
					<>
						{hasPendingEdits ? (
							<>
								<button
									type="button"
									disabled={isPublishing || isDiscarding}
									onClick={handleDiscardPending}
									className="flex h-9 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 text-xs font-medium text-(--text-secondary) transition-colors hover:border-red-500/50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isDiscarding ? 'Discarding…' : 'Discard'}
								</button>
								<button
									type="button"
									disabled={isPublishing || isDiscarding}
									onClick={async () => {
										await handlePublish()
									}}
									className="flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 text-xs font-medium text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-500 hover:shadow-[0_6px_16px_-4px_rgba(16,185,129,0.55)] disabled:cursor-not-allowed disabled:opacity-50"
								>
									<span>{isPublishing ? 'Publishing…' : 'Publish update'}</span>
									<span aria-hidden>→</span>
								</button>
							</>
						) : null}
						<Ariakit.MenuProvider>
							<Ariakit.MenuButton className="flex h-9 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 text-xs font-medium text-(--text-primary) transition-colors hover:border-(--link-text)/40">
								<span
									aria-hidden
									className={`h-1.5 w-1.5 rounded-full ${hasPendingEdits ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`}
								/>
								<span>{hasPendingEdits ? 'Live · Pending' : 'Live'}</span>
								<span aria-hidden className="text-(--text-tertiary)">
									▾
								</span>
							</Ariakit.MenuButton>
							<Ariakit.Menu
								gutter={6}
								className="z-50 grid min-w-[180px] gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-xl"
							>
								<Ariakit.MenuItem
									render={
										<Link
											href={articleViewHref}
											target="_blank"
											rel="noreferrer"
											className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
										/>
									}
								>
									<span className="flex items-center gap-2">
										<Icon name="eye" className="h-3.5 w-3.5" />
										View live
									</span>
									<Icon name="external" className="h-3 w-3 text-(--text-tertiary)" />
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={onOpenMeta}
									className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<Icon name="sliders" className="h-3.5 w-3.5" />
									Edit listing
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={onOpenHistory}
									className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<Icon name="check" className="h-3.5 w-3.5" />
									Revision history
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={handleUnpublish}
									disabled={isPublishing}
									className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<Icon name="undo" className="h-3.5 w-3.5" />
									Move to drafts
								</Ariakit.MenuItem>
								{isOwner ? (
									<>
										<span aria-hidden className="my-1 h-px bg-(--cards-border)" />
										<Ariakit.MenuItem
											onClick={handleDeleteArticle}
											className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-red-500 data-[active-item]:bg-red-500/10"
										>
											<Icon name="trash" className="h-3.5 w-3.5" />
											Delete
										</Ariakit.MenuItem>
									</>
								) : null}
							</Ariakit.Menu>
						</Ariakit.MenuProvider>
					</>
				) : article.id ? (
					<>
						{article.section ? (
							<Link
								href={articleViewHref}
								target="_blank"
								rel="noreferrer"
								className="flex h-9 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary)"
							>
								<Icon name="eye" className="h-3.5 w-3.5" />
								<span>Preview</span>
							</Link>
						) : (
							<button
								type="button"
								onClick={onOpenMeta}
								title="Set a section to preview this draft"
								className="flex h-9 items-center gap-1.5 rounded-md border border-dashed border-(--cards-border) bg-transparent px-3 text-xs font-medium text-(--text-tertiary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-secondary)"
							>
								<Icon name="eye" className="h-3.5 w-3.5" />
								<span>Set section to preview</span>
							</button>
						)}
						{isOwner ? (
							<button
								type="button"
								aria-label="Delete draft"
								title="Delete draft"
								disabled={deletePending}
								onClick={handleDeleteArticle}
								className="flex h-9 w-9 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) text-(--text-tertiary) transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<Icon name="trash" className="h-3.5 w-3.5" />
							</button>
						) : null}
						<button
							type="button"
							disabled={isPublishing}
							onClick={onOpenMeta}
							className="flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 text-xs font-medium text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-500 hover:shadow-[0_6px_16px_-4px_rgba(16,185,129,0.55)] disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span>Publish</span>
							<span aria-hidden>→</span>
						</button>
					</>
				) : null}
			</div>
		</header>
	)
}
