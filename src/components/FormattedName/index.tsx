import * as React from 'react'
import { Tooltip } from '~/components/Tooltip'

interface WrapperProps {
	fontSize?: string | number
	fontWeight?: number
	maxCharacters?: number
	link?: boolean
}

interface IFormattedNameProps extends WrapperProps {
	text: string
}

export const FormattedName = ({ text, maxCharacters, fontSize, fontWeight = 400, link }: IFormattedNameProps) => {
	if (!text) {
		return null
	}

	if (text.length > maxCharacters) {
		return (
			<Tooltip content={text}>
				<span
					data-link={link ?? false}
					style={{ '--text-size': fontSize ?? 'inherit', '--weight': fontWeight ?? 400 } as any}
					className="overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer text-[var(--text-size)] font-[var(--weight)] data-[link=true]:text-[var(--blue)]"
				>
					{text}
				</span>
			</Tooltip>
		)
	}

	return (
		<span
			data-link={link ?? false}
			style={{ '--text-size': fontSize ?? 'inherit', '--weight': fontWeight ?? 400 } as any}
			className="overflow-hidden text-ellipsis whitespace-nowrap text-[var(--text-size)] font-[var(--weight)] data-[link=true]:text-[var(--blue)]"
		>
			{text}
		</span>
	)
}
