import { useState } from 'react'
import styled from 'styled-components'
import { CheckCircle, Copy } from 'react-feather'

const CopyIcon = styled.button`
	flex-shrink: 0;
	display: flex;
	align-items: center;
	padding: 2px 0;

	&:hover,
	&:active,
	&:focus-visible {
		opacity: 0.8;
	}

	& > svg {
		color: ${({ theme }) => theme.text1};
	}
`

export default function CopyHelper({ toCopy, ...props }) {
	const [copied, setCopied] = useState(false)
	const copy = () => {
		navigator.clipboard.writeText(toCopy)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}
	return (
		<CopyIcon onClick={copy} aria-label="Copy" {...props}>
			{copied ? <CheckCircle size={14} /> : <Copy size={14} />}
		</CopyIcon>
	)
}
