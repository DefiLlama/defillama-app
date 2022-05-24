import React from 'react'
import styled from 'styled-components'
import { CheckCircle, Copy } from 'react-feather'
import { useCopyToClipboard } from 'react-use'

const CopyIcon = styled.button`
  flex-shrink: 0;
  text-decoration: none;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  padding: 2px 0;
  margin: 0;

  :hover,
  :active,
  :focus {
    text-decoration: none;
    opacity: 0.8;
    cursor: pointer;
  }

  & > svg {
    color: ${({ theme }) => theme.text1}
  }
`

export default function CopyHelper({ toCopy, ...props }) {
  const [{ value }, setCopied] = useCopyToClipboard()

  return (
    <CopyIcon onClick={() => setCopied(toCopy)} aria-label="Copy" {...props}>
      {value ? (
        <CheckCircle size={14} />
      ) : (
        <Copy size={14} />
      )}
    </CopyIcon>
  )
}
