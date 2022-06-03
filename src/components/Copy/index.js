import React, { useState } from 'react'
import styled from 'styled-components'
import { CheckCircle, Copy } from 'react-feather'

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
  :focus-visible {
    text-decoration: none;
    opacity: 0.8;
    cursor: pointer;
  }

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
  }

  & > svg {
    color: ${({ theme }) => theme.text1};
  }
`

export default function CopyHelper({ toCopy, ...props }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(toCopy)
    setCopied(true)
  }
  return (
    <CopyIcon onClick={copy} aria-label="Copy" {...props}>
      {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
    </CopyIcon>
  )
}
