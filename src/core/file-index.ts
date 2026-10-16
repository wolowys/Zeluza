import { Note } from './types';

export class FileIndex {

  private fileMap: Map<string, Map<string, Note>> = new Map();

  private idMap: Map<string, Note> = new Map();

  insert(note: Note): void {

    let fileNotes = this.fileMap.get(note.filePath);
    if (!fileNotes) {
      fileNotes = new Map();
      this.fileMap.set(note.filePath, fileNotes);
    }
    fileNotes.set(note.id, note);

    this.idMap.set(note.id, note);
  }

  remove(noteId: string): Note | undefined {
    const note = this.idMap.get(noteId);
    if (!note) { return undefined; }

    const fileNotes = this.fileMap.get(note.filePath);
    if (fileNotes) {
      fileNotes.delete(noteId);
      if (fileNotes.size === 0) {
        this.fileMap.delete(note.filePath);
      }
    }

    this.idMap.delete(noteId);
    return note;
  }

  update(note: Note): void {
    const existing = this.idMap.get(note.id);
    if (existing) {

      if (existing.filePath !== note.filePath) {
        this.remove(note.id);
        this.insert(note);
        return;
      }
    }

    this.insert(note);
  }

  getNotesForFile(filePath: string): Note[] {
    const fileNotes = this.fileMap.get(filePath);
    if (!fileNotes) { return []; }
    return Array.from(fileNotes.values());
  }

  getNoteById(id: string): Note | undefined {
    return this.idMap.get(id);
  }

  getAllNotes(): Note[] {
    return Array.from(this.idMap.values());
  }

  getFilePaths(): string[] {
    return Array.from(this.fileMap.keys());
  }

  get count(): number {
    return this.idMap.size;
  }

  clear(): void {
    this.fileMap.clear();
    this.idMap.clear();
  }
}
