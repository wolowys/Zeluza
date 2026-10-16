import * as vscode from 'vscode';
import { Note, NoteEvent, NoteEventType, INoteEngine } from './types';
import { IntervalTree } from './interval-tree';
import { FileIndex } from './file-index';
import { Persistence } from '../storage/persistence';
import { generateId, now } from '../utils/helpers';

export class NoteStore implements INoteEngine {
  private tree: IntervalTree;
  private index: FileIndex;
  private persistence: Persistence;
  private _onDidChange = new vscode.EventEmitter<NoteEvent>();

  readonly onDidChange: vscode.Event<NoteEvent> = this._onDidChange.event;

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly SAVE_DELAY_MS = 500;

  constructor() {
    this.tree = new IntervalTree();
    this.index = new FileIndex();
    this.persistence = new Persistence();
  }

  async initialize(): Promise<void> {
    const notes = await this.persistence.load();
    for (const note of notes) {
      this.index.insert(note);
      this.tree.insert(note);
    }
    this._onDidChange.fire({ type: NoteEventType.AllLoaded });
  }

  async dispose(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.saveNow();
    this._onDidChange.dispose();
  }

  createNote(filePath: string, selection: vscode.Selection, content: string, anchorText: string): Note {
    const note: Note = {
      id: generateId(),
      filePath,
      position: {
        startLine: selection.start.line,
        startChar: selection.start.character,
        endLine: selection.end.line,
        endChar: selection.end.character,
      },
      anchorText,
      content,
      createdAt: now(),
      updatedAt: now(),
    };

    this.insert(note);
    return note;
  }

  insert(note: Note): void {
    this.index.insert(note);
    this.tree.insert(note);
    this._onDidChange.fire({ type: NoteEventType.Added, note });
    this.scheduleSave();
  }

  remove(noteId: string): void {
    const note = this.index.remove(noteId);
    if (note) {
      this.tree.remove(noteId);
      this._onDidChange.fire({ type: NoteEventType.Deleted, note });
      this.scheduleSave();
    }
  }

  update(note: Note): void {

    this.tree.remove(note.id);
    this.tree.insert(note);
    this.index.update(note);
    this._onDidChange.fire({ type: NoteEventType.Updated, note });
    this.scheduleSave();
  }

  updateContent(noteId: string, newContent: string): Note | undefined {
    const note = this.index.getNoteById(noteId);
    if (!note) { return undefined; }

    const updated: Note = {
      ...note,
      content: newContent,
      updatedAt: now(),
    };

    this.update(updated);
    return updated;
  }

  queryPoint(filePath: string, line: number, char: number): Note[] {
    const noteIds = this.tree.queryPoint(line, char);

    return noteIds
      .map(id => this.index.getNoteById(id))
      .filter((n): n is Note => n !== undefined && n.filePath === filePath);
  }

  queryRange(filePath: string, startLine: number, endLine: number): Note[] {
    const noteIds = this.tree.queryRange(startLine, 0, endLine, Number.MAX_SAFE_INTEGER);
    return noteIds
      .map(id => this.index.getNoteById(id))
      .filter((n): n is Note => n !== undefined && n.filePath === filePath);
  }

  getNotesForFile(filePath: string): Note[] {
    return this.index.getNotesForFile(filePath);
  }

  getAllNotes(): Note[] {
    return this.index.getAllNotes();
  }

  getFilePaths(): string[] {
    return this.index.getFilePaths();
  }

  getNoteById(id: string): Note | undefined {
    return this.index.getNoteById(id);
  }

  clear(): void {
    this.tree.clear();
    this.index.clear();
    this.scheduleSave();
  }

  count(): number {
    return this.index.count;
  }

  handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    const filePath = event.document.uri.fsPath;
    const notes = this.getNotesForFile(filePath);
    if (notes.length === 0) { return; }

    let changed = false;
    for (const change of event.contentChanges) {
      for (const note of notes) {
        const updated = this.adjustNotePosition(note, change);
        if (updated) {
          changed = true;
        }
      }
    }

    if (changed) {
      this._onDidChange.fire({ type: NoteEventType.FileChanged, filePath });
      this.scheduleSave();
    }
  }

  private adjustNotePosition(
    note: Note,
    change: vscode.TextDocumentContentChangeEvent
  ): boolean {
    const changeStart = change.range.start;
    const changeEnd = change.range.end;
    const newLines = change.text.split('\n');
    const addedLineCount = newLines.length - 1;
    const removedLineCount = changeEnd.line - changeStart.line;
    const lineDelta = addedLineCount - removedLineCount;

    if (changeStart.line > note.position.endLine) {
      return false;
    }

    if (changeEnd.line < note.position.startLine) {

      this.tree.remove(note.id);

      note.position.startLine += lineDelta;
      note.position.endLine += lineDelta;

      this.tree.insert(note);
      this.index.update(note);
      return true;
    }

    if (lineDelta !== 0) {
      this.tree.remove(note.id);

      if (changeStart.line <= note.position.startLine) {
        note.position.startLine = Math.max(0, note.position.startLine + lineDelta);
      }
      note.position.endLine = Math.max(note.position.startLine, note.position.endLine + lineDelta);

      this.tree.insert(note);
      this.index.update(note);
      return true;
    }

    return false;
  }

  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveNow();
      this.saveTimer = null;
    }, NoteStore.SAVE_DELAY_MS);
  }

  private async saveNow(): Promise<void> {
    const notes = this.getAllNotes();
    await this.persistence.save(notes);
  }
}
