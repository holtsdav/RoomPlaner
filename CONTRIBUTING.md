# Contributing

## Workflow

1. Update local `develop` with `git pull --ff-only`.
2. Create a focused branch named `feature/...`, `fix/...`, `chore/...`,
   `docs/...`, or `refactor/...`.
3. Keep commits small and use imperative commit subjects.
4. Run `npm run check`.
5. Push the branch and open a pull request into `develop`.
6. Resolve review threads and wait for CI before merging.

Do not push directly to `develop` or `main`. Release by opening a pull request
from `develop` to `main`. Squash ordinary feature branches into `develop`. Use
a merge commit for `develop` to `main` releases, and when synchronizing `main`
back into `develop`, so the ancestry of both long-lived branches stays intact.

## Engineering boundaries

- Store physical dimensions and coordinates as integer millimetres. Convert to
  pixels only inside a renderer or viewport adapter.
- Keep the room document model independent of Konva, React and persistence.
- Treat catalog data as untrusted input and validate it at every boundary.
- Add dependencies only with a concrete use in the same pull request.
- Add unit tests for geometry and data migrations, and interaction tests for
  user-visible editor behavior.

## Pull requests

Keep a pull request focused on one change. Describe what changed, why, how it
was verified and whether it changes stored document data. Include screenshots
or a short recording when a visible interaction changes.
