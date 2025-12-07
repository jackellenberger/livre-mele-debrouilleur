import React, { useMemo } from 'react';
import { ProcessedPage } from '../types';

interface BookReaderProps {
  pages: ProcessedPage[];
  spreadIndex: number;
  hasCover: boolean;
  useSpacer: boolean;
}

export const BookReader: React.FC<BookReaderProps> = ({ pages, spreadIndex, hasCover, useSpacer }) => {
  
  // Calculate which pages to show based on spreadIndex, cover mode, and spacer alignment
  const displayedPages = useMemo(() => {
    if (pages.length === 0) return { left: null, right: null };

    // Cover View (Always Page 0 alone if hasCover is true)
    if (hasCover && spreadIndex === 0) {
      return { 
        left: null, 
        right: pages[0], 
        isCoverView: true,
        leftIsSpacer: false
      };
    }

    let leftPageIndex = -1;
    let rightPageIndex = -1;
    let leftIsSpacer = false;

    // Logic for Content Spreads
    if (hasCover) {
      // Content starts at Index 1
      // If useSpacer: [Spacer, 1], [2, 3]...
      // If !useSpacer: [1, 2], [3, 4]...
      
      const contentSpreadIndex = spreadIndex - 1; // 0-based index relative to content start
      
      if (useSpacer) {
        // Shifted by 1 virtual page (the spacer)
        // Spread 0 (Content): Left=Spacer (virtual), Right=P1
        // Spread 1 (Content): Left=P2, Right=P3
        
        // Formula for Right Page: P_index = 1 + (spread * 2)
        // Left Page is Right - 1.
        
        rightPageIndex = 1 + (contentSpreadIndex * 2);
        leftPageIndex = rightPageIndex - 1;
        
        // If leftPageIndex points to the cover (0), it means we are at the first content spread
        // and we want a Spacer instead of the Cover (which is already shown on spread 0).
        if (leftPageIndex === 0) {
          leftPageIndex = -1;
          leftIsSpacer = true;
        }
      } else {
        // Standard flow
        // Spread 0 (Content): Left=P1, Right=P2
        leftPageIndex = 1 + (contentSpreadIndex * 2);
        rightPageIndex = leftPageIndex + 1;
      }

    } else {
      // No Cover
      // If useSpacer: [Spacer, 0], [1, 2]...
      // If !useSpacer: [0, 1], [2, 3]...
      
      if (useSpacer) {
         rightPageIndex = spreadIndex * 2;
         leftPageIndex = rightPageIndex - 1;
         
         if (leftPageIndex < 0) {
           leftIsSpacer = true;
         }
      } else {
        leftPageIndex = spreadIndex * 2;
        rightPageIndex = leftPageIndex + 1;
      }
    }

    return {
      left: (leftPageIndex >= 0 && leftPageIndex < pages.length) ? pages[leftPageIndex] : null,
      right: (rightPageIndex >= 0 && rightPageIndex < pages.length) ? pages[rightPageIndex] : null,
      isCoverView: false,
      leftIsSpacer
    };
  }, [pages, spreadIndex, hasCover, useSpacer]);

  const { left, right, isCoverView, leftIsSpacer } = displayedPages;

  // Calculate dynamic aspect ratio from the first page
  const containerStyle = useMemo(() => {
    if (pages.length === 0) return { width: 'min(90vw, 1200px)', aspectRatio: '2/1.4' };
    
    let singleW = 595;
    let singleH = 842;

    const firstPage = pages[0];
    if (firstPage.width && firstPage.height) {
        singleW = firstPage.width;
        singleH = firstPage.height;
    }

    // Spread width is 2 * single page width
    const ratio = (singleW * 2) / singleH;

    return {
        width: 'min(90vw, 1200px)',
        aspectRatio: `${ratio}`
    };
  }, [pages]);

  return (
    <div className="relative flex items-center justify-center w-full h-full max-h-[85vh] perspective-1500">
      
      {/* Book Container */}
      <div 
        className={`
          relative flex transition-all duration-700 ease-in-out transform-style-3d
          ${isCoverView ? '-translate-x-1/4' : 'translate-x-0'}
        `}
        style={containerStyle}
      >
        
        {/* Left Page (or Spacer) */}
        <div className={`
          flex-1 relative transition-all duration-500 transform
          ${(!left && !leftIsSpacer) ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}>
          {/* Real Page */}
          {left && (
            <div className="absolute inset-0 m-1 origin-right shadow-2xl bg-white rounded-l-lg overflow-hidden border-r border-stone-200">
               <img 
                 src={left.url} 
                 alt={left.name} 
                 className="w-full h-full object-contain p-2" 
                 draggable={false}
               />
               <div className="absolute bottom-2 left-4 text-xs text-stone-400 font-mono">
                 {left.index + 1}
               </div>
               <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none mix-blend-multiply" />
            </div>
          )}

          {/* Spacer / Inside Cover Page */}
          {leftIsSpacer && (
             <div className="absolute inset-0 m-1 origin-right shadow-2xl bg-white rounded-l-lg overflow-hidden border-r border-stone-200">
                {/* Blank page matching the background of a standard page (white) */}
                <div className="w-full h-full bg-white opacity-100" />
                <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none mix-blend-multiply" />
             </div>
          )}
        </div>

        {/* Right Page */}
        <div className={`
          flex-1 relative transition-all duration-500 transform
          ${!right ? 'opacity-0' : 'opacity-100'}
        `}>
          {right && (
            <div className={`
              absolute inset-0 m-1 origin-left shadow-2xl bg-white overflow-hidden
              ${isCoverView ? 'rounded-r-lg rounded-l-sm' : 'rounded-r-lg'}
              ${isCoverView ? 'border-l-8 border-stone-800' : 'border-l border-stone-200'}
            `}>
               <img 
                 src={right.url} 
                 alt={right.name} 
                 className="w-full h-full object-contain p-2" 
                 draggable={false}
               />
               {!isCoverView && (
                 <div className="absolute bottom-2 right-4 text-xs text-stone-400 font-mono">
                   {right.index + 1}
                 </div>
               )}
               
               {/* Spine shadow overlay */}
               <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-stone-900/10 to-transparent pointer-events-none mix-blend-multiply" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};