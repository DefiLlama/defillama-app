import * as Ariakit from '@ariakit/react'
import { RefObject } from 'react'

interface InputTextareaProps {
	combobox: Ariakit.ComboboxStore
	promptInputRef: RefObject<HTMLTextAreaElement>
	highlightRef: RefObject<HTMLDivElement>
	value: string
	placeholder: string
	isPending: boolean
	isStreaming?: boolean
	onScroll: () => void
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
	onPaste: (e: React.ClipboardEvent) => void
	onCompositionStart?: () => void
	onCompositionEnd?: () => void
}

export function InputTextarea({
	combobox,
	promptInputRef,
	highlightRef,
	value,
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
						rows={1}
						maxLength={2000}
						placeholder={placeholder}
						onScroll={onScroll}
						onPointerDown={combobox.hide}
						onChange={onChange}
						onPaste={onPaste}
						onCompositionStart={onCompositionStart}
						onCompositionEnd={onCompositionEnd}
						name="prompt"
						className="relative z-1 block thin-scrollbar min-h-4 w-full resize-none overflow-x-hidden overflow-y-auto border-0 bg-transparent p-0 leading-normal wrap-break-word whitespace-pre-wrap text-transparent caret-black outline-none placeholder:text-[#666] max-sm:text-base dark:caret-white placeholder:dark:text-[#919296]"
						autoCorrect="on"
						autoCapitalize="none"
						autoComplete="off"
						spellCheck
					/>
				}
				disabled={isPending && !isStreaming}
			/>
			<div
				className="highlighted-text pointer-events-none absolute top-0 right-0 bottom-0 left-0 z-0 thin-scrollbar min-h-4 overflow-x-hidden overflow-y-auto p-0 leading-normal wrap-break-word whitespace-pre-wrap max-sm:text-base"
				ref={highlightRef}
			/>
		</div>
	)
}
