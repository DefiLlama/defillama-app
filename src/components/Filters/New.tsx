import { ButtonDark, ButtonLight } from 'components/ButtonStyled'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'

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
  gap: ${GAP}px;
  margin: 0;
  padding: 4px;
  white-space: nowrap;
  & > li {
    list-style: none;
    display: inline-block;
  }

  & > li + li {
    margin-left: 8px;
  }
`

const Filters = ({ filterOptions = [], activeLabel, ...props }: FiltersProps) => {
  const [lastIndexToRender, setLastIndexToRender] = useState(filterOptions.length)

  const calcFiltersToRender = useCallback(() => {
    if (typeof document !== 'undefined') {
      // wrapper element of filters
      const listSize = document.querySelector('#priority-nav')?.getBoundingClientRect()

      let width = 0

      let stopIndex = null

      filterOptions.forEach((_, index) => {
        if (!listSize || stopIndex) return null

        const el = document.querySelector(`#priority-nav-el-${index}`)?.getBoundingClientRect()

        if (el) {
          if (width + el.width > listSize.width && stopIndex === null) {
            stopIndex = index
          }
          width += el.width + GAP
        }
      })

      return stopIndex
    }
  }, [filterOptions])

  useEffect(() => {
    const setIndexToFilterFrom = () => {
      const index = calcFiltersToRender()

      if (index !== null) {
        setLastIndexToRender(index)
      }
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
    const filters = lastIndexToRender > 0 ? filterOptions.slice(0, lastIndexToRender - 1) : filterOptions

    const menuFilters = lastIndexToRender > 0 ? filterOptions.slice(filters.length - 1) : null

    return { filters, menuFilters }
  }, [filterOptions, lastIndexToRender])

  return (
    <>
      <Wrapper id="priority-nav" {...props}>
        {filters.map((option, index) => (
          <Filter key={option.label} option={option} activeLabel={activeLabel} id={`priority-nav-el-${index}`} />
        ))}
      </Wrapper>
      {menuFilters && (
        <select>
          <option>Others</option>
          {menuFilters.map((o) => (
            <option value={o.to} key={o.to}>
              {o.label}
            </option>
          ))}
        </select>
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
