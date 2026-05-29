import Link from 'next/link'
import type React from 'react'

export interface ReadMoreLinkProps {
	url: string
	title: string
}

export const ReadMoreLink: React.FC<ReadMoreLinkProps> = ({ url, title }) => {
	const isExternalLink = url.startsWith('http')

	return (
		<Link
			href={url}
			className="inline-flex items-center gap-x-2 text-[12px] font-medium uppercase"
			rel={isExternalLink ? 'noopener noreferrer' : undefined}
			style={{ color: '#237BFF' }}
			target={isExternalLink ? '_blank' : undefined}
		>
			<span>{title}</span>
			<span aria-hidden>→</span>
		</Link>
	)
}
