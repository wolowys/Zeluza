# Zeluza Smart Note

Annotate any code range with notes — without touching your source code. Notes are stored externally, displayed on hover, and managed through a dedicated sidebar.

## Features

### Add Notes to Any Code Selection

Select any code in your editor, right-click and choose **Add Note**, or use the keyboard shortcut. Your note is saved externally — no comments are inserted into your code.

| Shortcut | Action |
|---|---|
| `Cmd+Shift+N` (Mac) / `Ctrl+Shift+N` (Win/Linux) | Add note to selection |
| Right-click > **Add Note** | Add note via context menu |

### Hover to View and Edit

Hover over any highlighted code range to see the note content in a tooltip. From the tooltip you can edit or delete the note directly.

### Sidebar Panel

All notes are organized by file in the Zeluza sidebar panel. Each note shows:

- The note content
- Line number and a preview of the annotated code
- Relative timestamp

Click any note to jump to its location. Edit or delete notes inline without leaving the sidebar.

### Position Tracking

Notes automatically adjust their positions when you add or remove lines above them. The annotated range stays in sync with your edits.

## How It Works

Notes are stored in a `.zeluza/notes.json` file at the root of your workspace. This file uses workspace-relative paths, so notes remain valid when the project is moved.

You can add `.zeluza/` to your `.gitignore` to keep notes local, or commit it to share notes with your team.

### Storage Format

```
.zeluza/
  notes.json       # all notes for this workspace
```

## Architecture

```
src/
  extension.ts                  # entry point
  core/
    types.ts                    # shared types and design tokens
    interval-tree.ts            # AVL interval tree for range queries
    file-index.ts               # file-to-notes index
    note-store.ts               # central state management
  providers/
    hover-provider.ts           # hover tooltip rendering
    decoration-provider.ts      # code highlighting
  views/
    sidebar-provider.ts         # sidebar webview panel
  commands/
    note-commands.ts            # add, edit, delete, go-to commands
  storage/
    persistence.ts              # file-based storage
  utils/
    helpers.ts                  # shared utilities
```

The core uses an AVL-balanced interval tree for O(log n) range queries when resolving which notes overlap a given cursor position. A separate file index provides O(1) lookups by file path.

The store emits events on every mutation. Providers (hover, decoration, sidebar) subscribe independently and update themselves — no tight coupling between components.

## Commands

All commands are under the `Zeluza` category in the Command Palette.

| Command | Description |
|---|---|
| `Zeluza: Add Note` | Add a note to the current selection |
| `Zeluza: Edit Note` | Edit an existing note |
| `Zeluza: Delete Note` | Delete a note |
| `Zeluza: Go to Note` | Jump to a note's location |

## Requirements

- VS Code 1.140.0 or later

## Known Issues

- Notes track position changes by line offset only. Large-scale refactors (e.g. moving code between files) will not automatically migrate notes.

## License

MIT
