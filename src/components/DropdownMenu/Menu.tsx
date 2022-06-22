import { MenuButtonArrow, useMenuState } from 'ariakit/menu'
import Link from 'next/link'
import { Button, Item, Popover } from './shared'

interface IMenuProps {
  options: string[]
  name: string
  color?: string
  isExternal?: boolean
  onItemClick?: (value: any) => void
}

export function Menu({ options, name, color, isExternal, onItemClick }: IMenuProps) {
  const menu = useMenuState({ gutter: 8 })

  return (
    <>
      <Button state={menu} className="button" color={color}>
        {name}
        <MenuButtonArrow />
      </Button>
      <Popover state={menu} className="menu">
        {options.map((value, i) => {
          return onItemClick ? (
            <Item as="button" key={value + i} onClick={() => onItemClick(value)}>
              {value}
            </Item>
          ) : isExternal ? (
            <a href={value} target="_blank" rel="noopener noreferrer" key={value + i}>
              <Item>{value}</Item>
            </a>
          ) : (
            <Link href={value} key={value + i} passHref>
              <Item>{value}</Item>
            </Link>
          )
        })}
      </Popover>
    </>
  )
}
