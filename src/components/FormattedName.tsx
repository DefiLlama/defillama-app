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

type FormattedNameStyle = React.CSSProperties & { '--text-size': string | number; '--weight': number }

export const FormattedName = ({ text, maxCharacters, fontSize, fontWeight = 400, link }: IFormattedNameProps) => {
	if (!text) {
		return null
	}

	if (typeof maxCharacters === 'number' && text.length > maxCharacters) {
		const textStyle: FormattedNameStyle = { '--text-size': fontSize ?? 'inherit', '--weight': fontWeight ?? 400 }
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
	const textStyle: FormattedNameStyle = { '--text-size': fontSize ?? 'inherit', '--weight': fontWeight ?? 400 }

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
