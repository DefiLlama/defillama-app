import { useComboboxState } from 'ariakit/combobox'
import { MenuButtonArrow, useMenuState } from 'ariakit/menu'
import Link from 'next/link'
import { Button, Input, Item, List, Popover } from './shared'

interface IMenuComboboxProps {
  options: { label: string; to: string }[]
  name: string
}

export function MenuCombobox({ options, name }: IMenuComboboxProps) {
  const defaultList = options.map((l) => l.to)
  const combobox = useComboboxState({ defaultList })
  const menu = useMenuState(combobox)

  // Resets combobox value when menu is closed
  if (!menu.mounted && combobox.value) {
    combobox.setValue('')
  }

  return (
    <>
      <Button state={menu}>
        <span>{name}</span>
        <MenuButtonArrow />
      </Button>
      <Popover state={menu} composite={false}>
        <Input state={combobox} autoSelect placeholder="Search..." />
        <List state={combobox}>
          {combobox.matches.length > 0 ? (
            combobox.matches.map((value, i) => (
              <Link href={value} key={value + i} passHref>
                <Item value={value} focusOnHover setValueOnClick={false} role="link">
                  {options.find((l) => l.to === value)?.label ?? value}
                </Item>
              </Link>
            ))
          ) : (
            <p id="no-results">No results</p>
          )}
        </List>
      </Popover>
    </>
  )
}
