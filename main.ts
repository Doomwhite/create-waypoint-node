import { Menu, Notice, Plugin, TAbstractFile, TFile, TFolder } from 'obsidian';

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		// Register custom context menu for folders in the file explorer
		this.addContextMenuToFolderExplorer();
	}

	addContextMenuToFolderExplorer() {
		// Add a custom menu item to folders in the file explorer
		this.app.workspace.on('file-menu', (menu: Menu, abstractFile: TAbstractFile) => {
			// Check if the item is a folder (TFolder)
			if (abstractFile instanceof TFolder) {
				menu.addItem((item) => {
					item
						.setTitle('Create waypoint node to folder and subfolders') // Set the title of the menu item
						.setIcon('link') // You can change the icon to whatever you prefer
						.onClick(async () => {
							// When clicked, run the same logic as your command
							await this.addFoldersNotesAndSubFoldersNotes([abstractFile]);
						});
				});
				menu.addItem((item) => {
					item
						.setTitle('Create waypoint node to folder') // Set the title of the menu item
						.setIcon('link') // You can change the icon to whatever you prefer
						.onClick(async () => {
							// When clicked, run the same logic as your command
							await this.addFolderNote(abstractFile);
						});
				});
			}
		});

		this.app.workspace.on('files-menu', (menu: Menu, abstractFiles: TAbstractFile[]) => {
			// Check if the item is a folder (TFolder)
			menu.addItem((item) => {
				item
					.setTitle('Create waypoint node to folders') // Set the title of the menu item
					.setIcon('link') // You can change the icon to whatever you prefer
					.onClick(async () => {
						const folders = abstractFiles.filter((item) => item instanceof TFolder) as TFolder[];
						await this.addFoldersNotes(folders);
					});
			});
		});
	}

	async addFoldersNotesAndSubFoldersNotes(folders: TFolder[]) {
		await this.addFoldersNotes(folders);

		for (const folder of folders) {
			const childrenFolders = folder?.children.filter((item) => item instanceof TFolder) as TFolder[];
			if (!childrenFolders || !childrenFolders.length) continue;
			await this.addFoldersNotesAndSubFoldersNotes(childrenFolders);
		}
	}

	async addFoldersNotes(folders: TFolder[]) {
		for (const folder of folders) {
			await this.addFolderNote(folder)
		}
	}

	beginWaypointMagicString = `%% Begin Waypoint %%`
	waypointMagicString = `%% Waypoint %%`

	async addFolderNote(folder: TFolder) {
		console.log('folder', folder);

		const folderNoteName = folder.name + '.md'
		if (folder?.children.length) {
			const folderNote = folder.children.find((file) => file instanceof TFile && file.basename === folder.name) as TFile | undefined;
			console.log('folderNote', folderNote);
			if (folderNote) {
				this.modifyFolderNote(folderNote)
				return;
			}
		}

		const folderNotePath = folder.path + '/' + folderNoteName
		console.log('folderNotePath', folderNotePath);
		await this.app.vault.create(folderNotePath, this.waypointMagicString)
		new Notice(`Created the folder note '${folderNoteName}'.`, 3500)
	}

	async modifyFolderNote(folderNote: TFile) {
		const fileContent = await this.app.vault.read(folderNote)
		const firstLine = fileContent.split('\n', 1)[0];

		const alreadyHasWaypoint = fileContent.includes(this.beginWaypointMagicString);
		if (alreadyHasWaypoint) return;

		const yamlStartIndex = firstLine.indexOf('---');
		const yamlEndIndex = fileContent.indexOf('---', yamlStartIndex + 3);

		let updatedContent: string;
		if (yamlStartIndex !== -1 && yamlEndIndex !== -1) {
			console.log('fileContent.slice(yamlStartIndex, yamlEndIndex + 3)', fileContent.slice(yamlStartIndex, yamlEndIndex + 3));
			console.log('fileContent.slice(yamlEndIndex + 3)', fileContent.slice(yamlEndIndex + 3));
			updatedContent = fileContent.slice(yamlStartIndex, yamlEndIndex + 3)
				+ '\n'
				+ this.waypointMagicString
				+ '\n'
				+ fileContent.slice(yamlEndIndex + 3);
		} else {
			console.log('fileContent.slice()', fileContent.slice());
			updatedContent = this.waypointMagicString
				+ '\n'
				+ fileContent.slice();
		}
		console.log('updatedContent', updatedContent);
		await this.app.vault.modify(folderNote, updatedContent);
		new Notice(`Updated the content of the folder note '${folderNote.parent?.name}'.`, 3500)
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
