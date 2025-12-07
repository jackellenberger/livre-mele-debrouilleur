import React, { useState, useRef, useCallback } from 'react';
import { FolderOpen, FileUp } from 'lucide-react';
import { processFiles } from '../utils/fileUtils';
import { ProcessedPage } from '../types';

interface DropZoneProps {
  onFilesLoaded: (pages: ProcessedPage[]) => void;
  onLoadingStart: () => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesLoaded, onLoadingStart }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onLoadingStart();

    try {
      const pages = await processFiles(e.dataTransfer.items);
      onFilesLoaded(pages);
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Failed to process files. Please try again.");
    }
  }, [onFilesLoaded, onLoadingStart]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onLoadingStart();
      try {
        const pages = await processFiles(e.target.files);
        onFilesLoaded(pages);
      } catch (error) {
        console.error("Error processing files:", error);
      }
    }
  }, [onFilesLoaded, onLoadingStart]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={`
        w-full max-w-2xl mx-auto p-8 sm:p-12 border-4 border-dashed rounded-3xl transition-all duration-300 ease-in-out cursor-pointer group relative overflow-hidden
        ${isDragOver 
          ? 'border-purple-500 bg-purple-50 scale-105 shadow-xl shadow-purple-200' 
          : 'border-stone-300 bg-white/60 hover:border-purple-300 hover:bg-white/90 hover:shadow-lg'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileInput}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInput} 
        className="hidden" 
        multiple 
        // @ts-ignore - webkitdirectory is standard in modern browsers but not in TS defs sometimes
        webkitdirectory="" 
      />
      
      <div className="relative flex flex-col items-center justify-center text-center z-10">
        
        {/* Main Drop Area */}
        <div className="flex flex-col items-center space-y-6">
          <div className={`
            p-6 rounded-full transition-colors duration-300
            ${isDragOver ? 'bg-purple-100 text-purple-600' : 'bg-stone-100 text-stone-400 group-hover:bg-purple-50 group-hover:text-purple-500'}
          `}>
            <FolderOpen size={64} strokeWidth={1.5} />
          </div>
          
          <div className="space-y-2">
            <h3 className={`text-2xl font-bold transition-colors ${isDragOver ? 'text-purple-700' : 'text-stone-700 group-hover:text-purple-900'}`}>
              Drop your book here
            </h3>
            <p className="text-stone-500 max-w-sm mx-auto group-hover:text-stone-600">
              Drag and drop a folder containing SVG pages. <br/>We'll arrange them into a book for you.
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium text-stone-400 group-hover:text-purple-400/80">
            <span className="flex items-center gap-2">
              <FileUp size={16} /> SVG Files
            </span>
            <span className="w-1.5 h-1.5 bg-stone-300 rounded-full group-hover:bg-purple-300"></span>
            <span className="flex items-center gap-2">
              <FolderOpen size={16} /> Folders
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
