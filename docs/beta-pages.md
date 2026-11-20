# Claudov beta on GitHub Pages

Use `beta` to stage changes at https://vincentdn.github.io/escape-from-claudov/beta/. The Pages workflow checks out both branches, builds `main` at the site root and puts the `beta` build under `beta/` in the same deployment artifact. A beta build uses separate browser save keys and lobby IDs so the two paths can coexist on the same origin.

`AGENTS.md` records the branch rules. When promoting changes to `main` with explicit owner permission, include the shared Pages workflow so future production pushes publish both paths.
