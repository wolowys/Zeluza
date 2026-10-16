import * as vscode from 'vscode';
import * as path from 'path';
import { Note, NoteStorageData, STORAGE_VERSION } from '../core/types';
import { toRelativePath, toAbsolutePath } from '../utils/helpers';

const STORAGE_DIR = '.zeluza';
const STORAGE_FILE = 'notes.json';

export class Persistence {
  private storagePath: string | null = null;

  constructor() {
    this.initStoragePath();
  }

  private initStoragePath(): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      this.storagePath = path.join(workspaceFolder.uri.fsPath, STORAGE_DIR, STORAGE_FILE);
    }
  }

  async load(): Promise<Note[]> {
    if (!this.storagePath) { return []; }

    try {
      const uri = vscode.Uri.file(this.storagePath);
      const data = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(data).toString('utf-8');
      const storage: NoteStorageData = JSON.parse(text);

      if (storage.version !== STORAGE_VERSION) {
        console.warn(`[Zeluza] Storage version mismatch: expected ${STORAGE_VERSION}, got ${storage.version}`);

      }

      return storage.notes.map(note => ({
        ...note,
        filePath: toAbsolutePath(note.filePath),
      }));
    } catch (error: unknown) {
      if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
        return [];
      }

      if (typeof error === 'object' && error !== null && 'code' in error) {
        const err = error as { code: string };
        if (err.code === 'FileNotFound' || err.code === 'ENOENT') {
          return [];
        }
      }
      console.error('[Zeluza] Failed to load notes:', error);
      return [];
    }
  }

  async save(notes: Note[]): Promise<void> {
    if (!this.storagePath) { return; }

    try {

      const dirUri = vscode.Uri.file(path.dirname(this.storagePath));
      try {
        await vscode.workspace.fs.stat(dirUri);
      } catch {
        await vscode.workspace.fs.createDirectory(dirUri);
      }

      const storageNotes = notes.map(note => ({
        ...note,
        filePath: toRelativePath(note.filePath),
      }));

      const storage: NoteStorageData = {
        version: STORAGE_VERSION,
        notes: storageNotes,
      };

      const text = JSON.stringify(storage, null, 2);
      const uri = vscode.Uri.file(this.storagePath);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(text, 'utf-8'));
    } catch (error) {
      console.error('[Zeluza] Failed to save notes:', error);
      vscode.window.showErrorMessage('Zeluza: Failed to save notes.');
    }
  }

  getStorageDir(): string | null {
    if (!this.storagePath) { return null; }
    return path.dirname(this.storagePath);
  }
}
