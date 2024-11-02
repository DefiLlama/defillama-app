import { Combobox, ComboboxItem, ComboboxList, useComboboxState } from 'ariakit/combobox'
import { Menu, MenuButton, MenuButtonArrow, useMenuState } from 'ariakit/menu'
import Link from 'next/link'
import { useSetPopoverStyles } from '~/components/Popover/utils'

interface IProps {
	options: { label: string; to: string }[]
	name: string
	isActive: boolean
	className?: string
}

export function OtherLinks({ options, name, isActive, className, ...props }: IProps) {
	const defaultList = options.map((l) => l.to)

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const combobox = useComboboxState({ list: defaultList, gutter: 8, animated: isLarge ? false : true, renderCallback })

	const menu = useMenuState(combobox)

	// Resets combobox value when menu is closed
	if (!menu.mounted && combobox.value) {
		combobox.setValue('')
	}

	return (
		<>
			<MenuButton
				state={menu}
				{...props}
				data-active={isActive}
				className={`h-9 flex items-center gap-4 my-auto rounded-xl py-2 px-3 whitespace-nowrap font-medium text-sm text-black dark:text-white bg-[var(--link-bg)]  hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--link-active-bg)] data-[active=true]:text-white ${
					className ?? ''
				}`}
			>
				<span>{name}</span>
				<MenuButtonArrow className="relative top-[1px]" />
			</MenuButton>
			{menu.mounted ? (
				<Menu
					state={menu}
					composite={false}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					<Combobox
						state={combobox}
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md py-2 px-3 m-3 mb-0"
					/>
					{combobox.matches.length > 0 ? (
						<ComboboxList state={combobox} className="flex flex-col overflow-auto overscroll-contain">
							{combobox.matches.map((value, i) => (
								<Link href={value} key={value + i} prefetch={false} passHref>
									<ComboboxItem
										value={value}
										focusOnHover
										setValueOnClick={false}
										role="link"
										className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
									>
										{options.find((l) => l.to === value)?.label ?? value}
									</ComboboxItem>
								</Link>
							))}
						</ComboboxList>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}
				</Menu>
			) : null}
		</>
	)
}
