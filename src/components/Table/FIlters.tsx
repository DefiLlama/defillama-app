import Popover from 'components/Popover'
import { Filter } from 'react-feather'

export function TableFilters() {
  return (
    <Popover
      trigger={
        <>
          <Filter size={14} />
          <span>Filters</span>
        </>
      }
      content={<div style={{ height: '240px', width: '240px', background: 'red' }}>Table Filter</div>}
    />
  )
}
