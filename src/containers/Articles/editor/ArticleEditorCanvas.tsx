import * as Ariakit from '@ariakit/react'
import { EditorContent, type Editor } from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { chainIconUrl, tokenIconUrl } from '~/utils/icons'
import type { ArticleCalloutTone } from '../types'
import {
	RailButton,
	RailDivider,
	TableControlsOverlay,
	type ActiveEntityLink,
	type BlockItem,
	type EditorFlags,
	type MarkButton
} from './ArticleEditorControls'
import { Icon } from './ArticleEditorIcon'

type LinkEditState = { url: string; newTab: boolean } | null

type ArticleEditorCanvasProps = {
	activeEntity: ActiveEntityLink | null
	blockItems: BlockItem[]
	editor: Editor | null
	flags: EditorFlags
	linkEdit: LinkEditState
	linkInputRef: RefObject<HTMLInputElement | null>
	markButtons: MarkButton[]
	readMins: number
	wordCount: number
	applyLink: (raw: string, newTab: boolean) => void
	changeActiveEntityLink: () => void
	handleLinkRail: () => void
	insertCallout: (tone: ArticleCalloutTone) => boolean | undefined
	insertCitation: () => void
	onOpenChartPicker: () => void
	onOpenEmbedPicker: () => void
	openActiveEntityLink: () => void
	openLinkEditor: () => void
	setLinkEdit: Dispatch<SetStateAction<LinkEditState>>
	unsetActiveEntityLink: () => void
}

export function ArticleEditorCanvas({
	activeEntity,
	applyLink,
	blockItems,
	changeActiveEntityLink,
	editor,
	flags,
	handleLinkRail,
	insertCallout,
	insertCitation,
	linkEdit,
	linkInputRef,
	markButtons,
	onOpenChartPicker,
	onOpenEmbedPicker,
	openActiveEntityLink,
	openLinkEditor,
	readMins,
	setLinkEdit,
	unsetActiveEntityLink,
	wordCount
}: ArticleEditorCanvasProps) {
	return (
		<>
			<div className="article-editor-canvas relative mt-2">
				<EditorContent editor={editor} />

				{editor ? (
					<BubbleMenu
						editor={editor}
						options={{ placement: 'top' }}
						shouldShow={({ editor: e, from, to, state }) => {
							if (linkEdit) return true
							if (!e.isEditable) return false
							if (e.isActive('entityLink') && e.isFocused) return true
							if (from === to) return false
							let blocked = false
							state.doc.nodesBetween(from, to, (n) => {
								if (
									n.type.name === 'defillamaChart' ||
									n.type.name === 'articleEmbed' ||
									n.type.name === 'callout' ||
									n.type.name === 'citation'
								)
									blocked = true
								return !blocked
							})
							if (blocked) return false
							return e.isFocused
						}}
						className="article-bubble-menu z-40"
					>
						<div className="flex items-center gap-0.5 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-1 shadow-[0_18px_36px_-18px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-(--cards-bg)/95">
							{linkEdit ? (
								<form
									onSubmit={(e) => {
										e.preventDefault()
										applyLink(linkEdit.url, linkEdit.newTab)
									}}
									className="flex items-center gap-1"
								>
									<input
										ref={linkInputRef}
										value={linkEdit.url}
										onChange={(e) => setLinkEdit({ url: e.target.value, newTab: linkEdit.newTab })}
										onKeyDown={(e) => {
											if (e.key === 'Escape') {
												e.preventDefault()
												setLinkEdit(null)
											}
										}}
										placeholder="Paste or type URL"
										className="w-64 rounded-md bg-transparent px-2 py-1 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:outline-none"
									/>
									<button
										type="button"
										role="switch"
										aria-checked={linkEdit.newTab}
										aria-label="Open in new tab"
										title={linkEdit.newTab ? 'Opens in new tab' : 'Opens in same tab'}
										onClick={() => setLinkEdit({ url: linkEdit.url, newTab: !linkEdit.newTab })}
										className={`flex h-7 items-center gap-1 rounded-md px-1.5 font-jetbrains text-[10px] tracking-[0.16em] uppercase transition-colors ${
											linkEdit.newTab
												? 'bg-(--link-button) text-(--link-text)'
												: 'text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
										}`}
									>
										<Icon name="external" className="h-3 w-3" />
										<span>New tab</span>
									</button>
									<span aria-hidden className="mx-0.5 h-4 w-px bg-(--cards-border)" />
									<button
										type="submit"
										aria-label="Save link"
										className="rounded-md p-1 text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
									>
										<Icon name="check" className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => applyLink('', linkEdit.newTab)}
										aria-label="Remove link"
										className="rounded-md p-1 text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
									>
										<Icon name="x" className="h-4 w-4" />
									</button>
									{flags.link && linkEdit.url ? (
										<a
											href={linkEdit.url}
											target="_blank"
											rel="noreferrer"
											aria-label="Open link"
											className="rounded-md p-1 text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
										>
											<Icon name="external" className="h-4 w-4" />
										</a>
									) : null}
								</form>
							) : flags.entityLink && activeEntity ? (
								<div className="flex items-center gap-1">
									<span className="flex items-center gap-2 px-2 py-1">
										{activeEntity.slug ? (
											<span className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--cards-border) bg-(--app-bg)">
												<img
													src={
														activeEntity.entityType === 'chain'
															? chainIconUrl(activeEntity.slug)
															: tokenIconUrl(activeEntity.slug)
													}
													alt=""
													className="h-full w-full object-cover"
													onError={(e) => {
														e.currentTarget.style.visibility = 'hidden'
													}}
												/>
											</span>
										) : null}
										<span className="max-w-[160px] truncate text-sm font-medium text-(--text-primary)">
											{activeEntity.label || activeEntity.slug || 'Entity'}
										</span>
										<span className="font-jetbrains text-[9px] tracking-[0.18em] text-(--text-tertiary) uppercase">
											{activeEntity.entityType ?? ''}
										</span>
									</span>
									<span aria-hidden className="mx-0.5 h-4 w-px bg-(--cards-border)" />
									<button
										type="button"
										aria-label="Change entity"
										title="Change entity"
										onClick={changeActiveEntityLink}
										className="flex h-7 items-center gap-1 rounded-md px-2 font-jetbrains text-[10px] tracking-[0.16em] text-(--text-secondary) uppercase transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
									>
										<Icon name="pencil" className="h-3 w-3" />
										<span>Change</span>
									</button>
									<button
										type="button"
										aria-label="Unlink entity"
										title="Unlink entity"
										onClick={unsetActiveEntityLink}
										className="flex h-7 items-center gap-1 rounded-md px-2 font-jetbrains text-[10px] tracking-[0.16em] text-(--text-tertiary) uppercase transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
									>
										<Icon name="x" className="h-3 w-3" />
										<span>Unlink</span>
									</button>
									{activeEntity.route ? (
										<button
											type="button"
											aria-label="Open entity"
											title="Open entity in new tab"
											onClick={openActiveEntityLink}
											className="flex h-7 items-center gap-1 rounded-md px-2 font-jetbrains text-[10px] tracking-[0.16em] text-(--text-tertiary) uppercase transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
										>
											<Icon name="external" className="h-3 w-3" />
											<span>Open</span>
										</button>
									) : null}
								</div>
							) : (
								<>
									{markButtons.map((b) => (
										<button
											key={b.name}
											type="button"
											aria-label={b.label}
											title={b.label}
											onClick={b.toggle}
											className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
												b.isActive()
													? 'bg-(--link-button) text-(--link-text)'
													: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
											}`}
										>
											<Icon name={b.icon} className="h-3.5 w-3.5" />
										</button>
									))}
									<span aria-hidden className="mx-0.5 h-4 w-px bg-(--cards-border)" />
									<button
										type="button"
										aria-label="Link"
										title="Link"
										onClick={openLinkEditor}
										className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
											flags.link
												? 'bg-(--link-button) text-(--link-text)'
												: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
										}`}
									>
										<Icon name="link" className="h-3.5 w-3.5" />
									</button>
								</>
							)}
						</div>
					</BubbleMenu>
				) : null}

				{editor ? <TableControlsOverlay editor={editor} /> : null}

				{editor ? (
					<FloatingMenu
						editor={editor}
						options={{ placement: 'left-start', offset: 16 }}
						className="article-floating-menu z-30"
					>
						<Ariakit.MenuProvider>
							<Ariakit.MenuButton
								className="flex h-6 w-6 items-center justify-center rounded-full text-(--text-tertiary)/50 transition-all hover:bg-(--link-hover-bg) hover:text-(--text-primary) data-[active]:bg-(--link-button) data-[active]:text-(--link-text)"
								aria-label="Insert block"
							>
								<Icon name="plus" className="h-3.5 w-3.5" />
							</Ariakit.MenuButton>
							<Ariakit.Menu
								gutter={6}
								className="z-50 grid min-w-[200px] gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-xl"
							>
								{blockItems.map((item) => (
									<Ariakit.MenuItem
										key={item.label}
										onClick={item.run}
										className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span>{item.label}</span>
										{item.hint ? (
											<span className="font-jetbrains text-[10px] text-(--text-tertiary)">{item.hint}</span>
										) : null}
									</Ariakit.MenuItem>
								))}
								<span aria-hidden className="my-1 h-px bg-(--cards-border)" />
								<Ariakit.MenuItem
									onClick={onOpenChartPicker}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>DefiLlama chart</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">↗</span>
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>Table</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">3×3</span>
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={onOpenEmbedPicker}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>Embed</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">URL</span>
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={() => document.dispatchEvent(new CustomEvent('article:trigger-image-upload'))}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>Image</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">Upload</span>
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={() => document.dispatchEvent(new CustomEvent('article:open-people-panel-picker'))}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>People panel</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">Bios</span>
								</Ariakit.MenuItem>
								<Ariakit.MenuProvider>
									<Ariakit.MenuItem
										render={
											<Ariakit.MenuButton className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)">
												<span>Callout</span>
												<span aria-hidden className="text-(--text-tertiary)">
													›
												</span>
											</Ariakit.MenuButton>
										}
									/>
									<Ariakit.Menu
										gutter={4}
										className="z-50 grid min-w-[140px] gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-xl"
									>
										{(['note', 'data', 'warning', 'pullquote'] as ArticleCalloutTone[]).map((tone) => (
											<Ariakit.MenuItem
												key={tone}
												onClick={() => insertCallout(tone)}
												className="rounded px-2 py-1.5 text-xs text-(--text-secondary) capitalize data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
											>
												{tone}
											</Ariakit.MenuItem>
										))}
									</Ariakit.Menu>
								</Ariakit.MenuProvider>
								<Ariakit.MenuItem
									onClick={insertCitation}
									className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
								>
									<span>Citation</span>
									<span className="font-jetbrains text-[10px] text-(--text-tertiary)">[n]</span>
								</Ariakit.MenuItem>
							</Ariakit.Menu>
						</Ariakit.MenuProvider>
					</FloatingMenu>
				) : null}
			</div>

			{editor ? (
				<div className="pointer-events-none sticky bottom-6 z-30 mt-10 flex justify-center">
					<div className="article-editor-rail pointer-events-auto inline-flex items-stretch gap-1 rounded-2xl border border-(--cards-border) bg-(--cards-bg)/95 p-1.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur supports-[backdrop-filter]:bg-(--cards-bg)/80">
						<div className="hidden items-center gap-1 pl-1 sm:flex">
							<RailButton label="Undo" disabled={!flags.canUndo} onClick={() => editor.chain().focus().undo().run()}>
								<Icon name="undo" className="h-4 w-4" />
							</RailButton>
							<RailButton label="Redo" disabled={!flags.canRedo} onClick={() => editor.chain().focus().redo().run()}>
								<Icon name="redo" className="h-4 w-4" />
							</RailButton>
							<RailDivider />
						</div>

						<div className="flex items-center gap-1">
							<RailButton
								label="Heading 2"
								active={flags.h2}
								onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
							>
								<Icon name="h2" className="h-4 w-4" />
							</RailButton>
							<RailButton
								label="Heading 3"
								active={flags.h3}
								onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
							>
								<Icon name="h3" className="h-4 w-4" />
							</RailButton>
							<RailButton
								label="Bullet list"
								active={flags.bulletList}
								onClick={() => editor.chain().focus().toggleBulletList().run()}
							>
								<Icon name="list-ul" className="h-4 w-4" />
							</RailButton>
							<RailButton
								label="Numbered list"
								active={flags.orderedList}
								onClick={() => editor.chain().focus().toggleOrderedList().run()}
							>
								<Icon name="list-ol" className="h-4 w-4" />
							</RailButton>
							<RailButton
								label="Quote"
								active={flags.blockquote}
								onClick={() => editor.chain().focus().toggleBlockquote().run()}
							>
								<Icon name="quote" className="h-4 w-4" />
							</RailButton>
							<RailButton
								label="Code block"
								active={flags.codeBlock}
								onClick={() => editor.chain().focus().toggleCodeBlock().run()}
							>
								<Icon name="code-block" className="h-4 w-4" />
							</RailButton>
							<RailButton label="Link" active={flags.link} onClick={handleLinkRail}>
								<Icon name="link" className="h-4 w-4" />
							</RailButton>
						</div>

						<RailDivider />

						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={onOpenChartPicker}
								className="flex h-9 items-center gap-1.5 rounded-md bg-(--link-button) px-3 text-xs font-medium text-(--link-text) transition-colors hover:opacity-90"
							>
								<Icon name="chart" className="h-4 w-4" />
								Chart
							</button>
							<Ariakit.MenuProvider>
								<Ariakit.MenuButton
									aria-label="Insert block"
									title="Insert"
									className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
								>
									<Icon name="more" className="h-4 w-4" />
									<span className="hidden sm:inline">Insert</span>
								</Ariakit.MenuButton>
								<Ariakit.Menu
									gutter={8}
									className="z-50 grid min-w-[200px] gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-xl"
								>
									<Ariakit.MenuItem
										onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
										className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span className="flex items-center gap-2">
											<Icon name="table" className="h-3.5 w-3.5" />
											Table
										</span>
										<span className="font-jetbrains text-[10px] text-(--text-tertiary)">3×3</span>
									</Ariakit.MenuItem>
									<Ariakit.MenuItem
										onClick={onOpenEmbedPicker}
										className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span className="flex items-center gap-2">
											<Icon name="embed" className="h-3.5 w-3.5" />
											Embed
										</span>
										<span className="font-jetbrains text-[10px] text-(--text-tertiary)">URL</span>
									</Ariakit.MenuItem>
									<Ariakit.MenuItem
										onClick={() => document.dispatchEvent(new CustomEvent('article:trigger-image-upload'))}
										className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span className="flex items-center gap-2">
											<Icon name="image" className="h-3.5 w-3.5" />
											Image
										</span>
										<span className="font-jetbrains text-[10px] text-(--text-tertiary)">Upload</span>
									</Ariakit.MenuItem>
									<Ariakit.MenuItem
										onClick={() => document.dispatchEvent(new CustomEvent('article:open-people-panel-picker'))}
										className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span className="flex items-center gap-2">
											<Icon name="people" className="h-3.5 w-3.5" />
											People panel
										</span>
										<span className="font-jetbrains text-[10px] text-(--text-tertiary)">Bios</span>
									</Ariakit.MenuItem>
									<span aria-hidden className="my-1 h-px bg-(--cards-border)" />
									<Ariakit.MenuProvider>
										<Ariakit.MenuItem
											render={
												<Ariakit.MenuButton className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)">
													<span className="flex items-center gap-2">
														<Icon name="callout" className="h-3.5 w-3.5" />
														Callout
													</span>
													<span aria-hidden className="text-(--text-tertiary)">
														›
													</span>
												</Ariakit.MenuButton>
											}
										/>
										<Ariakit.Menu
											gutter={4}
											className="z-50 grid min-w-[140px] gap-0.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-xl"
										>
											{(['note', 'data', 'warning', 'pullquote'] as ArticleCalloutTone[]).map((tone) => (
												<Ariakit.MenuItem
													key={tone}
													onClick={() => insertCallout(tone)}
													className="rounded px-2 py-1.5 text-xs text-(--text-secondary) capitalize data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
												>
													{tone}
												</Ariakit.MenuItem>
											))}
										</Ariakit.Menu>
									</Ariakit.MenuProvider>
									<Ariakit.MenuItem
										onClick={insertCitation}
										className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs text-(--text-secondary) data-[active-item]:bg-(--link-button) data-[active-item]:text-(--link-text)"
									>
										<span className="flex items-center gap-2">
											<Icon name="cite" className="h-3.5 w-3.5" />
											Citation
										</span>
										<span className="font-jetbrains text-[10px] text-(--text-tertiary)">[n]</span>
									</Ariakit.MenuItem>
								</Ariakit.Menu>
							</Ariakit.MenuProvider>
						</div>

						<RailDivider />

						<div className="hidden shrink-0 items-center gap-3 px-2 font-jetbrains text-[10px] tracking-wider whitespace-nowrap text-(--text-tertiary) uppercase md:flex">
							<span>{wordCount.toLocaleString()} words</span>
							<span aria-hidden className="h-3 w-px bg-(--cards-border)" />
							<span>{readMins} min</span>
						</div>
					</div>
				</div>
			) : null}
		</>
	)
}
