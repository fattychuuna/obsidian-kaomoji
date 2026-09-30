import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    SearchResult,
    TFile,
    prepareFuzzySearch,
    renderMatches,
    sortSearchResults,
} from 'obsidian';
import KaomojiPlugin from './main';

// shortcode: what the user types (e.g. "shrug"),
// value: the text actually inserted (e.g. "¯\_(ツ)_/¯")
// match: Fuzzy-search result, a score plus the character ranges that matched
// optional so that a lone `:` lists everything
interface EmojiMatch {
    shortcode: string;
    value: string;
    match?: SearchResult;
}

export class EmojiSuggest extends EditorSuggest<EmojiMatch> {
    constructor(app: App, private plugin: KaomojiPlugin) {
        super(app);
    }

    onTrigger(
        cursor: EditorPosition,
        editor: Editor,
        _file: TFile,
    ): EditorSuggestTriggerInfo | null {
        // Look at text to the left of the cursor
        const line = editor.getLine(cursor.line).slice(0, cursor.ch);

        // Match shortcode-legal characters after a colon at the end of the string
        // or before the final line terminator
        const match = line.match(/:([a-zA-Z0-9_+-]*)$/);
        if (!match) return null;

        return {
            // The span of text between the colon itself and the cursor
            // to be replaced by the suggestion
            start: { line: cursor.line, ch: match.index! },
            end: cursor,
            // The actual span of text used as context for getSuggestions(); 
            // if match[1] resolves to null or undefined, the fallback value is ''
            query: match[1] ?? '',
        };
    }

    getSuggestions(context: EditorSuggestContext): EmojiMatch[] {
        // Read settings on every call so edits take effect without reload
        const entries = Object.entries(this.plugin.settings.emojiMap)
            .filter(([shortcode, value]) => shortcode !== '' && value !== '')
            // Sort suggested list alphabetically by shortcode
            .sort(([a], [b]) => a.localeCompare(b));

        if (context.query === '') {
            return entries.map(([shortcode, value]) => ({ shortcode, value }));
        }

        const scorer = prepareFuzzySearch(context.query);

        const results: (EmojiMatch & { match: SearchResult })[] = [];
        for (const [shortcode, value] of entries) {
            // Characters need only appear in order, not adjacently, to match
            const match = scorer(shortcode);
            if (!match) continue;
            results.push({ shortcode, value, match });
        }

        // Sorts in place based on score
        sortSearchResults(results);

        return results;
    }

    renderSuggestion(item: EmojiMatch, el: HTMLElement): void {
        el.addClass('kaomoji-suggestion');

        el.createSpan({ cls: 'kaomoji-suggestion-value', text: item.value });

        const codeEl = el.createSpan({ cls: 'kaomoji-suggestion-code' });

        if (item.match) {
            // Matched characters are highlighted
            codeEl.createSpan({ text: ':' });
            renderMatches(codeEl, item.shortcode, item.match.matches);
            codeEl.createSpan({ text: ':' });
        } else {
            // If empty query, nothing to score and highlight
            codeEl.setText(`:${item.shortcode}:`);
        }
    }

    // Suggestion is selected via click or enter
    selectSuggestion(match: EmojiMatch): void {
        const { context } = this;
        if (!context) return;

        // Replace shortcode with the emoji/kaomoji itself and close popup
        context.editor.replaceRange(match.value, context.start, context.end);
    }
}
