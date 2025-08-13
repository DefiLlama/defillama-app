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
			className="p-2 flex flex-col gap-3 sm:flex-row rounded-md text-(--text-primary) hover:text-(--text-white) dark:hover:text-(--text-dark) focus-visible:text-(--text-white) dark:focus-visible:text-(--text-dark) bg-(--bg-light) dark:bg-(--bg-dark) whitespace-nowrap hover:bg-(--bg-active-light) dark:hover:bg-(--bg-active-dark) focus-visible:bg-(--bg-active-light) dark:focus-visible:bg-(--bg-active-dark)"
		>
			{imgSrc ? (
				<img className="object-cover rounded-sm h-[100px] sm:w-[200px] shrink-0" src={imgSrc} alt={headline} />
			) : null}
			<div className="flex flex-col gap-3 justify-between">
				<p className="text-sm font-medium whitespace-pre-wrap break-keep">{headline}</p>
				<div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
					<p className="text-xs text-(--text-primary)">{dayjs(date).format('MMMM D, YYYY')}</p>
					<p className="flex items-center justify-between flex-nowrap py-2 px-3 text-sm font-semibold rounded-md text-(--text-white) dark:text-(--text-dark) hover:text-(--text-white) dark:hover:text-(--text-dark) focus-visible:text-(--text-white) dark:focus-visible:text-(--text-dark) bg-(--bg-light) dark:bg-(--bg-dark) whitespace-nowrap hover:bg-(--bg-active-light) dark:hover:bg-(--bg-active-dark) focus-visible:bg-(--bg-active-light) dark:focus-visible:bg-(--bg-active-dark)">
						<span>Read on DL News</span> <Icon name="arrow-up-right" height={14} width={14} />
					</p>
				</div>
			</div>
		</a>
	)
}
