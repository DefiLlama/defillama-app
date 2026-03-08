import type { CSSProperties } from 'react'
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

	const textStyle: CSSProperties & Record<'--text-size' | '--weight', string | number> = {
		'--text-size': fontSize ?? 'inherit',
		'--weight': fontWeight
	}

	if (typeof maxCharacters === 'number' && text.length > maxCharacters) {
		return (
			<Tooltip content={text}>
				<span
					data-link={link ?? false}
					style={textStyle}
					className="cursor-pointer overflow-hidden font-(--weight) text-ellipsis whitespace-nowrap text-(--text-size) data-[link=true]:text-(--blue)"
				>
					{text}
				</span>
			</Tooltip>
		)
	}

	return (
		<span
			data-link={link ?? false}
			style={textStyle}
			className="overflow-hidden font-(--weight) text-ellipsis whitespace-nowrap text-(--text-size) data-[link=true]:text-(--blue)"
		>
			{text}
		</span>
	)
}
