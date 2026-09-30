import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import KaomojiPlugin from './main';

export interface KaomojiSettings {
	emojiMap: Record<string, string>;
}

export const DEFAULT_SETTINGS: KaomojiSettings = {
	emojiMap: {
		shrug: '¯\\_(ツ)_/¯',
		tableflip: '(╯°□°)╯︵ ┻━┻',
		unflip: '┬─┬ ノ( ゜-゜ノ)',
		bear: 'ʕ•ᴥ•ʔ',
		joy: '✧*｡٩(ˊᗜˋ*)و✧*｡',
	},
};

export class KaomojiSettingTab extends PluginSettingTab {
	plugin: KaomojiPlugin;
	private pending: [string, string][] = [];

	constructor(app: App, plugin: KaomojiPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		// Settings panel closed — discard anything still unnamed
		this.pending = [];
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName('Custom emoji').setHeading();

		// Saved entries, in stored order; pending rows render after these
		const saved = Object.entries(this.plugin.settings.emojiMap);

		const commit = async () => {
			this.plugin.settings.emojiMap = Object.fromEntries(saved);
			await this.plugin.saveSettings();
		};

		saved.forEach((pair, index) => {
			new Setting(containerEl)
				.addText((text) =>
					text
						.setPlaceholder('Shortcode')
						.setValue(pair[0])
						.onChange(async (value) => {
							pair[0] = value.trim();
							await commit();
						}),
				)
				.addText((text) =>
					text
						.setPlaceholder('Emoji')
						.setValue(pair[1])
						.onChange(async (value) => {
							pair[1] = value;
							await commit();
						}),
				)
				.addExtraButton((btn) =>
					btn
						.setIcon('trash')
						.setTooltip('Delete')
						.onClick(async () => {
							saved.splice(index, 1);
							await commit();
							this.display();
						}),
				);
		});

		this.pending.forEach((pair, index) => {
			new Setting(containerEl)
				.addText((text) => {
					text
						.setPlaceholder('Shortcode')
						.setValue(pair[0])
						.onChange((value) => {
							pair[0] = value.trim();
						});
					text.inputEl.addEventListener('blur', () =>
						void this.promoteIfComplete(index),
					);
				})
				.addText((text) => {
					text
						.setPlaceholder('Emoji')
						.setValue(pair[1])
						.onChange((value) => {
							pair[1] = value;
						});
					text.inputEl.addEventListener('blur', () =>
						void this.promoteIfComplete(index),
					);
				})
				// Discards the row outright
				.addExtraButton((btn) =>
					btn
						.setIcon('x')
						.setTooltip('Discard')
						.onClick(() => {
							this.pending.splice(index, 1);
							this.display();
						}),
				);
		});

		// Sits below every row, saved and pending alike.
		new Setting(containerEl).addButton((btn) =>
			btn
				.setButtonText('Add emoji')
				.setCta()
				.onClick(() => {
					this.pending.push(['', '']);
					this.display();
				}),
		);

		new Setting(containerEl).setName('Import / export').setHeading();

		new Setting(containerEl)
			.setName('Import from JSON')
			.setDesc(
				'Load a file of "shortcode": "emoji" pairs. Merges into your ' +
				'existing map; duplicate shortcodes are overwritten.',
			)
			.addButton((btn) =>
				btn.setButtonText('Import…').onClick(() => this.promptForImport()),
			);

		// Paste-in alternative to the file picker
		let pasted = '';
		new Setting(containerEl)
			.setName('Paste JSON')
			.setDesc('Merges the same way as a file import.')
			.addTextArea((text) => {
				text
					.setPlaceholder('{\n  "shrug": "¯\\_(ツ)_/¯"\n}')
					.onChange((value) => {
						pasted = value;
					});
				text.inputEl.addClass('emoji-import-textarea');
			})
			.addButton((btn) =>
				btn.setButtonText('Merge').onClick(async () => {
					if (pasted.trim().length === 0) {
						new Notice('Nothing to import');
						return;
					}
					await this.mergeFromJson(pasted);
				}),
			);

		new Setting(containerEl)
			.setName('Export to clipboard')
			.setDesc('Copy your emoji map as JSON, ready to share or back up.')
			.addButton((btn) =>
				btn.setButtonText('Export').onClick(async () => {
					const json = JSON.stringify(this.plugin.settings.emojiMap, null, 2);
					try {
						await navigator.clipboard.writeText(json);
						const count = Object.keys(this.plugin.settings.emojiMap).length;
						new Notice(`Copied ${count} emoji to clipboard`);
					} catch {
						new Notice('Could not access the clipboard');
					}
				}),
			);
	}

	// Move a pending row into the saved map once it's actually usable, then
	// redraw so it renders as a normal saved row (with a delete button).
	private async promoteIfComplete(index: number): Promise<void> {
		const pair = this.pending[index];
		if (!pair || pair[0] === '' || pair[1] === '') return;

		// If the shortcode collides with an existing entry, the
		// assignment below overwrites that entry rather than creating a duplicate
		this.pending.splice(index, 1);
		// Appends newly named rows at the bottom rather than inserting in the middle
		this.plugin.settings.emojiMap[pair[0]] = pair[1];
		await this.plugin.saveSettings();

		this.display();
	}

	// Allows for JSON file selection to import from and merge
	private promptForImport(): void {
		const input = activeDocument.body.createEl('input', {
			type: 'file',
			cls: 'kaomoji-hidden-input',
			attr: { accept: 'application/json,.json' },
		});

		const cleanup = () => input.remove();

		input.addEventListener('cancel', cleanup);

		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) {
				cleanup();
				return;
			}

			try {
				await this.mergeFromJson(await file.text());
			} catch {
				new Notice('Import failed: could not read that file');
			} finally {
				cleanup();
			}
		};

		input.click();
	}

	// Merge after validating text in paste box, adding new 
	// and/or overwriting old rows
	private async mergeFromJson(raw: string): Promise<void> {
		let entries: Record<string, string>;
		try {
			entries = parseEmojiMap(raw);
		} catch (e) {
			new Notice(
				`Import failed: ${e instanceof Error ? e.message : 'unreadable JSON'}`,
			);
			return;
		}

		const current = this.plugin.settings.emojiMap;
		const before = Object.keys(current).length;

		// Rebuild the map so everything the import touched — new entries and
		// overwrites alike — collects at the bottom of the list for ease of reviewing
		const merged: Record<string, string> = {};

		// Untouched entries first, in their existing order
		for (const [shortcode, value] of Object.entries(current)) {
			if (!(shortcode in entries)) merged[shortcode] = value;
		}
		// Then the imported entries, appended in the order the JSON listed them.
		for (const [shortcode, value] of Object.entries(entries)) {
			merged[shortcode] = value;
		}

		this.plugin.settings.emojiMap = merged;
		await this.plugin.saveSettings();

		const added = Object.keys(this.plugin.settings.emojiMap).length - before;
		const updated = Object.keys(entries).length - added;
		new Notice(
			updated > 0
				? `Imported ${added} new emoji, updated ${updated}`
				: `Imported ${added} emoji`,
		);

		// Rebuild so the new rows appear (and the paste box clears).
		this.display();
	}
}

// Replace curly quotes with their straight ASCII equivalents, so JSON typed in
// an editor with smart substitution enabled can still be parsed
function straightenQuotes(raw: string): string {
	return raw.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

// Parse and validate untrusted JSON into a flat shortcode -> emoji map.
function parseEmojiMap(raw: string): Record<string, string> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		// Typing JSON by hand on macOS produces curly quotes
		// Retry with the quotes straightened
		try {
			parsed = JSON.parse(straightenQuotes(raw));
		} catch {
			throw new Error('not valid JSON');
		}
	}

	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new Error('expected a JSON object of shortcode/emoji pairs');
	}

	// Skip anything malformed instead of rejecting the whole file
	const clean = Object.entries(parsed).filter(
		([shortcode, value]) =>
			shortcode.trim().length > 0 && typeof value === 'string' && value.length > 0,
	) as [string, string][];

	if (clean.length === 0) {
		throw new Error('no valid entries found');
	}

	return Object.fromEntries(clean);
}
