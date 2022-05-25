import { DefaultMenuButton, DropdownMenuContent, DropdownMenu, DefaultMenuItem } from 'components/DropdownMenu'
import HeadHelp from 'components/HeadHelp'
import React from 'react'
import { ChevronDown } from 'react-feather'
import styled from 'styled-components'

const Audits = styled.section`
  display: flex;
  align-items: center;
  gap: 8px;
`

interface IProps {
  audits: number
  auditLinks: string[]
}

const AuditInfo = ({ audits, auditLinks = [], ...props }: IProps) => {
  return (
    <Audits {...props}>
      <HeadHelp title="Audits" text="Audits are not a guarantee of security." />
      {' : '}
      {audits > 0 ? (
        <DropdownMenu>
          <DefaultMenuButton>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Yes</span>
            <ChevronDown size={16} style={{ flexShrink: '0' }} />
          </DefaultMenuButton>
          <DropdownMenuContent sideOffset={5} style={{ maxWidth: '300px' }}>
            {auditLinks?.map((d) => (
              <DefaultMenuItem key={d}>
                <a href={d} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                  {d}
                </a>
              </DefaultMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span>No</span>
      )}
    </Audits>
  )
}

export default AuditInfo
