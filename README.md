# WikiOS

WikiOS turns an Obsidian vault into a local web app. It lets you browse notes through a homepage, search, article pages, a graph view, and stats.

Built by [Ansub](http://twitter.com/ansubkhan), co-founder of [Supafast](https://withsupafast.com/?utm_source=github&utm_medium=readme&utm_campaign=wikios) - we build websites for B2B SaaS & AI companies.


<img width="3024" height="1324" alt="CleanShot 2026-04-12 at 21 10 31@2x" src="https://github.com/user-attachments/assets/86ca9f3e-db4b-4a21-96bc-fe18ba346ece" />

## What it does

- Connects to an Obsidian-compatible markdown folder
- Builds a local searchable index
- Gives you a clean web interface for exploring your notes
- Watches the vault for changes and updates the index automatically

## How to get started

Clone and launch:

```bash
git clone https://github.com/Ansub/wiki-os.git wiki-os && cd wiki-os && npm run first-run
```

WikiOS will open in your browser and guide you through choosing a vault. You can also use the bundled demo vault on first run.

## Features

- Homepage with featured notes, recent notes, and people highlights
- Fast local search
- Clean article pages
- Graph view
- **3D Globe view** - Interactive 3D visualization of your wiki knowledge graph
- Stats view
- Manual reindex support
- Automatic file watching
- Local-first setup with no cloud requirement

### Docker

You can run WikiOS with Docker if you want a simple container setup.

This starts WikiOS with the bundled demo vault:

```bash
docker compose up --build
```

The `docker-compose.yml` file is in the main project folder.

By default, Docker uses the demo notes in `sample-vault/`.

If you want to use your own Obsidian vault instead:

1. Open `docker-compose.yml`
2. Find this line:

```yml
- ./sample-vault:/vault:ro
```

3. Replace `./sample-vault` with the path to your own vault

Example:

```yml
- /Users/your-name/Documents/MyVault:/vault:ro
```

Leave `WIKI_ROOT: /vault` as it is.

For a direct build and run:

```bash
docker build -t wiki-os .
docker run --rm -p 5211:5211 -e WIKI_ROOT=/vault -v /path/to/your/vault:/vault:ro -v wiki-os-data:/data wiki-os
```

## 3D Globe Visualization

WikiOS now includes an interactive 3D globe view that visualizes your wiki knowledge graph in a stunning spherical layout. Access it via the "3D Globe" link in the navigation or by visiting `/globe3d`.

### Features

- **Spherical Layout**: Wiki articles arranged on a 3D sphere for spatial understanding
- **Interactive Navigation**: Drag to rotate, scroll to zoom, click nodes to focus
- **Real-time Search**: Find concepts instantly with camera animation to selected nodes
- **Smart Labels**: Node titles appear when zoomed in for clarity
- **Color-coded Nodes**: Different categories have distinct colors for easy identification
- **Light Gray Connections**: Clean, subtle edge lines showing wiki link relationships
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### Using the 3D Globe

1. **Navigate** to the 3D Globe view from the main menu
2. **Search** for concepts using the search box - the camera will smoothly animate to focus on your selection
3. **Explore** by dragging to rotate the globe and scrolling to zoom in/out
4. **Click** on any node to see detailed information about that article
5. **Hover** over nodes for quick tooltips with word count and connection stats

### Technical Details

The 3D Globe uses:
- **Three.js** for 3D rendering
- **OrbitControls** for smooth camera manipulation
- **Raycasting** for precise node selection
- **Canvas textures** for high-quality text labels
- **RequestAnimationFrame** for smooth 60fps rendering

The visualization automatically calculates node positions using spherical coordinates, ensuring an even distribution of your wiki articles across the globe surface.

## Contributor mode

For normal users, use:

```bash
npm start
```

For contributors working on WikiOS itself, use:

```bash
npm run dev
```

`dev` runs a split frontend/backend setup for faster iteration.

## Folder structure

- `src/client/` contains the React app, routes, and UI components
- `src/server/` contains the Fastify server, setup flow, runtime config, and platform helpers
- `src/lib/` contains the wiki core
- `sample-vault/` contains the bundled demo content
- `scripts/` contains launch, deploy, and smoke-test helpers

## Advanced

### Useful commands

- `npm run first-run` installs dependencies and starts the guided first-run flow
- `npm start` starts the app in user mode
- `npm run dev` starts the contributor split client/server setup
- `npm run build` builds the client and server
- `npm run serve` runs the already-built server
- `npm run deploy` runs the deployment helper
- `npm run smoke-test` runs the smoke test helper
- `docker compose up --build` runs the app in Docker with the bundled demo vault

### Environment variables

- `WIKI_ROOT` bootstraps the app with a vault path
- `WIKIOS_FORCE_WIKI_ROOT` forces a temporary per-process vault override
- `PORT` sets the server port
- `WIKIOS_INDEX_DB` overrides the SQLite index path
- `WIKIOS_ADMIN_TOKEN` protects the manual reindex endpoint
- `WIKIOS_DISABLE_WATCH=1` disables filesystem watching

By default, WikiOS saves the selected vault in `~/.wiki-os/config.json` and stores hashed SQLite indexes under `~/.wiki-os/indexes/`.

### People model

WikiOS treats `People` as an explicit, user-controlled concept first. By default it recognizes people from:

- frontmatter keys like `person`, `people`, `type`, `kind`, and `entity`
- tags like `person`, `people`, `biography`, and `biographies`
- folders like `people/`, `person/`, `biographies/`, and `biography/`

You can customize this in `wiki-os.config.ts` with `people.mode`:

- `explicit` is the safest default
- `hybrid` allows broader inference after explicit metadata
- `off` hides People entirely

Local person overrides are saved in `~/.wiki-os/config.json` and do not rewrite your notes.

## License

MIT
