# Kaomoji

An Obsidian plugin for inserting kaomoji and custom emoji from a `:shortcode`
autocomplete.

Type `:` in any note, start typing a shortcode, and pick from the popup:

```
:shr  →  ¯\_(ツ)_/¯
:tf   →  (╯°□°)╯︵ ┻━┻
```

## Features

- **Fuzzy matching** — characters need only appear in order, so `:tf` finds
  `tableflip` and `:shrg` still finds `shrug`
- **Ranked results** — best match first, with matching characters highlighted
- **Your own library** — add, edit and remove shortcodes in the plugin settings
- **Import / export** — load pairs from a `.json` file or paste them in directly;
  export your whole set to the clipboard to share or back up
- **Works with anything text** — kaomoji, ASCII art, unicode emoji, snippets you
  retype often

## Usage

Type `:` followed by a shortcode, then press `Enter` or select a suggestion to
insert it; the typed `:shortcode` is replaced by the emoji. Typing just `:` lists
everything alphabetically.

### Managing your emoji

**Settings → Community plugins → Kaomoji**

Each row is a shortcode and the text it inserts. **Add emoji** appends a blank row —
fill in both fields and it saves automatically. The trash icon removes a saved entry.

### Importing

Both import routes take a flat JSON object of `"shortcode": "text"` pairs:

```json
{
  "shrug": "¯\\_(ツ)_/¯",
  "bear": "ʕ•ᴥ•ʔ",
  "cat": "(=^･ω･^=)"
}
```

Use **Import from JSON** for a file, or paste into the **Paste JSON** box. Imports
**merge** into your existing set rather than replacing it, and duplicate shortcodes
are overwritten. Malformed entries are skipped rather than failing the whole file.

> Backslashes need escaping in JSON — `¯\_(ツ)_/¯` is written `"¯\\_(ツ)_/¯"`.

**Export to clipboard** copies your current set in exactly this format, so it can be
shared or re-imported elsewhere.

## Installation

### From the community directory

Not yet available — see [Manual installation](#manual-installation) for now.

### Manual installation

1. Download `main.js`, `manifest.json` and `styles.css` from the
   [latest release](../../releases/latest)
2. Create a folder named `kaomoji` in your vault's `.obsidian/plugins/` directory
3. Put the three files inside it
4. Reload Obsidian, then enable **Kaomoji** under Settings → Community plugins

## Development

```bash
npm install
npm run dev      # watch mode — rebuilds main.js on save
npm run build    # production build, with a typecheck first
npm run lint
```

Clone into `.obsidian/plugins/kaomoji` in a test vault to develop against a live
Obsidian. Note that Obsidian doesn't hot-reload plugin code: after each rebuild,
toggle the plugin off and on in Community plugins, or reload the app.

### Layout

| File | Responsibility |
|---|---|
| `src/main.ts` | Plugin lifecycle — registers the suggest and settings tab |
| `src/emoji-suggest.ts` | The `EditorSuggest` popup: trigger, rank, render, insert |
| `src/settings.ts` | Settings tab, emoji editor, import/export, JSON validation |

Settings are stored via Obsidian's `loadData()` / `saveData()` as a flat
`Record<string, string>` mapping shortcode to inserted text.

## License

[MIT](LICENSE) © fattychuuna
