import React from 'react'
import styled from 'styled-components'
import { useTable, useSortBy } from 'react-table'
import { v4 as uuid } from 'uuid'
import Panel from 'components/Panel'
import { ArrowDown, ArrowUp } from 'react-feather'

const Wrapper = styled(Panel)`
  padding-top: 6px;
  color: ${({ theme }) => theme.text1};
  overflow-x: auto;

  table {
    border-spacing: 0;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }

      & > * {
        padding: 12px 0;
      }
    }

    th,
    td {
      margin: 0;
      border-bottom: 1px solid;
      border-color: ${({ theme }) => theme.divider};
      text-align: end;
      font-size: 14px;
      padding-left: 12px;

      :first-child {
        text-align: start;
      }

      :last-child {
        border-right: 0;
      }
    }

    th {
      font-weight: 400;
      white-space: nowrap;
    }
  }
`

const IconWrapper = styled.span`
  position: relative;
  top: 2px;
  left: 4px;
`

export const Index = styled.div`
  display: flex;
  gap: 1em;
`

function Table({ columns, data }) {
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
    {
      columns,
      data,
    },
    useSortBy
  )

  const firstPageRows = rows

  return (
    <Wrapper>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()} key={uuid()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())} key={uuid()}>
                  {column.render('Header')}
                  {/* Add a sort direction indicator */}
                  <IconWrapper>
                    {column.isSorted ? column.isSortedDesc ? <ArrowDown size={14} /> : <ArrowUp size={14} /> : ''}
                  </IconWrapper>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {firstPageRows.map((row) => {
            prepareRow(row)
            return (
              <tr {...row.getRowProps()} key={uuid()}>
                {row.cells.map((cell) => {
                  return (
                    <td {...cell.getCellProps()} key={uuid()}>
                      {cell.render('Cell')}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </Wrapper>
  )
}

export default Table
