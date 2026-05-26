# DefiLlama

[DefiLlama](https://defillama.com) is the leading DeFi analytics and insights platform, providing comprehensive data on total value locked (TVL), yields, stablecoins, and more across all blockchain ecosystems

Check it out live at: https://defillama.com

## Features

- Real-time TVL tracking across 200+ chains and 6000+ protocols
- DeFi yield aggregation and comparison
- Stablecoin market analysis and tracking
- Protocol metrics and historical data
- Advanced search and filtering capabilities
- Responsive design for all devices

## Local Setup

#### 1. Clone the repository:

```bash
git clone https://github.com/DefiLlama/defillama-app.git
cd defillama-app
```

#### 2. Install dependencies:

```bash
bun install
```

#### 3. Configure environment variables:

```bash
cp .env.example .env.local
```

`ENABLE_LLAMASWAP_PROTOCOLS_CHAINS` is disabled by default. Set it to `true` or `1` only if you want metadata generation to build the buy-on-LlamaSwap protocol-chain dataset. When the variable is missing or set to `false`/`0`, that dataset stays empty.

#### 4. Start the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

- `bun run dev` starts plain Next.js development.
- `bun run dev:prepared` refreshes local generated data before starting Next.js development.
- `bun run build` refreshes generated metadata, dataset caches, site navigation, and `public/robots.txt`, then runs the Next.js production build with Webpack.
- `bun run build:next` runs plain `next build` without refreshing generated data.
- `bun run build:deploy` runs the self-hosted deploy wrapper, including build logs, artifact sync, and notifications.
- `bun run build:upload-r2` uploads `.next/static` build artifacts to Cloudflare R2.
- `bun run build:vercel` runs the standard production build, then uploads build artifacts to R2.
- `bun run start` starts a standard Next.js production server.
- `bun run start:docker` runs the Docker/self-hosted entrypoint, including the post-start hook.

## Vercel

Use the Next.js framework preset. If R2 artifact uploads are enabled, set the Build Command override to `bun run build:vercel`; otherwise leave Build Command, Output Directory, Install Command, and Development Command overrides disabled. Do not override the Build Command to `next build`, because that skips metadata cache, dataset cache, site navigation, robots.txt generation, and the repo's Webpack build fallback.

Set the required Vercel environment variables from `.env.example`. For production indexing, set `ROBOTS_ALLOW_INDEXING=true` only in the Production environment.

For R2 uploads on Vercel, set `RCLONE_CONFIG_ARTIFACTS_ACCESS_KEY_ID`, `RCLONE_CONFIG_ARTIFACTS_SECRET_ACCESS_KEY`, and `RCLONE_CONFIG_ARTIFACTS_ENDPOINT`. `R2_ARTIFACT_BUCKET` defaults to `defillama-app-artifacts`, `R2_ARTIFACT_SOURCE_DIR` defaults to `.next/static`, and `R2_ARTIFACT_PREFIX` is optional.

Do not set `NODE_OPTIONS` on Vercel for this project. The build wrapper applies the required heap setting only to the Next.js production build, and static generation memory is bounded in `next.config.ts`; setting Node flags globally can break Vercel's build runtime before Next.js starts.

## Contributing

Contributions are welcome. New features, small fixes, docs updates, whatever helps.

If you're adding a protocol adapter, check out [DefiLlama-Adapters](https://github.com/DefiLlama/DefiLlama-Adapters).

Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Before opening a PR:

1. Make sure it builds and runs locally
2. Keep changes focused and easy to review
3. Use clear commit messages

## Community

Join the conversation and stay up to date:

- [X/Twitter](https://x.com/DefiLlama)
- [Documentation](https://docs.llama.fi/)

## License

[GPL-3.0](./LICENSE)
