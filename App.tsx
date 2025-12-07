import React, { useState, useCallback, useEffect } from 'react';
import { DropZone } from './components/DropZone';
import { BookReader } from './components/BookReader';
import { Controls } from './components/Controls';
import { ProcessedPage } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [pages, setPages] = useState<ProcessedPage[]>([]);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [hasCover, setHasCover] = useState(true);
  const [useSpacer, setUseSpacer] = useState(true); // Defaults to true so Page 1 is on the right
  const [isLoading, setIsLoading] = useState(false);

  const totalSpreads = useCallback(() => {
    if (pages.length === 0) return 0;
    
    let contentPages = pages.length;
    let spreads = 0;

    if (hasCover) {
      // Cover takes 1 spread
      spreads += 1;
      contentPages -= 1; // Remaining pages
      
      if (useSpacer) {
        // [Spacer, P1], [P2, P3]...
        // contentPages 1 -> 1 spread (Spacer, P1)
        // contentPages 2 -> 1 spread (Spacer, P1) -> wait, no. 
        // [Spacer, P1], [P2, X]
        spreads += Math.ceil((contentPages + 1) / 2);
      } else {
        // [P1, P2], [P3, P4]...
        spreads += Math.ceil(contentPages / 2);
      }
    } else {
      // No cover
      if (useSpacer) {
        // [Spacer, P0], [P1, P2]
        spreads += Math.ceil((contentPages + 1) / 2);
      } else {
        // [P0, P1], [P2, P3]
        spreads += Math.ceil(contentPages / 2);
      }
    }
    
    return spreads;
  }, [pages.length, hasCover, useSpacer]);

  const handleFilesLoaded = (newPages: ProcessedPage[]) => {
    setPages(newPages);
    setSpreadIndex(0);
    setIsLoading(false);
    // Reset defaults for a new book
    setHasCover(true);
    setUseSpacer(true);
  };

  const handlePrev = () => {
    setSpreadIndex(curr => Math.max(0, curr - 1));
  };

  const handleNext = () => {
    setSpreadIndex(curr => Math.min(totalSpreads() - 1, curr + 1));
  };

  const handleReset = () => {
    // Revoke old URLs to prevent memory leaks
    pages.forEach(p => URL.revokeObjectURL(p.url));
    setPages([]);
    setSpreadIndex(0);
  };

  const toggleCover = () => {
    setHasCover(prev => !prev);
    setSpreadIndex(0); 
  };

  const toggleSpacer = () => {
    setUseSpacer(prev => !prev);
    // Try to stay on the same visual spread, though exact mapping is tricky
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSpreads]); // Re-bind if total spreads calc changes logic

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-200 relative overflow-hidden">
      
      {/* Background Texture/Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(#e7e5e4_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none" />
      
      {/* Decorative Purple Glow (Landing Page) */}
      {pages.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-300/20 blur-[120px] rounded-full pointer-events-none" />
      )}

      {/* Main Content Area */}
      <div className="w-full h-full flex flex-col items-center justify-center z-0 p-4">
        
        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
            <Loader2 className="animate-spin text-purple-600" size={48} />
            <p className="text-stone-600 font-medium">Binding your book...</p>
          </div>
        )}

        {!isLoading && pages.length === 0 && (
          <div className="flex flex-col items-center w-full max-w-4xl">
            {/* Header */}
            <div className="text-center z-10 px-4 mb-12 sm:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="text-5xl sm:text-7xl font-['DM_Serif_Display'] text-stone-900 tracking-tight mb-4 drop-shadow-sm">
                <span className="text-stone-800">LivreMêlé</span> <span className="text-purple-700">Débrouilleur</span>
              </h1>
              <p className="text-lg text-stone-500 font-light tracking-wide max-w-lg mx-auto leading-relaxed">
                Visualise your SVG collections as a book
              </p>
            </div>

            <div className="w-full max-w-2xl relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
              <DropZone 
                onFilesLoaded={handleFilesLoaded} 
                onLoadingStart={() => setIsLoading(true)} 
              />
            </div>
          </div>
        )}

        {!isLoading && pages.length > 0 && (
          <BookReader 
            pages={pages} 
            spreadIndex={spreadIndex} 
            hasCover={hasCover} 
            useSpacer={useSpacer}
          />
        )}

      </div>

      {/* Footer Controls */}
      <Controls 
        hasPages={pages.length > 0}
        canGoPrev={spreadIndex > 0}
        canGoNext={spreadIndex < totalSpreads() - 1}
        onPrev={handlePrev}
        onNext={handleNext}
        onReset={handleReset}
        hasCover={hasCover}
        onToggleCover={toggleCover}
        useSpacer={useSpacer}
        onToggleSpacer={toggleSpacer}
        currentPageInfo={`${spreadIndex + 1} / ${Math.max(1, totalSpreads())}`}
      />
    </div>
  );
};

export default App;