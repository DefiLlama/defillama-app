import { useState, useRef, useEffect } from 'react'

import { ButtonLight, ButtonDark } from 'components/ButtonStyled'
import { BasicLink } from 'components/Link'
import DropdownSelect from 'components/DropdownSelect'
import Row from 'components/Row'

import { useResize } from 'hooks'
const letterPxLength = 8
const marginPxLength = 6.4
const paddingPxLenggth = 24

// filter option to, and label,
const FiltersAndDropdown = ({ filterOptions = [], activeLabel, areLinks, onFilterClick }) => {
  const [visibleFiltersIndex, setVisibileFilterIndex] = useState(0)
  const mainWrapEl = useRef(null)
  const { width: mainWrapWidth } = useResize(mainWrapEl)
  const stringifyFilterOptions = JSON.stringify(filterOptions)

  useEffect(() => {
    let remainingWidth = mainWrapWidth - 120
    let lastIndexOfFilters = 0

    filterOptions.forEach(({ label }) => {
      if (remainingWidth < 0) return
      remainingWidth -= marginPxLength + paddingPxLenggth + label.length * letterPxLength
      lastIndexOfFilters += 1
    })
    setVisibileFilterIndex(lastIndexOfFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainWrapWidth, stringifyFilterOptions])

  const clickableFilters = filterOptions.slice(0, visibleFiltersIndex)
  const dropdownFilters = filterOptions.slice(visibleFiltersIndex, filterOptions.length)

  return (
    <Row sx={{ maxWidth: '100%' }} ref={mainWrapEl}>
      {clickableFilters.map(({ label, to }) => {
        if (label === activeLabel) {
          return (
            <ButtonDark style={{ margin: '0.2rem' }} key={label}>
              {label}
            </ButtonDark>
          )
        } else {
          return areLinks ? (
            <BasicLink href={to} key={label}>
              <ButtonLight style={{ margin: '0.2rem' }}>{label}</ButtonLight>
            </BasicLink>
          ) : (
            <ButtonLight onClick={onFilterClick} style={{ margin: '0.2rem' }}>
              {label}
            </ButtonLight>
          )
        }
      })}
      {visibleFiltersIndex !== filterOptions.length && (
        <DropdownSelect
          options={dropdownFilters}
          active={dropdownFilters.some(label => label.label === activeLabel) ? activeLabel : 'Others'}
        />
      )}
    </Row>
  )
}
export default FiltersAndDropdown
