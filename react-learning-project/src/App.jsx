import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PdfViewer from './components/PdfViewer';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileUp, Sparkles } from 'lucide-react';


const App = () => {
  const [pdfFile, setPdfFile] = useState('/sample.pdf');
  const [docId, setDocId] = useState('sample-doc-001');

  // Create a memoized URL for the PDF file (handles both strings and File objects)
  const memoizedFile = React.useMemo(() => {
    if (!pdfFile) return null;
    if (typeof pdfFile === 'string') return pdfFile;
    return URL.createObjectURL(pdfFile);
  }, [pdfFile]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setDocId(`local-${file.name.replace(/\s+/g, '-')}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 font-sans selection:bg-blue-100 overflow-x-hidden">
      {/* Header */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-[60] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
      >
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100"
          >
            <Sparkles size={24} fill="currentColor" />
          </motion.div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              Kanvas <span className="text-blue-600">Pro</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Next-Gen PDF Workflows</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <input type="file" accept=".pdf" onChange={handleFileChange} id="file-upload" className="hidden" />
          <motion.label 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            htmlFor="file-upload" 
            className={cn(
              buttonVariants({ variant: "outline" }), 
              "cursor-pointer border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl px-5 h-11 flex items-center gap-2 transition-all shadow-sm"
            )}
          >
            <FileUp size={18} />
            <span className="text-sm font-bold">Import PDF</span>
          </motion.label>
          
          <div className="h-8 w-[1px] bg-slate-100" />
          
          <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-6 h-11 text-sm font-bold shadow-lg shadow-slate-100 transition-all active:scale-95">
            Cloud Sync
          </Button>
        </div>
      </motion.header>

      <main className="max-w-[1800px] mx-auto p-6">
        <motion.section 
          key={docId} // Trigger re-animation on file change
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-[3rem] p-3 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden min-h-[85vh]"
        >
          <PdfViewer fileUrl={memoizedFile} documentId={docId} />
        </motion.section>
      </main>

      <footer className="py-12 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">
        <p>&copy; 2026 Antigravity Advanced Agentic Coding. Built for excellence.</p>
      </footer>
    </div>
  );
};

export default App;

