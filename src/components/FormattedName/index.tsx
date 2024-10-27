import * as React from 'react'
import { Tooltip } from '~/components/Tooltip'

interface WrapperProps {
	fontSize?: string | number
	fontWeight?: number
	maxCharacters?: number
}

interface IFormattedNameProps extends WrapperProps {
	text: string
}

const FormattedName = ({ text, maxCharacters, fontSize, fontWeight = 400 }: IFormattedNameProps) => {
	if (!text) {
		return null
	}

	if (text.length > maxCharacters) {
		return (
			<Tooltip content={text}>
				<span
					style={{ '--text-size': fontSize ?? 'inherit', '--weight': fontWeight ?? 400 } as any}
					className="overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer text-[var(--text-size)] font-[var(--weight)]"
				>
					{text}
				</span>
			</Tooltip>
		)
	}

	return (
		<span
			style={{ '--text-size': fontSize ?? 'inherit', '--weight': fontWeight ?? 400 } as any}
			className="overflow-hidden text-ellipsis whitespace-nowrap text-[var(--text-size)] font-[var(--weight)]"
		>
			{text}
		</span>
	)
}

export default FormattedName
