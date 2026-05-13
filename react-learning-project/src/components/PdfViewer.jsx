import React, { useState, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import KonvaCanvas from './KonvaCanvas';
import { useAnnotations, useSaveAnnotations } from '../hooks/useAnnotations';
import { 
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Save, Trash2, 
  Pencil, Eraser, Square, Circle as CircleIcon, ArrowUpRight, Type, MousePointer2,
  MessageSquare, Layers, Settings, Download, Loader2, Share2, Check
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setTool, setColor, setSize } from '../redux/toolSlice';
import { 
  setLocalAnnotations, 
  updateAllAnnotations, 
  clearPageAnnotations, 
  saveAnnotationsThunk 
} from '../redux/annotationSlice';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

// Set worker for react-pdf (Ensure version match with CDN)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfViewer = ({ fileUrl, documentId }) => {
  const dispatch = useDispatch();
  const { activeTool, brushColor, brushSize } = useSelector((state) => state.tool);

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(() => {
    const saved = localStorage.getItem(`pdf-page-${documentId}`);
    return saved ? parseInt(saved) : 1;
  });
  const [scale, setScale] = useState(1.0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  
  // Redux state for annotations (Global working copy)
  const { pageAnnotations, status: saveStatus } = useSelector((state) => state.annotations);
  const [isShareCopied, setIsShareCopied] = useState(false);

  // Fetch annotations from DB via TanStack Query
  const { data: remoteAnnotations, isLoading } = useAnnotations(documentId);
  // Redux Thunk for saving
  // We still use TanStack Query client for invalidation in the Thunk if needed, 
  // or just handle it in the slice.

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`pdf-anno-${documentId}`);
    if (saved) {
      try {
        dispatch(updateAllAnnotations(JSON.parse(saved)));
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }
  }, [documentId, dispatch]);
  
  // Sync page number to LocalStorage
  useEffect(() => {
    localStorage.setItem(`pdf-page-${documentId}`, pageNumber.toString());
  }, [pageNumber, documentId]);

  // Sync to LocalStorage whenever pageAnnotations changes
  useEffect(() => {
    if (Object.keys(pageAnnotations).length > 0) {
      localStorage.setItem(`pdf-anno-${documentId}`, JSON.stringify(pageAnnotations));
    }
  }, [pageAnnotations, documentId]);

  // Sync remote annotations to Redux state
  useEffect(() => {
    if (remoteAnnotations) {
      const newPageAnnos = { ...pageAnnotations };
      remoteAnnotations.forEach(pageData => {
        // Only overwrite if we don't have local (unsaved) changes for that page
        if (!newPageAnnos[pageData.pageNumber]) {
          newPageAnnos[pageData.pageNumber] = pageData.lines;
        }
      });
      dispatch(updateAllAnnotations(newPageAnnos));
    }
  }, [remoteAnnotations, dispatch]);

  const currentLines = useMemo(() => pageAnnotations[pageNumber] || [], [pageAnnotations, pageNumber]);

  const setLocalLines = (lines) => {
    dispatch(setLocalAnnotations({ pageNumber, lines }));
  };

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);
  const onPageLoadSuccess = (page) => {
    const viewport = page.getViewport({ scale });
    setPageSize({ width: viewport.width, height: viewport.height });
  };

  const handleSave = () => {
    dispatch(saveAnnotationsThunk({ 
      documentId, 
      pageNumber, 
      lines: currentLines,
      pdfUrl: typeof fileUrl === 'string' ? fileUrl : 'local-file'
    }));
  };
  const handleClear = () => { 
    if (window.confirm('Clear all on this page?')) {
      dispatch(clearPageAnnotations(pageNumber));
    }
  };

  const handleDeleteAnnotation = (id) => {
    dispatch(setLocalAnnotations({ 
      pageNumber, 
      lines: currentLines.filter(l => l.id !== id) 
    }));
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsShareCopied(true);
    setTimeout(() => setIsShareCopied(false), 2000);
  };

  const [isExporting, setIsExporting] = useState(false);
  const hasAutoExported = React.useRef(false);

  // Auto-export on opening if annotations exist
  useEffect(() => {
    if (remoteAnnotations && remoteAnnotations.length > 0 && !hasAutoExported.current && !isLoading) {
      // Small delay to ensure rendering is stable
      const timer = setTimeout(() => {
        handleExportPDF();
        hasAutoExported.current = true;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [remoteAnnotations, isLoading]);

  const handleExportPDF = async () => {
    if (!remoteAnnotations || isExporting) return;
    setIsExporting(true);
    try {
      let existingPdfBytes;
      if (typeof fileUrl === 'string') {
        existingPdfBytes = await fetch(fileUrl).then(res => res.arrayBuffer());
      } else {
        existingPdfBytes = await fileUrl.arrayBuffer();
      }

      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();

      // Merge local changes for export
      const allAnnotations = Object.entries(pageAnnotations).map(([pNum, lines]) => ({
        pageNumber: parseInt(pNum),
        lines
      }));

      // Loop through all pages that have annotations
      for (const pageAnno of allAnnotations) {
        const pageIdx = pageAnno.pageNumber - 1;
        if (pageIdx >= pages.length) continue;

        const page = pages[pageIdx];
        const { width, height, x: ox, y: oy } = page.getMediaBox(); // Get true origin and dimensions
        const rotation = page.getRotation().angle;

        for (const anno of pageAnno.lines) {
          try {
            const color = hexToRgb(anno.brushColor || '#000000');
            
            // Helper to map normalized coordinates to PDF Points (handling MediaBox offset)
            const mapX = (nx) => ox + (nx * width);
            const mapY = (ny) => oy + (height - (ny * height)); // PDF Y is bottom-up

            // Handle Pencil and Eraser
            if ((anno.type === 'pencil' || anno.type === 'eraser' || !anno.type) && anno.points) {
              const isEraser = anno.type === 'eraser';
              for (let i = 0; i < anno.points.length - 2; i += 2) {
                page.drawLine({
                  start: { x: mapX(anno.points[i]), y: mapY(anno.points[i+1]) },
                  end: { x: mapX(anno.points[i+2]), y: mapY(anno.points[i+3]) },
                  thickness: anno.brushSize || 2,
                  color: isEraser ? rgb(1, 1, 1) : color,
                  opacity: isEraser ? 1 : 0.8
                });
              }
            } 
            // Handle Rectangles
            else if (anno.type === 'rect') {
              const w = anno.width * width;
              const h = anno.height * height;
              page.drawRectangle({
                x: w < 0 ? mapX(anno.x) + w : mapX(anno.x),
                y: h < 0 ? mapY(anno.y) : mapY(anno.y) - h,
                width: Math.abs(w),
                height: Math.abs(h),
                borderColor: color,
                borderWidth: anno.brushSize || 2,
                color: color,
                opacity: 0.2
              });
            } 
            // Handle Circles
            else if (anno.type === 'circle') {
               const radius = Math.sqrt((anno.width * width) ** 2 + (anno.height * height) ** 2);
               page.drawCircle({
                 x: mapX(anno.x),
                 y: mapY(anno.y),
                 radius: radius,
                 borderColor: color,
                 borderWidth: anno.brushSize || 2,
                 color: color,
                 opacity: 0.2
               });
            } 
            // Handle Text
            else if (anno.type === 'text' && anno.text) {
              const w = anno.width * width;
              const h = anno.height * height;
              const tx = w < 0 ? mapX(anno.x) + w : mapX(anno.x);
              const ty = h < 0 ? mapY(anno.y) : mapY(anno.y) - h;
              
              const fontSize = 12;
              const words = anno.text.split(' ');
              let line = '';
              let currentY = ty + Math.abs(h) - 20;

              for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const testWidth = font.widthOfTextAtSize(testLine, fontSize);
                if (testWidth > Math.abs(w) - 20 && n > 0) {
                  page.drawText(line, { x: tx + 10, y: currentY, size: fontSize, font, color });
                  line = words[n] + ' ';
                  currentY -= fontSize * 1.4;
                } else {
                  line = testLine;
                }
              }
              page.drawText(line, { x: tx + 10, y: currentY, size: fontSize, font, color });
            }
          } catch (annoErr) {
            console.warn('Skipping malformed annotation during export:', annoErr);
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `annotated-${documentId}.pdf`;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] w-full gap-4 p-2 overflow-hidden">
      
      {/* LEFT SIDEBAR: Toolbar */}
      <motion.aside 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="flex flex-col gap-4 p-3 bg-white border border-slate-200 rounded-3xl shadow-sm w-16 items-center"
      >
        <div className="flex flex-col gap-2">
          {[
            { id: 'select', icon: MousePointer2, label: 'Select' },
            { id: 'pencil', icon: Pencil, label: 'Draw' },
            { id: 'rect', icon: Square, label: 'Box' },
            { id: 'circle', icon: CircleIcon, label: 'Circle' },
            { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
            { id: 'text', icon: Type, label: 'Comment' },
            { id: 'eraser', icon: Eraser, label: 'Erase' }
          ].map((tool) => (
            <Button 
              key={tool.id}
              variant={activeTool === tool.id ? "default" : "ghost"}
              size="icon"
              onClick={() => dispatch(setTool(tool.id))}
              className={cn("h-10 w-10 rounded-xl transition-all duration-300 transform active:scale-90", activeTool === tool.id && "bg-blue-600 shadow-lg shadow-blue-200")}
            >
              <tool.icon size={20} />
            </Button>
          ))}
        </div>
        <Separator />
        <div className="flex flex-col gap-4 items-center">
           <div className="relative w-8 h-8 rounded-full border-2 border-slate-200 cursor-pointer overflow-hidden shadow-inner group transition-transform hover:scale-110" style={{ backgroundColor: brushColor }}>
             <input type="color" value={brushColor} onChange={(e) => dispatch(setColor(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer" />
           </div>
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={handleSave} 
             disabled={saveStatus === 'loading'} 
             className={cn("transition-colors", saveStatus === 'loading' ? "text-slate-300" : "text-emerald-600 hover:bg-emerald-50")}
           >
             {saveStatus === 'loading' ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
           </Button>
           <Button variant="ghost" size="icon" onClick={handleClear} className="text-rose-600 hover:bg-rose-50 transition-colors">
             <Trash2 size={20} />
           </Button>
        </div>
      </motion.aside>

      {/* CENTER: PDF Viewer */}
      <motion.main 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex flex-col bg-slate-100 rounded-3xl border border-slate-200 overflow-hidden relative"
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between p-3 bg-white/50 backdrop-blur-md border-b border-slate-200 px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
              <ChevronLeft size={18} />
            </Button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest min-w-[80px] text-center">
              Page {pageNumber} / {numPages || '?'}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))} disabled={pageNumber >= (numPages || 1)}>
              <ChevronRight size={18} />
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border shadow-sm">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}><ZoomOut size={14}/></Button>
              <span className="text-[10px] font-black w-10 text-center">{Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(3, s + 0.1))}><ZoomIn size={14}/></Button>
            </div>
            
            <Separator orientation="vertical" className="h-6" />

            <Button 
              onClick={handleExportPDF} 
              disabled={isExporting}
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl gap-2 px-4 shadow-lg shadow-slate-200 transition-all active:scale-95"
            >
              {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              <span className="text-xs font-bold uppercase tracking-wider">Export PDF</span>
            </Button>
          </div>
        </div>

        {/* PDF Scroll Area */}
        <div className="flex-1 overflow-auto p-8 flex justify-center items-start bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
          <div className="relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] bg-white transition-all duration-500">
             {isLoading && <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center font-bold text-blue-600 animate-pulse">Syncing...</div>}
             <Document 
                file={fileUrl} 
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => {
                  console.error('PDF Load Error:', error);
                  alert(`PDF Load Error: ${error.message}`);
                }}
                loading={<div className="p-20 text-blue-600 font-bold animate-pulse">Loading Document...</div>}
             >
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale} 
                  onLoadSuccess={onPageLoadSuccess} 
                  onRenderError={(err) => console.error('Page Render Error:', err)}
                  renderTextLayer={false} 
                  renderAnnotationLayer={false} 
                  loading={<div className="h-[600px] flex items-center justify-center">Rendering Page...</div>}
                />
             </Document>
             {pageSize.width > 0 && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: pageSize.width, height: pageSize.height, zIndex: 100 }}>
                  <KonvaCanvas width={pageSize.width} height={pageSize.height} scale={scale} lines={currentLines} setLines={setLocalLines} />
                </div>
             )}
          </div>
        </div>
      </motion.main>

      {/* RIGHT PANEL: Status & Comments */}
      <motion.aside 
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.2 }}
        className="w-80 bg-white border border-slate-200 rounded-3xl flex flex-col overflow-hidden shadow-sm"
      >
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
          <MessageSquare size={18} className="text-blue-600" />
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Comment Status</h3>
        </div>
        
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {currentLines.filter(a => a.type === 'text').length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-40 text-slate-300 gap-2"
              >
                 <Layers size={32} />
                 <p className="text-xs font-medium">No comments on this page</p>
              </motion.div>
            ) : (
              currentLines.filter(a => a.type === 'text').map((anno, idx) => (
                <motion.div 
                  key={anno.id || idx}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="p-3 bg-blue-50 border border-blue-100 rounded-2xl group relative"
                >
                   <button 
                     onClick={() => handleDeleteAnnotation(anno.id)}
                     className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                   >
                     <Trash2 size={10} />
                   </button>
                   <div className="flex items-center gap-2 mb-1">
                     <div className="w-2 h-2 rounded-full bg-blue-500" />
                     <span className="text-[10px] font-bold text-blue-400 uppercase">Page {pageNumber}</span>
                   </div>
                   <p className="text-sm text-slate-700 font-medium leading-relaxed font-sans break-words whitespace-pre-wrap">
                     {anno.text}
                   </p>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            <span>Active Marks: {currentLines.length}</span>
            <div className="flex items-center gap-4">
              <button onClick={handleShare} className="flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors uppercase">
                {isShareCopied ? <Check size={12}/> : <Share2 size={12} />}
                {isShareCopied ? 'Copied' : 'Share'}
              </button>
              <span className="text-emerald-500 font-black animate-pulse">● Auto-Synced</span>
            </div>
          </div>
        </div>
      </motion.aside>

    </div>
  );
};

export default PdfViewer;
