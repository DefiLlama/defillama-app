import { useState } from 'react'
import { Icon } from '~/components/Icon'

export default function CopyHelper({ toCopy, ...props }) {
	const [copied, setCopied] = useState(false)
	const copy = () => {
		navigator.clipboard.writeText(toCopy)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}
	return (
		<button
			className="flex-shrink-0 flex items-center p-[2px] hover:opacity-80 focus-visible:opacity-80"
			onClick={copy}
			aria-label="Copy"
			{...props}
		>
			{copied ? <Icon name="check-circle" height={14} width={14} /> : <Icon name="copy" height={14} width={14} />}
		</button>
	)
}
