import dayjs from 'dayjs'
import { transparentize } from 'polished'
import { Icon } from '~/components/Icon'
import { primaryColor } from '~/constants/colors'
import { IArticle } from '~/containers/ProtocolOverview/types'

interface INewsCardProps extends IArticle {
	color: string
}

export const NewsCard = ({ imgSrc, href, headline, date, color }: INewsCardProps) => {
	return (
		<a
			style={
				{
					'--bg-light': transparentize(0.9, color ?? '#445ed0'),
					'--bg-dark': transparentize(0.9, color ?? primaryColor),
					'--bg-active-light': transparentize(0.8, color ?? '#445ed0'),
					'--bg-active-dark': transparentize(0.8, color ?? primaryColor)
				} as any
			}
			href={href}
			target="_blank"
			rel="noreferrer noopener"
			className="flex flex-col gap-3 rounded-md bg-(--bg-light) p-2 whitespace-nowrap text-(--text-primary) hover:bg-(--bg-active-light) hover:text-(--text-white) focus-visible:bg-(--bg-active-light) focus-visible:text-(--text-white) sm:flex-row dark:bg-(--bg-dark) dark:hover:bg-(--bg-active-dark) dark:hover:text-(--text-dark) dark:focus-visible:bg-(--bg-active-dark) dark:focus-visible:text-(--text-dark)"
		>
			{imgSrc ? (
				<img className="h-[100px] shrink-0 rounded-sm object-cover sm:w-[200px]" src={imgSrc} alt={headline} />
			) : null}
			<div className="flex flex-col justify-between gap-3">
				<p className="text-sm font-medium break-keep whitespace-pre-wrap">{headline}</p>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<p className="text-xs text-(--text-primary)">{dayjs(date).format('MMMM D, YYYY')}</p>
					<p className="flex flex-nowrap items-center justify-between rounded-md bg-(--bg-light) px-3 py-2 text-sm font-semibold whitespace-nowrap text-(--text-white) hover:bg-(--bg-active-light) hover:text-(--text-white) focus-visible:bg-(--bg-active-light) focus-visible:text-(--text-white) dark:bg-(--bg-dark) dark:text-(--text-dark) dark:hover:bg-(--bg-active-dark) dark:hover:text-(--text-dark) dark:focus-visible:bg-(--bg-active-dark) dark:focus-visible:text-(--text-dark)">
						<span>Read on DL News</span> <Icon name="arrow-up-right" height={14} width={14} />
					</p>
				</div>
			</div>
		</a>
	)
}
