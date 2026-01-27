import { useState, useRef, useEffect } from 'react'
import { Icon } from '~/components/Icon'

interface ClippyInputProps {
	onSend: (message: string) => void
	isLoading: boolean
	placeholder?: string
}

export function ClippyInput({ onSend, isLoading, placeholder = 'Ask about this page...' }: ClippyInputProps) {
	const [value, setValue] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (value.trim() && !isLoading) {
			onSend(value)
			setValue('')
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder={placeholder}
				disabled={isLoading}
				className="flex-1 rounded-full border border-(--divider) bg-(--bg1) px-4 py-2 text-sm text-(--text1) placeholder:text-(--text3) focus:border-[#2172e5] focus:outline-none disabled:opacity-50"
			/>
			<button
				type="submit"
				disabled={!value.trim() || isLoading}
				className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2172e5] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{isLoading ? (
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
				) : (
					<Icon name="arrow-right" height={18} width={18} />
				)}
			</button>
		</form>
	)
}
