import { Plugin } from 'obsidian';
import {
	KaomojiSettings,
	KaomojiSettingTab,
	DEFAULT_SETTINGS,
} from './settings';
import { EmojiSuggest } from './emoji-suggest';

export default class KaomojiPlugin extends Plugin {
	settings!: KaomojiSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new KaomojiSettingTab(this.app, this));
		this.registerEditorSuggest(new EmojiSuggest(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<KaomojiSettings>,
		);

		this.settings.emojiMap = Object.fromEntries(
			Object.entries(this.settings.emojiMap).filter(
				([shortcode, value]) => shortcode !== '' && value !== '',
			),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
