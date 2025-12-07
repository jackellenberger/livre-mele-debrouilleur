export interface ProcessedPage {
  id: string;
  name: string;
  url: string; // The Blob URL
  index: number;
  width?: number;
  height?: number;
}

export interface BookState {
  pages: ProcessedPage[];
  currentPageIndex: number; // Represents the index of the spread (0, 1, 2...)
  hasCover: boolean; // Determines if the first page is standalone
  isLoading: boolean;
}

// Helper types for File System Access API (Drag and Drop)
export interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
}

export interface FileSystemFileEntry extends FileSystemEntry {
  file: (callback: (file: File) => void, errorCallback?: (e: any) => void) => void;
}

export interface FileSystemDirectoryEntry extends FileSystemEntry {
  createReader: () => FileSystemDirectoryReader;
}

export interface FileSystemDirectoryReader {
  readEntries: (
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (e: any) => void
  ) => void;
}