# Main-tree scope (binding)

Every general instruction, search, map, diagnosis, edit, test, commit, and
publication in this repository defaults to the live main navigation tree only.
The authoritative machine-readable boundary is `main-tree-scope.json`.

Before any broad operation:

1. Run `node scripts/main-tree-scope.mjs check`.
2. Use `node scripts/main-tree-scope.mjs list` to enumerate the allowed public
   and runtime files. Do not replace this with a repository-wide recursive glob.
3. Run the default verification with `node scripts/test-main-tree.mjs`.

Detached subtrees must not be searched, read as evidence, copied from, edited,
tested, committed, or published in response to a general instruction. They may
be handled only when the user names the exact detached target explicitly.
Before deleting any detached target, show the user its exact path list and a
screenshot, then obtain a separate explicit approval to delete it.

`temp/index.html` (MAAYAN) is not part of the main tree. It is a sync-only
distribution exception: never edit it directly. Only after an explicit Word
Forge change, regenerate it with
`node scripts/sync-maayan-from-word-forge.mjs` and verify the deterministic copy.
No other file under `temp/` is covered by that exception.

Scope-control files may be changed only to enforce this policy. Existing
detached files are preserved until the user explicitly authorizes destruction.
