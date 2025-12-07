import { FileSystemEntry, FileSystemDirectoryEntry, FileSystemFileEntry, ProcessedPage, FileSystemDirectoryReader } from '../types';

const XLINK_NS = 'http://www.w3.org/1999/xlink';
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Robustly reads all entries from a directory reader.
 * FileSystemDirectoryReader.readEntries may not return all entries in a single call.
 */
async function readAllEntries(dirReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = [];
  let readEntries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
     dirReader.readEntries((res) => resolve(res), (err) => reject(err));
  });
  
  while (readEntries.length > 0) {
    entries.push(...readEntries);
    readEntries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      dirReader.readEntries((res) => resolve(res), (err) => reject(err));
    });
  }
  return entries;
}

/**
 * Traverses a FileSystemEntry (file or directory) and returns a flat list of Files.
 */
async function traverseFileTree(entry: FileSystemEntry): Promise<File[]> {
  const files: File[] = [];

  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    await new Promise<void>((resolve, reject) => {
      fileEntry.file(
        (file) => {
          files.push(file);
          resolve();
        },
        (err) => reject(err)
      );
    });
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const dirReader = dirEntry.createReader();
    const entries = await readAllEntries(dirReader);

    for (const childEntry of entries) {
      const childFiles = await traverseFileTree(childEntry);
      files.push(...childFiles);
    }
  }
  return files;
}

/**
 * Extract filename from a path string, handling URL encoding and query params.
 */
function getFilenameFromPath(path: string): string {
  if (!path) return '';
  // Ignore data URIs or absolute HTTP links
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return '';
  }

  // Handle / or \ separators
  const parts = path.split(/[/\\]/);
  let filename = parts[parts.length - 1];
  
  // Remove query params or hashes (e.g., image.png?v=1)
  filename = filename.split(/[?#]/)[0];
  
  // Decode (e.g., my%20image.png -> my image.png)
  try {
    return decodeURIComponent(filename);
  } catch (e) {
    return filename;
  }
}

/**
 * Reads a file as a Base64 Data URL.
 * Required for embedding images into SVGs so they display within <img> tags.
 * SVGs loaded in <img> tags are sandboxed and cannot load external blob: URLs.
 */
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
};

/**
 * Recursive function to redact text nodes by replacing content with blocks.
 */
const redactTextNodes = (node: Node) => {
  // Node.TEXT_NODE is 3
  if (node.nodeType === 3 && node.textContent) {
    // Replace non-whitespace characters with U+25AE (Black Vertical Rectangle)
    node.textContent = node.textContent.replace(/[^\s]/g, '\u25AE');
  } else {
    node.childNodes.forEach(child => redactTextNodes(child));
  }
};

/**
 * Main function to process dropped items or file input list.
 * 1. Collects all files.
 * 2. Creates Data URLs for assets (images, fonts, etc.).
 * 3. Reads SVGs, replaces asset filenames with Data URLs using DOM parsing.
 * 4. Applies redaction based on data-tags.
 * 5. Sorts SVGs alphanumerically.
 */
export const processFiles = async (
  items: DataTransferItemList | FileList
): Promise<ProcessedPage[]> => {
  let allFiles: File[] = [];

  // Handle Drag & Drop (DataTransferItemList)
  if (items instanceof DataTransferItemList) {
    const entries = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        entries.push(entry as unknown as FileSystemEntry);
      } else if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) allFiles.push(file);
      }
    }
    for (const entry of entries) {
      allFiles.push(...await traverseFileTree(entry));
    }
  } 
  // Handle Input Select (FileList)
  else {
    allFiles = Array.from(items);
  }

  // Filter out system files like .DS_Store
  allFiles = allFiles.filter(f => !f.name.startsWith('.'));

  // Separate SVGs and Assets
  const svgFiles = allFiles.filter(f => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'));
  const assetFiles = allFiles.filter(f => f.type !== 'image/svg+xml' && !f.name.toLowerCase().endsWith('.svg'));

  // Map asset filenames to Data URLs
  // Use a secondary map for case-insensitive lookup to be more robust
  const assetMap = new Map<string, string>();
  const assetMapLower = new Map<string, string>();
  
  // Convert all assets to Base64
  await Promise.all(assetFiles.map(async (file) => {
    try {
        const dataUrl = await readFileAsDataURL(file);
        assetMap.set(file.name, dataUrl);
        assetMapLower.set(file.name.toLowerCase(), dataUrl);
    } catch (e) {
        console.warn(`Could not read asset ${file.name}`, e);
    }
  }));

  const processedPages: ProcessedPage[] = [];
  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  // Process SVGs
  for (const file of svgFiles) {
    let content = await file.text();
    let width = 0;
    let height = 0;
    
    try {
      const doc = parser.parseFromString(content, "image/svg+xml");
      
      // Check for parsing errors
      if (doc.getElementsByTagName('parsererror').length === 0) {
        const svgElement = doc.documentElement;
        
        // 1. Extract Dimensions (viewBox takes precedence)
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
            const parts = viewBox.split(/[\s,]+/).filter(Boolean).map(Number);
            if (parts.length === 4) {
                width = parts[2];
                height = parts[3];
            }
        }
        
        if (!width || !height) {
            const wAttr = svgElement.getAttribute('width');
            const hAttr = svgElement.getAttribute('height');
            if (wAttr) width = parseFloat(wAttr);
            if (hAttr) height = parseFloat(hAttr);
        }

        // 2. Process Resources (Link replacement)
        const elements = doc.getElementsByTagName('*');
        
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          
          const processAttribute = (attrName: string, namespace: string | null) => {
            const val = namespace ? el.getAttributeNS(namespace, attrName) : el.getAttribute(attrName);
            if (!val) return;
            
            const filename = getFilenameFromPath(val);
            if (!filename) return;

            // Try exact match, then lowercase, then decoded
            let assetUrl = assetMap.get(filename);
            if (!assetUrl) assetUrl = assetMapLower.get(filename.toLowerCase());
            if (!assetUrl) {
                try {
                    const decoded = decodeURIComponent(filename);
                    assetUrl = assetMap.get(decoded) || assetMapLower.get(decoded.toLowerCase());
                } catch(e) {}
            }

            if (assetUrl) {
              if (namespace === XLINK_NS) {
                  // Explicitly set xlink:href to preserve prefix which many viewers require
                  el.setAttributeNS(namespace, 'xlink:href', assetUrl);
              } else if (namespace) {
                  el.setAttributeNS(namespace, attrName, assetUrl);
              } else {
                  el.setAttribute(attrName, assetUrl);
              }
            }
          };

          processAttribute('href', null);
          processAttribute('src', null);
          processAttribute('href', XLINK_NS); // Handle <image xlink:href="...">
          processAttribute('xlink:href', null); // Handle legacy/malformed xlink:href attributes without NS
        }

        // 3. Process Redactions via data-tags
        const taggedElements = doc.querySelectorAll('[data-tags]');
        
        // Only inject filter if we find elements that need it
        let needsFilter = false;
        taggedElements.forEach(el => {
            const tagsStr = el.getAttribute('data-tags') || '';
            const tags = tagsStr.split(',').map(s => s.trim().toLowerCase());
            if (tags.some(t => t.startsWith('redact'))) needsFilter = true;
        });

        if (needsFilter) {
            // Generate a unique ID for the filter to avoid conflicts
            const filterId = 'redact-blur-' + Math.random().toString(36).substr(2, 9);
            
            // Create or get <defs>
            let defs = doc.querySelector('defs');
            if (!defs) {
                defs = doc.createElementNS(SVG_NS, 'defs');
                if (doc.documentElement.firstChild) {
                    doc.documentElement.insertBefore(defs, doc.documentElement.firstChild);
                } else {
                    doc.documentElement.appendChild(defs);
                }
            }

            // Create Filter Definition
            const filter = doc.createElementNS(SVG_NS, 'filter');
            filter.setAttribute('id', filterId);
            // Expand filter region to prevent clipping of the blur at element edges
            filter.setAttribute('x', '-50%');
            filter.setAttribute('y', '-50%');
            filter.setAttribute('width', '200%');
            filter.setAttribute('height', '200%');

            const feGaussian = doc.createElementNS(SVG_NS, 'feGaussianBlur');
            feGaussian.setAttribute('in', 'SourceGraphic');
            // Significantly increased stdDeviation for even stronger blur
            feGaussian.setAttribute('stdDeviation', '150'); 
            // Duplicate edges so we don't fade to transparent at the border of the image
            feGaussian.setAttribute('edgeMode', 'duplicate'); 
            
            filter.appendChild(feGaussian);
            defs.appendChild(filter);

            taggedElements.forEach(el => {
                const tagsStr = el.getAttribute('data-tags') || '';
                const tags = tagsStr.split(',').map(s => s.trim().toLowerCase());
                
                if (tags.some(t => t.startsWith('redact'))) {
                    
                    // A. Redact Images (Blur)
                    // Select self if image, or descendant images
                    const nodeName = el.nodeName.toLowerCase();
                    const images = (nodeName === 'image') 
                        ? [el] 
                        : Array.from(el.getElementsByTagName('image'));
                    
                    images.forEach(img => {
                        // Apply SVG filter
                        img.setAttribute('filter', `url(#${filterId})`);
                        
                        // Keep CSS fallback just in case, but native SVG filter is primary
                        const existingStyle = img.getAttribute('style') || '';
                        img.setAttribute('style', `${existingStyle}; filter: blur(150px);`);
                    });

                    // B. Redact Text (Replace characters)
                    redactTextNodes(el);
                }
            });
        }

        content = serializer.serializeToString(doc);
      }
    } catch (e) {
      console.warn("Error parsing SVG DOM, falling back to regex replacement:", file.name, e);
    }

    // Secondary pass: Regex replace for CSS url(...) 
    // This handles <style> blocks, style attributes, and catch-alls
    content = content.replace(/url\((['"]?)(.*?)\1\)/g, (match, quote, url) => {
      const filename = getFilenameFromPath(url);
      if (filename) {
        let assetUrl = assetMap.get(filename) || assetMapLower.get(filename.toLowerCase());
        if (assetUrl) {
          return `url(${quote}${assetUrl}${quote})`;
        }
      }
      return match;
    });

    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    // Default to A4ish ratio if extraction failed
    if (!width) width = 595;
    if (!height) height = 842;

    processedPages.push({
      id: crypto.randomUUID(),
      name: file.name,
      url,
      index: 0, // placeholder
      width,
      height
    });
  }

  // Sort pages alphanumerically
  processedPages.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  // Assign correct indices
  return processedPages.map((page, index) => ({ ...page, index }));
};