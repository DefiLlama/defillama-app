import { ButtonDark, ButtonLight } from 'components/ButtonStyled'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from 'components/DropdownMenu'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { ChevronDown } from 'react-feather'
import { useRouter } from 'next/router'

interface IFilterOption {
  label: string
  to: string
}

interface FiltersProps {
  filterOptions: IFilterOption[]
  activeLabel?: string
}

const GAP = 6

const Wrapper = styled.ul`
  flex: 1;
  overflow: hidden;
  margin: 0;
  padding: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: ${GAP}px;
  max-height: calc(1.8rem + 4px);

  & > li {
    list-style: none;
    display: inline-block;
  }
`

export const FiltersWrapper = styled.nav`
  display: flex;
  align-items: center;
  gap: 20px;
  overflow: hidden;

  & > ul {
    padding: 4px 0;
  }
`

const Filters = ({ filterOptions = [], activeLabel, ...props }: FiltersProps) => {
  const [lastIndexToRender, setLastIndexToRender] = useState<number | null | 'renderMenu'>(null)

  const router = useRouter()

  const calcFiltersToRender = useCallback(() => {
    if (typeof document !== 'undefined') {
      const priorityNav = document.querySelector('#priority-nav')

      const wrapper = priorityNav?.getBoundingClientRect()

      let indexToCutFrom = null

      if (!priorityNav) return null

      if (priorityNav.childNodes?.length > 2 && wrapper?.width <= 600) {
        return 'renderMenu'
      }

      priorityNav.childNodes?.forEach((_, index) => {
        if (indexToCutFrom !== null) return

        const link = document.querySelector(`#priority-nav-el-${index}`)
        const linkSize = link.getBoundingClientRect()

        if (linkSize.top - wrapper.top > wrapper.height || linkSize.left + GAP * 2 > wrapper.right - 150) {
          indexToCutFrom = index
        }
      })

      return indexToCutFrom
    }
  }, [])

  useEffect(() => {
    const setIndexToFilterFrom = () => {
      const index = calcFiltersToRender()

      setLastIndexToRender(index)
    }

    // set index to filter from on initial render
    setIndexToFilterFrom()

    // listen to window resize events and reset index to filter from
    window.addEventListener('resize', () => {
      setLastIndexToRender(null)
      setIndexToFilterFrom()
    })

    return () =>
      window.removeEventListener('resize', () => {
        setLastIndexToRender(null)
        setIndexToFilterFrom()
      })
  }, [calcFiltersToRender])

  const { filters, menuFilters } = useMemo(() => {
    if (lastIndexToRender === 'renderMenu') {
      return { filters: null, menuFilters: filterOptions }
    }

    const filters = lastIndexToRender ? filterOptions.slice(0, lastIndexToRender - 1) : filterOptions

    const menuFilters = lastIndexToRender ? filterOptions.slice(filters.length) : null

    return { filters, menuFilters }
  }, [filterOptions, lastIndexToRender])

  return (
    <>
      {filters && (
        <Wrapper id="priority-nav" {...props}>
          {filters.map((option, index) => (
            <Filter key={option.label} option={option} activeLabel={activeLabel} id={`priority-nav-el-${index}`} />
          ))}
        </Wrapper>
      )}
      {menuFilters && (
        <DropdownMenu>
          <DropdownMenuTrigger style={{ width: '8rem', margin: '4px', marginLeft: !filters ? 'auto' : '4px' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {menuFilters.find((label) => label.label === activeLabel) ? activeLabel : 'Others'}
            </span>
            <ChevronDown size={16} style={{ flexShrink: '0' }} />
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={5}>
            <DropdownMenuLabel>Others</DropdownMenuLabel>
            {menuFilters.map((o) => (
              <DropdownMenuItem key={o.to} onSelect={() => router.push(o.to)} role="link">
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )
}

const Filter = ({ option, activeLabel, ...props }) => {
  return (
    <li {...props}>
      <Link href={option.to} prefetch={false} passHref>
        {option.label === activeLabel ? (
          <ButtonDark role="link">{option.label}</ButtonDark>
        ) : (
          <ButtonLight role="link">{option.label}</ButtonLight>
        )}
      </Link>
    </li>
  )
}

export default Filters
