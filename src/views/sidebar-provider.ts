import * as vscode from 'vscode';
import { NoteStore } from '../core/note-store';
import { Note, SidebarMessageToWebview, SidebarMessageFromWebview } from '../core/types';
import { toRelativePath, truncate, escapeHtml, timeAgo } from '../utils/helpers';
import * as path from 'path';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'zeluza-smart-note.sidebar';

  private view?: vscode.WebviewView;

  constructor(
    private extensionUri: vscode.Uri,
    private store: NoteStore
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      (message: SidebarMessageFromWebview) => {
        switch (message.type) {
          case 'ready':
            this.refresh();
            break;
          case 'deleteNote':
            vscode.commands.executeCommand('zeluza-smart-note.deleteNote', message.noteId);
            break;
          case 'editNote':
            this.store.updateContent(message.noteId, message.content);
            this.refresh();
            break;
          case 'goToNote':
            vscode.commands.executeCommand('zeluza-smart-note.goToNote', message.noteId);
            break;
        }
      }
    );

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refresh();
      }
    });
  }

  refresh(): void {
    if (!this.view) { return; }

    const notes = this.store.getAllNotes();
    const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;

    const message: SidebarMessageToWebview = {
      type: 'updateNotes',
      notes,
      activeFile,
      workspaceName: vscode.workspace.workspaceFolders?.[0]?.name || '',
    } as any;

    this.view.webview.postMessage(message);
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
      style-src ${webview.cspSource} 'nonce-${nonce}';
      script-src 'nonce-${nonce}';">
  <style nonce="${nonce}">
    *,
    *::before,
    *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      line-height: 1.5;
      overflow-x: hidden;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
      position: sticky;
      top: 0;
      background: var(--vscode-sideBar-background);
      z-index: 10;
    }

    .header-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-sideBarSectionHeader-foreground);
    }

    .header-count {
      font-size: 10px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 10px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
    }

    .empty-state-icon {
      font-size: 36px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-state-text {
      font-size: 12px;
      line-height: 1.6;
    }

    .empty-state-hint {
      margin-top: 12px;
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 4px;
      background: var(--vscode-textBlockQuote-background);
      border: 1px solid var(--vscode-textBlockQuote-border);
    }

    kbd {
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 10px;
      background: var(--vscode-keybindingLabel-background);
      color: var(--vscode-keybindingLabel-foreground);
      border: 1px solid var(--vscode-keybindingLabel-border);
      box-shadow: 0 1px 0 var(--vscode-keybindingLabel-bottomBorder);
    }

    .file-group {
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .file-group.active > .file-header {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }

    .file-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      cursor: pointer;
      user-select: none;
      font-size: 12px;
      font-weight: 500;
      transition: background 80ms ease;
    }

    .file-header:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .file-header-icon {
      flex-shrink: 0;
      font-size: 14px;
      transition: transform 150ms ease;
    }

    .file-header-icon.collapsed {
      transform: rotate(-90deg);
    }

    .file-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-path {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 120px;
    }

    .file-count {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 500;
      padding: 0 5px;
      border-radius: 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .note-list {
      overflow: hidden;
      transition: max-height 200ms ease;
    }

    .note-list.collapsed {
      max-height: 0 !important;
    }

    .note-item {
      position: relative;
      margin: 6px 8px;
      padding: 8px 12px 8px 14px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
      border-radius: 6px;
      cursor: pointer;
      transition: background 80ms ease, border-color 80ms ease;
    }

    .note-item:hover {
      background: var(--vscode-list-hoverBackground);
      border-color: color-mix(in srgb, var(--vscode-foreground) 25%, transparent);
    }

    .note-content {
      font-size: 12px;
      line-height: 1.5;
      word-wrap: break-word;
      color: var(--vscode-foreground);
    }

    .note-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
    }

    .note-line {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .note-anchor {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--vscode-editor-font-family);
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
      background: var(--vscode-textCodeBlock-background);
    }

    .note-actions {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
      margin-top: 6px;
      visibility: hidden;
    }

    .note-item:hover .note-actions {
      visibility: visible;
    }

    .action-btn {
      height: 22px;
      padding: 0 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: var(--vscode-toolbar-hoverBackground);
      color: var(--vscode-foreground);
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      opacity: 0.7;
      transition: opacity 80ms ease;
    }

    .action-btn:hover {
      opacity: 1;
      background: var(--vscode-toolbar-activeBackground);
    }

    ::-webkit-scrollbar {
      width: 6px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background);
      border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground);
    }

    .edit-textarea {
      width: 100%;
      min-height: 50px;
      padding: 6px 8px;
      margin-top: 4px;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      line-height: 1.5;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      resize: vertical;
      outline: none;
    }

    .edit-textarea:focus {
      border-color: var(--vscode-focusBorder);
    }

    .edit-actions {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }

    .edit-btn {
      padding: 3px 10px;
      font-size: 11px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
    }

    .edit-btn.save {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .edit-btn.save:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .edit-btn.cancel {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .edit-btn.cancel:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .note-item {
      animation: fadeIn 150ms ease;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="header-title" id="headerTitle"></span>
    <span class="header-count" id="totalCount">0</span>
  </div>
  <div id="content"></div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const contentEl = document.getElementById('content');
    const totalCountEl = document.getElementById('totalCount');
    const headerTitleEl = document.getElementById('headerTitle');

    let notesData = [];
    let activeFile = null;
    let collapsedFiles = new Set();
    let editingNoteId = null;
    let workspaceName = '';

    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.type) {
        case 'updateNotes':
          notesData = message.notes || [];
          activeFile = message.activeFile || null;
          workspaceName = message.workspaceName || '';
          render();
          break;
        case 'noteDeleted':
          notesData = notesData.filter(n => n.id !== message.noteId);
          render();
          break;
        case 'noteUpdated':
          const idx = notesData.findIndex(n => n.id === message.note.id);
          if (idx >= 0) { notesData[idx] = message.note; }
          render();
          break;
      }
    });

    function render() {
      totalCountEl.textContent = notesData.length;
      headerTitleEl.textContent = workspaceName || 'No Workspace';

      if (notesData.length === 0) {
        contentEl.innerHTML = renderEmptyState();
        return;
      }

      const groups = {};
      for (const note of notesData) {
        if (!groups[note.filePath]) {
          groups[note.filePath] = [];
        }
        groups[note.filePath].push(note);
      }

      const sortedPaths = Object.keys(groups).sort((a, b) => {
        if (a === activeFile) return -1;
        if (b === activeFile) return 1;
        return groups[b].length - groups[a].length;
      });

      let html = '';
      for (const filePath of sortedPaths) {
        const notes = groups[filePath];
        notes.sort((a, b) => a.position.startLine - b.position.startLine);
        const isActive = filePath === activeFile;
        const isCollapsed = collapsedFiles.has(filePath);
        html += renderFileGroup(filePath, notes, isActive, isCollapsed);
      }

      contentEl.innerHTML = html;
      bindEvents();
    }

    function renderEmptyState() {
      return '<div class="empty-state">'
        + '<div class="empty-state-icon"></div>'
        + '<div class="empty-state-text">No notes yet</div>'
        + '<div class="empty-state-hint">'
        + 'Select code → Right-click → <strong>Add Note</strong><br>'
        + 'or press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd>'
        + '</div>'
        + '</div>';
    }

    function renderFileGroup(filePath, notes, isActive, isCollapsed) {
      const parts = filePath.replace(/\\\\/g, '/').split('/');
      const fileName = parts[parts.length - 1] || filePath;
      const dirPath = parts.slice(-3, -1).join('/');
      const chevron = isCollapsed ? 'collapsed' : '';

      let html = '<div class="file-group' + (isActive ? ' active' : '') + '">';
      html += '<div class="file-header" data-file="' + escapeAttr(filePath) + '">';
      html += '<span class="file-header-icon ' + chevron + '">▼</span>';
      html += '<span class="file-name">' + escapeHTML(fileName) + '</span>';
      if (dirPath) {
        html += '<span class="file-path">' + escapeHTML(dirPath) + '</span>';
      }
      html += '<span class="file-count">' + notes.length + '</span>';
      html += '</div>';

      html += '<div class="note-list' + (isCollapsed ? ' collapsed' : '') + '">';
      for (const note of notes) {
        html += renderNoteItem(note);
      }
      html += '</div></div>';

      return html;
    }

    function renderNoteItem(note) {
      const line = note.position.startLine + 1;
      const anchor = truncateStr(note.anchorText.split('\\n')[0], 30);
      const time = timeAgoStr(note.updatedAt);

      if (editingNoteId === note.id) {
        return '<div class="note-item" data-note-id="' + note.id + '">'
          + '<textarea class="edit-textarea" id="edit-' + note.id + '">' + escapeHTML(note.content) + '</textarea>'
          + '<div class="edit-actions">'
          + '<button class="edit-btn save" data-save="' + note.id + '">Save</button>'
          + '<button class="edit-btn cancel" data-cancel="' + note.id + '">Cancel</button>'
          + '</div></div>';
      }

      return '<div class="note-item" data-note-id="' + note.id + '">'
        + '<div class="note-content">' + escapeHTML(note.content) + '</div>'
        + '<div class="note-meta">'
        + '<span class="note-line">L' + line + '</span>'
        + '<span class="note-anchor">' + escapeHTML(anchor) + '</span>'
        + '<span>' + time + '</span>'
        + '</div>'
        + '<div class="note-actions">'
        + '<button class="action-btn" data-edit="' + note.id + '" title="Edit">Edit</button>'
        + '<button class="action-btn" data-delete="' + note.id + '" title="Delete">Delete</button>'
        + '</div>'
        + '</div>';
    }

    function bindEvents() {
      // File header toggle
      document.querySelectorAll('.file-header').forEach(el => {
        el.addEventListener('click', () => {
          const file = el.getAttribute('data-file');
          if (collapsedFiles.has(file)) {
            collapsedFiles.delete(file);
          } else {
            collapsedFiles.add(file);
          }
          render();
        });
      });

      document.querySelectorAll('.note-item').forEach(el => {
        el.addEventListener('click', (e) => {
          // Don't navigate if clicking action buttons or editing
          if (e.target.closest('.note-actions') || e.target.closest('.edit-actions')
              || e.target.closest('.edit-textarea')) return;
          const noteId = el.getAttribute('data-note-id');
          vscode.postMessage({ type: 'goToNote', noteId });
        });
      });

      document.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          editingNoteId = btn.getAttribute('data-edit');
          render();
          const textarea = document.getElementById('edit-' + editingNoteId);
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        });
      });

      document.querySelectorAll('[data-save]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const noteId = btn.getAttribute('data-save');
          const textarea = document.getElementById('edit-' + noteId);
          if (textarea && textarea.value.trim()) {
            vscode.postMessage({ type: 'editNote', noteId, content: textarea.value.trim() });
            editingNoteId = null;
          }
        });
      });

      document.querySelectorAll('[data-cancel]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          editingNoteId = null;
          render();
        });
      });

      document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const noteId = btn.getAttribute('data-delete');
          vscode.postMessage({ type: 'deleteNote', noteId });
        });
      });
    }

    function escapeHTML(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function escapeAttr(str) {
      return str.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function truncateStr(str, max) {
      if (!str) return '';
      str = str.trim();
      return str.length > max ? str.slice(0, max - 1) + '…' : str;
    }

    function timeAgoStr(iso) {
      const now = Date.now();
      const then = new Date(iso).getTime();
      const diff = now - then;
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return days === 1 ? '1d ago' : days + 'd ago';
      if (hours > 0) return hours === 1 ? '1h ago' : hours + 'h ago';
      if (mins > 0) return mins === 1 ? '1m ago' : mins + 'm ago';
      return 'now';
    }

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
