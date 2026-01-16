import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'

export function CopyHelper({ toCopy, ...props }) {
	const [copied, setCopied] = useState(false)
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
		}
	}, [])
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(toCopy)
			setCopied(true)
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
			copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.error('Failed to copy content:', error)
			toast.error('Failed to copy content')
		}
	}
	return (
		<button
			className="flex shrink-0 items-center p-0.5 hover:opacity-80 focus-visible:opacity-80"
			onClick={copy}
			aria-label="Copy"
			{...props}
		>
			{copied ? <Icon name="check-circle" height={14} width={14} /> : <Icon name="copy" height={14} width={14} />}
		</button>
	)
}
