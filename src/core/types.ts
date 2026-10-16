import * as vscode from 'vscode';

export const DESIGN_TOKENS = {
  colors: {
    note: {
      highlight: 'rgba(255, 214, 102, 0.12)',
      highlightHover: 'rgba(255, 214, 102, 0.22)',
      border: 'rgba(255, 214, 102, 0.6)',
      gutterIcon: '#FFD666',
      text: '#FFD666',
    },
    priority: {
      low: 'rgba(130, 200, 130, 0.15)',
      medium: 'rgba(255, 214, 102, 0.15)',
      high: 'rgba(255, 130, 100, 0.15)',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  borderRadius: {
    sm: 3,
    md: 6,
    lg: 8,
  },
} as const;

export interface NotePosition {

  startLine: number;

  startChar: number;

  endLine: number;

  endChar: number;
}

export interface Note {

  id: string;

  filePath: string;

  position: NotePosition;

  anchorText: string;

  content: string;

  createdAt: string;

  updatedAt: string;

  color?: string;
}

export interface NoteStorageData {
  version: number;
  notes: Note[];
}

export const STORAGE_VERSION = 1;

export enum NoteEventType {
  Added = 'added',
  Updated = 'updated',
  Deleted = 'deleted',
  FileChanged = 'fileChanged',
  AllLoaded = 'allLoaded',
}

export interface NoteEvent {
  type: NoteEventType;
  note?: Note;
  filePath?: string;
}

export interface INoteEngine {

  insert(note: Note): void;

  remove(noteId: string): void;

  update(note: Note): void;

  queryPoint(filePath: string, line: number, char: number): Note[];

  queryRange(filePath: string, startLine: number, endLine: number): Note[];

  getNotesForFile(filePath: string): Note[];

  getAllNotes(): Note[];

  getFilePaths(): string[];

  getNoteById(id: string): Note | undefined;

  clear(): void;

  count(): number;
}

export interface NoteDecorationOptions {
  range: vscode.Range;
  note: Note;
}

export type SidebarMessageToWebview =
  | { type: 'updateNotes'; notes: Note[]; activeFile?: string }
  | { type: 'noteDeleted'; noteId: string }
  | { type: 'noteUpdated'; note: Note }
  | { type: 'themeChanged' };

export type SidebarMessageFromWebview =
  | { type: 'deleteNote'; noteId: string }
  | { type: 'editNote'; noteId: string; content: string }
  | { type: 'goToNote'; noteId: string }
  | { type: 'ready' };
