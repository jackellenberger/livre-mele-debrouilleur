import React from 'react';
import { ChevronLeft, ChevronRight, Book, LayoutTemplate, Columns } from 'lucide-react';

interface ControlsProps {
  hasPages: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  hasCover: boolean;
  onToggleCover: () => void;
  useSpacer: boolean;
  onToggleSpacer: () => void;
  currentPageInfo: string;
}

export const Controls: React.FC<ControlsProps> = ({
  hasPages,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onReset,
  hasCover,
  onToggleCover,
  useSpacer,
  onToggleSpacer,
  currentPageInfo
}) => {
  if (!hasPages) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 flex items-center justify-center pointer-events-none z-50">
      <div className="flex items-center gap-4 bg-stone-900/90 backdrop-blur-md text-stone-100 px-6 py-3 rounded-2xl shadow-xl pointer-events-auto transition-transform hover:scale-105 border border-white/10">
        
        {/* Reset / Upload New */}
        <button 
          onClick={onReset}
          className="p-2 hover:bg-stone-700 rounded-lg transition-colors text-stone-400 hover:text-white"
          title="Open new book"
        >
          <Book size={20} />
        </button>

        <div className="w-px h-6 bg-stone-700 mx-2" />

        {/* Toggle Cover Mode */}
        <button 
          onClick={onToggleCover}
          className={`
            p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium
            ${hasCover ? 'bg-purple-600/30 text-purple-200 shadow-[0_0_10px_rgba(147,51,234,0.3)]' : 'hover:bg-stone-700 text-stone-400'}
          `}
          title={hasCover ? "Cover Mode On" : "Cover Mode Off"}
        >
          <LayoutTemplate size={20} />
          <span className="hidden sm:inline">
            {hasCover ? "Cover" : "No Cover"}
          </span>
        </button>

        {/* Align / Offset Page */}
        <button 
          onClick={onToggleSpacer}
          className={`
            p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium
            ${useSpacer ? 'bg-purple-600/30 text-purple-200 shadow-[0_0_10px_rgba(147,51,234,0.3)]' : 'hover:bg-stone-700 text-stone-400'}
          `}
          title="Align Spread (Offset pages by one)"
        >
          <Columns size={20} />
          <span className="hidden sm:inline">
            Align
          </span>
        </button>

        <div className="w-px h-6 bg-stone-700 mx-2" />

        {/* Navigation */}
        <button 
          onClick={onPrev}
          disabled={!canGoPrev}
          className={`
            p-2 rounded-lg transition-colors
            ${canGoPrev ? 'hover:bg-stone-700 text-white' : 'text-stone-600 cursor-not-allowed'}
          `}
        >
          <ChevronLeft size={24} />
        </button>

        <span className="min-w-[80px] text-center font-mono text-sm">
          {currentPageInfo}
        </span>

        <button 
          onClick={onNext}
          disabled={!canGoNext}
          className={`
            p-2 rounded-lg transition-colors
            ${canGoNext ? 'hover:bg-stone-700 text-white' : 'text-stone-600 cursor-not-allowed'}
          `}
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};