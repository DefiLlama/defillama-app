import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { normalizeImageHref, type ArticleImageAttrs, type ArticleImageWidthMode } from './ArticleImage'

const widthModeFigureClass: Record<ArticleImageWidthMode, string> = {
	default: '',
	wide: 'lg:-mx-12 xl:-mx-20',
	full: 'lg:-mx-32 xl:-mx-56'
}

const widthModeOptions: { value: ArticleImageWidthMode; label: string; hint: string }[] = [
	{ value: 'default', label: 'Default', hint: 'Match column width' },
	{ value: 'wide', label: 'Wide', hint: 'Slight breakout' },
	{ value: 'full', label: 'Full', hint: 'Edge to edge' }
]

function PhotoIcon({ className = 'h-5 w-5' }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<circle cx="9" cy="9" r="2" />
			<path d="m21 15-4.586-4.586a2 2 0 0 0-2.828 0L3 21" />
		</svg>
	)
}

export function ArticleImageNodeView({ node, selected, updateAttributes, deleteNode, editor }: NodeViewProps) {
	const attrs = node.attrs as ArticleImageAttrs
	const widthMode: ArticleImageWidthMode = (attrs.widthMode ?? 'default') as ArticleImageWidthMode
	const [altOpen, setAltOpen] = useState(false)
	const [altDraft, setAltDraft] = useState(attrs.alt ?? '')
	const [linkOpen, setLinkOpen] = useState(false)
	const [linkDraft, setLinkDraft] = useState(attrs.href ?? '')
	const [captionDraft, setCaptionDraft] = useState(attrs.caption ?? '')
	const [captionFocused, setCaptionFocused] = useState(false)
	const [showCaption, setShowCaption] = useState(Boolean(attrs.caption))
	const captionInputRef = useRef<HTMLTextAreaElement | null>(null)
	const linkInputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		setAltDraft(attrs.alt ?? '')
	}, [attrs.alt])

	useEffect(() => {
		setLinkDraft(attrs.href ?? '')
	}, [attrs.href])

	useEffect(() => {
		setCaptionDraft(attrs.caption ?? '')
		if (attrs.caption) setShowCaption(true)
	}, [attrs.caption])

	useEffect(() => {
		if (linkOpen) setTimeout(() => linkInputRef.current?.focus(), 0)
	}, [linkOpen])

	const isEditable = editor?.isEditable !== false
	const isUploading = Boolean(attrs.uploading)
	const showOverlay = isEditable && (selected || altOpen || linkOpen)

	const setWidthMode = (mode: ArticleImageWidthMode) => {
		updateAttributes({ widthMode: mode })
	}

	const commitAlt = () => {
		updateAttributes({ alt: altDraft.trim() })
		setAltOpen(false)
	}

	const commitLink = () => {
		updateAttributes({ href: normalizeImageHref(linkDraft) })
		setLinkOpen(false)
	}

	const clearLink = () => {
		setLinkDraft('')
		updateAttributes({ href: '' })
		setLinkOpen(false)
	}

	const commitCaption = () => {
		const trimmed = captionDraft.trim()
		updateAttributes({ caption: trimmed })
		if (!trimmed) setShowCaption(false)
	}

	const toggleCaption = () => {
		if (showCaption) {
			setCaptionDraft('')
			updateAttributes({ caption: '' })
			setShowCaption(false)
			return
		}
		setShowCaption(true)
		setTimeout(() => captionInputRef.current?.focus(), 0)
	}

	return (
		<NodeViewWrapper
			data-article-image-wrapper
			className={`article-image-block not-prose relative my-6 ${widthModeFigureClass[widthMode]}`}
		>
			<figure
				className={`relative overflow-hidden rounded-md border bg-(--cards-bg) transition-colors ${
					selected ? 'border-(--link-text)' : 'border-(--cards-border)'
				}`}
			>
				{attrs.src ? (
					<img
						src={attrs.src}
						alt={attrs.alt || ''}
						className="block w-full"
						style={
							attrs.width && attrs.height
								? { aspectRatio: `${attrs.width} / ${attrs.height}` }
								: undefined
						}
					/>
				) : (
					<div className="flex aspect-[4/3] w-full items-center justify-center bg-(--app-bg) text-(--text-tertiary)">
						<div className="flex flex-col items-center gap-2">
							<PhotoIcon className="h-7 w-7" />
							<span className="text-xs font-medium">{isUploading ? 'Uploading…' : 'Image'}</span>
						</div>
					</div>
				)}

				{isUploading ? (
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 flex items-center justify-center bg-(--app-bg)/40 text-xs font-medium tracking-wide text-(--text-secondary) uppercase"
					>
						<span className="rounded bg-(--cards-bg)/90 px-2 py-1 shadow-sm">Uploading…</span>
					</div>
				) : null}

				{showOverlay && !isUploading ? (
					<div
						contentEditable={false}
						onMouseDown={(e) => e.stopPropagation()}
						className="font-jetbrains absolute top-3 right-3 flex items-stretch divide-x divide-(--cards-border) border border-(--cards-border) bg-(--cards-bg)/95 text-[10px] tracking-[0.18em] uppercase backdrop-blur-sm"
					>
						{widthModeOptions.map((opt) => {
							const active = widthMode === opt.value
							return (
								<button
									key={opt.value}
									type="button"
									title={opt.hint}
									onClick={() => setWidthMode(opt.value)}
									className={`px-2.5 py-1.5 transition-colors ${
										active
											? 'bg-(--text-primary) text-(--cards-bg)'
											: 'text-(--text-tertiary) hover:bg-(--app-bg) hover:text-(--text-primary)'
									}`}
								>
									{opt.label}
								</button>
							)
						})}
						<span aria-hidden className="w-1.5 bg-transparent" />
						<button
							type="button"
							onClick={() => {
								setAltOpen((v) => !v)
								if (linkOpen) setLinkOpen(false)
							}}
							title={attrs.alt ? `Alt: ${attrs.alt}` : 'Add alt text'}
							className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-colors ${
								altOpen
									? 'bg-(--app-bg) text-(--text-primary)'
									: 'text-(--text-tertiary) hover:bg-(--app-bg) hover:text-(--text-primary)'
							}`}
						>
							<span>Alt</span>
							<span
								aria-hidden
								className={`h-[5px] w-[5px] rounded-full transition-colors ${
									attrs.alt ? 'bg-(--link-text)' : 'bg-(--text-tertiary)/40'
								}`}
							/>
						</button>
						<button
							type="button"
							onClick={() => {
								setLinkOpen((v) => !v)
								if (altOpen) setAltOpen(false)
							}}
							title={attrs.href ? `Links to: ${attrs.href}` : 'Add link'}
							className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-colors ${
								linkOpen
									? 'bg-(--app-bg) text-(--text-primary)'
									: 'text-(--text-tertiary) hover:bg-(--app-bg) hover:text-(--text-primary)'
							}`}
						>
							<span>Link</span>
							<span
								aria-hidden
								className={`h-[5px] w-[5px] rounded-full transition-colors ${
									attrs.href ? 'bg-(--link-text)' : 'bg-(--text-tertiary)/40'
								}`}
							/>
						</button>
						<button
							type="button"
							onClick={toggleCaption}
							title={showCaption ? 'Remove caption' : 'Add caption'}
							className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-colors ${
								showCaption
									? 'bg-(--app-bg) text-(--text-primary)'
									: 'text-(--text-tertiary) hover:bg-(--app-bg) hover:text-(--text-primary)'
							}`}
						>
							<span>Caption</span>
							<span
								aria-hidden
								className={`h-[5px] w-[5px] rounded-full transition-colors ${
									showCaption ? 'bg-(--link-text)' : 'bg-(--text-tertiary)/40'
								}`}
							/>
						</button>
						<button
							type="button"
							onClick={() => deleteNode()}
							title="Remove image"
							className="px-2.5 py-1.5 text-(--text-tertiary) transition-colors hover:bg-red-500/10 hover:text-red-500"
						>
							Remove
						</button>
					</div>
				) : null}

				{linkOpen && !isUploading ? (
					<div
						contentEditable={false}
						onMouseDown={(e) => e.stopPropagation()}
						className="absolute top-13 right-3 z-10 grid w-80 gap-3 border border-(--cards-border) bg-(--cards-bg) p-3"
					>
						<label className="grid gap-1.5">
							<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
								Image link
							</span>
							<input
								ref={linkInputRef}
								type="url"
								inputMode="url"
								value={linkDraft}
								onChange={(e) => setLinkDraft(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Escape') {
										e.preventDefault()
										setLinkDraft(attrs.href ?? '')
										setLinkOpen(false)
									}
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault()
										commitLink()
									}
								}}
								placeholder="https://…"
								className="w-full border border-(--cards-border) bg-(--app-bg) px-2 py-1.5 text-xs leading-snug text-(--text-primary) outline-none focus:border-(--link-text)/60"
							/>
						</label>
						<div className="font-jetbrains flex items-center justify-between text-[10px] tracking-[0.18em] uppercase">
							{attrs.href ? (
								<button
									type="button"
									onClick={clearLink}
									className="px-1 py-1 text-(--text-tertiary) transition-colors hover:text-red-500"
								>
									Remove
								</button>
							) : (
								<button
									type="button"
									onClick={() => {
										setLinkDraft(attrs.href ?? '')
										setLinkOpen(false)
									}}
									className="px-1 py-1 text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
								>
									Cancel
								</button>
							)}
							<button
								type="button"
								onClick={commitLink}
								className="bg-(--text-primary) px-3 py-1.5 text-(--cards-bg) transition-opacity hover:opacity-90"
							>
								Save
							</button>
						</div>
					</div>
				) : null}

				{altOpen && !isUploading ? (
					<div
						contentEditable={false}
						onMouseDown={(e) => e.stopPropagation()}
						className="absolute top-13 right-3 z-10 grid w-72 gap-3 border border-(--cards-border) bg-(--cards-bg) p-3"
					>
						<label className="grid gap-1.5">
							<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
								Alt text
							</span>
							<textarea
								value={altDraft}
								onChange={(e) => setAltDraft(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Escape') {
										e.preventDefault()
										setAltDraft(attrs.alt ?? '')
										setAltOpen(false)
									}
									if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
										e.preventDefault()
										commitAlt()
									}
								}}
								rows={3}
								placeholder="Describe the image for screen readers"
								className="w-full resize-none border border-(--cards-border) bg-(--app-bg) px-2 py-1.5 text-xs leading-snug text-(--text-primary) outline-none focus:border-(--link-text)/60"
							/>
						</label>
						<div className="font-jetbrains flex items-center justify-between text-[10px] tracking-[0.18em] uppercase">
							<button
								type="button"
								onClick={() => {
									setAltDraft(attrs.alt ?? '')
									setAltOpen(false)
								}}
								className="px-1 py-1 text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={commitAlt}
								className="bg-(--text-primary) px-3 py-1.5 text-(--cards-bg) transition-opacity hover:opacity-90"
							>
								Save
							</button>
						</div>
					</div>
				) : null}
			</figure>

			{showCaption ? (
				<div className="mt-2">
					<textarea
						ref={captionInputRef}
						value={captionDraft}
						onChange={(e) => setCaptionDraft(e.target.value)}
						onFocus={() => setCaptionFocused(true)}
						onBlur={() => {
							setCaptionFocused(false)
							commitCaption()
						}}
						placeholder="Add a caption…"
						rows={Math.min(3, Math.max(1, captionDraft.split('\n').length))}
						className={`w-full resize-none border-l-2 bg-transparent px-3 py-1 text-sm leading-snug text-(--text-secondary) outline-none transition-colors ${
							captionFocused ? 'border-(--link-text)' : 'border-(--cards-border)'
						}`}
					/>
				</div>
			) : null}
		</NodeViewWrapper>
	)
}
