import * as vscode from 'vscode';

export function generateId(): string {

  try {
    return require('crypto').randomUUID();
  } catch {

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export function now(): string {
  return new Date().toISOString();
}

export function toRelativePath(absolutePath: string): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return absolutePath;
  }
  const wsRoot = workspaceFolder.uri.fsPath;
  if (absolutePath.startsWith(wsRoot)) {
    return absolutePath.slice(wsRoot.length + 1);
  }
  return absolutePath;
}

export function toAbsolutePath(relativePath: string): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return relativePath;
  }

  if (relativePath.startsWith('/') || /^[A-Za-z]:/.test(relativePath)) {
    return relativePath;
  }
  return vscode.Uri.joinPath(workspaceFolder.uri, relativePath).fsPath;
}

export function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) { return days === 1 ? '1 day ago' : `${days} days ago`; }
  if (hours > 0) { return hours === 1 ? '1 hour ago' : `${hours} hours ago`; }
  if (minutes > 0) { return minutes === 1 ? '1 min ago' : `${minutes} mins ago`; }
  return 'just now';
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) { return str; }
  return str.slice(0, maxLen - 1) + '…';
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
