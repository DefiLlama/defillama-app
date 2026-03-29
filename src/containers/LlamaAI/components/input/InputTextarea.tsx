import * as Ariakit from '@ariakit/react'
import type { RefObject } from 'react'

interface InputTextareaProps {
	combobox: Ariakit.ComboboxStore
	promptInputRef: RefObject<HTMLTextAreaElement | null>
	highlightRef: RefObject<HTMLDivElement | null>
	value: string
	sanitizedHighlightedHtml: string
	placeholder: string
	isPending: boolean
	isStreaming?: boolean
	onScroll: () => void
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
	onPaste: (e: React.ClipboardEvent<Element>) => void
	onCompositionStart?: () => void
	onCompositionEnd?: () => void
}

export function InputTextarea({
	combobox,
	promptInputRef,
	highlightRef,
	value,
	sanitizedHighlightedHtml,
	placeholder,
	isPending,
	isStreaming,
	onScroll,
	onChange,
	onKeyDown,
	onPaste,
	onCompositionStart,
	onCompositionEnd
}: InputTextareaProps) {
	return (
		<div className="relative w-full">
			<Ariakit.Combobox
				store={combobox}
				autoSelect
				value={value}
				showOnClick={false}
				showOnChange={false}
				showOnKeyPress={false}
				setValueOnChange={false}
				render={
					<textarea
						ref={promptInputRef}
						value={value}
						rows={1}
						maxLength={8000}
						placeholder={placeholder}
						onScroll={onScroll}
						onPointerDown={combobox.hide}
						onChange={onChange}
						onKeyDown={onKeyDown}
						onPaste={onPaste}
						onCompositionStart={onCompositionStart}
						onCompositionEnd={onCompositionEnd}
						name="prompt"
						className="relative z-1 block thin-scrollbar min-h-4 w-full resize-none overflow-x-hidden overflow-y-hidden overscroll-contain border-0 bg-transparent p-0 leading-normal wrap-break-word whitespace-pre-wrap text-black caret-black outline-hidden placeholder:text-[#666] max-sm:text-base dark:text-white dark:caret-white placeholder:dark:text-[#919296]"
						autoCorrect="on"
						autoCapitalize="none"
						autoComplete="off"
						spellCheck
					/>
				}
				disabled={isPending && !isStreaming}
			/>
			<div
				aria-hidden="true"
				className="highlighted-text pointer-events-none absolute top-0 right-0 bottom-0 left-0 z-0 thin-scrollbar min-h-4 overflow-x-hidden overflow-y-hidden overscroll-contain p-0 leading-normal wrap-break-word whitespace-pre-wrap max-sm:text-base"
				ref={highlightRef}
				// Safe here: highlightWord escapes user text and only injects internal highlight spans.
				// eslint-disable-next-line react/no-danger
				dangerouslySetInnerHTML={{ __html: sanitizedHighlightedHtml }}
			/>
		</div>
	)
}
