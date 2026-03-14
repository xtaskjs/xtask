# xtaskjs Workspace

## Release helpers

Use the root scripts to pack or publish workspace packages in dependency order:

```bash
npm run release:order
npm run pack:packages
npm run publish:packages
```

Additional npm arguments can be passed through with `--`:

```bash
npm run pack:packages -- --dry-run
npm run publish:packages -- --tag next
```
