# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `yarn dev` - Start development server (automatically runs `build:metadata` first)
- `yarn` - Install dependencies
- `yarn build` - Build production version (runs `build:metadata` first)
- `yarn start` - Start production server

### Code Quality

- `yarn lint` - Run ESLint
- `yarn format` - Format code with Prettier
- `yarn ts` - Run TypeScript type checking without emitting files

### Utility

- `yarn build:metadata` - Pull metadata from external sources (required before dev/build)
- `yarn analyze` - Build with bundle analyzer
- `yarn convert-spec` - Convert API specification files

## Architecture

### Technology Stack

- **Framework**: Next.js 15 (App Router not used - pages directory structure)
- **React**: 19.1.0 with TypeScript
- **Styling**: Tailwind CSS 4.x with PostCSS
- **State Management**: React Query (@tanstack/react-query) for server state
- **Charts**: ECharts library for data visualization
- **Authentication**: PocketBase for auth with custom AuthProvider
- **Web3**: Wagmi + Viem for blockchain interactions
- **Search**: Meilisearch with React InstantSearch

### Project Structure

- `src/pages/` - Next.js pages (not App Router)
- `src/components/` - Reusable UI components
- `src/containers/` - Page-specific container components
- `src/api/` - API utilities and client functions
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions
- `src/layout/` - Layout components
- `src/constants/` - Application constants
- `src/contexts/` - React contexts
- `public/` - Static assets
- `scripts/` - Build and deployment scripts

### Key Architectural Patterns

- **Component Organization**: Components are organized by feature/domain in containers, with shared components in the components directory
- **Data Fetching**: Uses React Query for server state management with custom hooks
- **Styling**: Tailwind CSS with custom utility classes and CSS variables for theming
- **Charts**: ECharts wrapper components with TypeScript interfaces for props
- **Routing**: Next.js file-based routing with extensive URL redirects in next.config.js
- **Type Safety**: TypeScript with interfaces defined in types.ts files throughout the codebase

### Configuration

- TypeScript config disables strict mode but enables forceConsistentCasingInFileNames
- Path aliases: `~/*` maps to `./src/*` and `~/public/*` maps to `./public/*`
- Static page generation timeout increased to 5 minutes for large datasets
- Image optimization configured for external domains (icons.llama.fi, etc.)

### Data Flow

- External APIs provide DeFi protocol data and metrics
- Metadata is pulled during build process via `scripts/pullMetadata.js`
- React Query manages caching and synchronization of server state
- Charts consume processed data through ECharts wrapper components
- Search functionality uses Meilisearch instance search

### Development Notes

- Development server requires metadata build step before starting
- Uses Redis (ioredis) for caching in production
- Extensive URL redirect configuration for legacy route compatibility
- Analytics integration with Fathom
- Bundle analysis available via `yarn analyze`

## Coding Style Guidelines

- **File Naming**: Use PascalCase for React components (`ChainOverview.tsx`), camelCase for utilities (`useAnalytics.tsx`), lowercase-with-dashes for directories (`chain-overview/`)
- **TypeScript**: Use interfaces with `I` prefix for props (`IChartProps`), avoid `any` type, use named exports for components (default exports only for pages)
- **Imports**: Use path aliases `~/` for src imports, group imports by: external libraries, internal components, utilities, types
- **Components**: Use React.memo() for performance-critical components, functional components with hooks, place logic (state, effects) at top of function
- **Styling**: Use Tailwind CSS with CSS custom properties for theming (`--cards-bg`, `--text1`), use data attributes for conditional styling (`data-[align=center]:justify-center`)
- **Data Management**: Use React Query for server state, utility functions from `~/utils` for formatting (`formattedNum()`, `formattedPercent()`), proper useEffect cleanup
- **Performance**: Use virtualization for large lists (@tanstack/react-virtual), React.lazy() for code splitting, useCallback/useMemo for optimization
