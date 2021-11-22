import styled from 'styled-components'
import { Box } from 'rebass/styled-components'

const Row = styled(Box)`
  width: 100%;
  display: flex;
  padding: 0;
  align-items: center;
  align-items: ${({ align }) => align && align};
  padding: ${({ padding }) => padding};
  border: ${({ border }) => border};
  border-radius: ${({ borderRadius }) => borderRadius};
  justify-content: ${({ justify }) => justify};
`

export const RowBetween = styled(Row)`
  justify-content: space-between;
`

export const RowFlat = styled(Box)`
  display: flex;
  align-items: flex-end;
`

export const AutoRow = styled(Row)`
  flex-wrap: ${({ wrap }) => wrap ?? 'nowrap'};
  margin: -${({ gap }) => gap};
  & > * {
    margin: ${({ gap }) => gap} !important;
  }
`

export const RowFixed = styled(Row)`
  width: fit-content;
`

export default Row

// const Row = ({ children, ...props }) => (
//   <Box display="flex" width="100%" alignItems="center" p={0} {...props}>
//     {children}
//   </Box>
// )

// export const RowBetween = ({ children, ...props }) => (
//   <Row justifyContent="space-between" {...props}>
//     {children}
//   </Row>
// )

// export const RowFlat = ({ children, ...props }) => (
//   <Box display="flex" alignItems="flex-end" {...props}>
//     {children}
//   </Box>
// )

// export const AutoRow = styled(Row)`
//   flex-wrap: ${({ wrap }) => wrap ?? 'nowrap'};
//   margin: -${({ gap }) => gap};
//   & > * {
//     margin: ${({ gap }) => gap} !important;
//   }
// `

// export const RowFixed = ({ children, ...props }) => (
//   <Row width="fit-content" {...props}>
//     {children}
//   </Row>
// )

// export default Row
