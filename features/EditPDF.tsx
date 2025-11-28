import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees, PDFName, PDFString } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import saveAs from 'file-saver';
import { 
  Type, Image as ImageIcon, Eraser, Download, ChevronLeft, ChevronRight, 
  MousePointer2, Square, Circle, Minus, Link as LinkIcon, Crop, 
  Stamp, FileBadge, AppWindow, MoreHorizontal, Undo2, X, AlertCircle, UploadCloud
} from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { PDFEditOperation } from '../types';

type EditorTool = 'cursor' | 'text' | 'image' | 'erase' | 'shape-rect' | 'shape-circle' | 'shape-line' | 'link' | 'crop' | 'stamp';

const EditPDF: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [currPage, setCurrPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTool, setActiveTool] = useState<EditorTool>('cursor');
  const [edits, setEdits] = useState<PDFEditOperation[]>([]);
  const [processing, setProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Dragging state for shapes/erase/link/crop
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [currentDragRect, setCurrentDragRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [selectedEditId, setSelectedEditId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFile = async (fs: File[]) => {
    const f = fs[0];
    setFile(f);
    setEdits([]);
    try {
      const arrayBuffer = await f.arrayBuffer();
      const doc = await PDFDocument.load(arrayBuffer);
      setPdfDoc(doc);
      setTotal(doc.getPageCount());
      setCurrPage(1);
    } catch (e) {
      alert("加载 PDF 失败。");
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.name.toLowerCase().endsWith('.pdf')) {
        handleFile([droppedFile]);
      } else {
        alert("请上传 PDF 文件");
      }
    }
  };

  useEffect(() => {
    const renderPage = async () => {
      if (!file || !canvasRef.current) return;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(currPage);
      
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport: viewport } as any).promise;
    };

    renderPage();
  }, [file, currPage]);

  // --- Tool Actions ---

  const addWatermark = () => {
    const text = prompt("输入水印文本：", "CONFIDENTIAL");
    if (!text) return;
    
    // Add a watermark to ALL pages
    const newEdits: PDFEditOperation[] = [];
    for (let i = 1; i <= total; i++) {
        // Center-ish estimation (will vary by page size, but simplified here)
        newEdits.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'text',
            page: i,
            x: 200, // Roughly center
            y: 400,
            content: text,
            size: 60,
            color: { r: 0.9, g: 0.9, b: 0.9 } // Light gray
        });
    }
    setEdits([...edits, ...newEdits]);
    alert("水印已添加到所有页面（保存后生效，预览中可能覆盖内容）。");
  };

  const addHeaderFooter = (type: 'header' | 'footer') => {
    const text = prompt(`输入${type === 'header' ? '页眉' : '页脚'}文本：`);
    if (!text) return;
    
    const newEdits: PDFEditOperation[] = [];
    for (let i = 1; i <= total; i++) {
        newEdits.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'text',
            page: i,
            x: 50,
            y: type === 'header' ? 20 : 800, // Top or Bottom approx
            content: text,
            size: 10,
            color: { r: 0.3, g: 0.3, b: 0.3 }
        });
    }
    setEdits([...edits, ...newEdits]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setEdits([...edits, { 
            id: Math.random().toString(36).substr(2, 9),
            type: 'image', 
            page: currPage, 
            x: 100, 
            y: 100, 
            w: 150, 
            h: 150, 
            src: ev.target.result as string 
          }]);
          setActiveTool('cursor');
        }
      };
      reader.readAsDataURL(imgFile);
    }
  };

  // --- Mouse Interactions ---

  const getCanvasCoords = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!file) return;
    const { x, y } = getCanvasCoords(e);

    // Tools that require clicking once
    if (activeTool === 'text') {
        const text = prompt("输入文本：");
        if (text) {
            setEdits([...edits, {
                id: Math.random().toString(36).substr(2, 9),
                type: 'text',
                page: currPage,
                x, y,
                content: text,
                size: 18,
                color: { r: 0, g: 0, b: 0 }
            }]);
        }
        setActiveTool('cursor');
        return;
    }

    if (activeTool === 'stamp') {
        const stamps = ["已审核", "保密", "草稿", "紧急"];
        // For simplicity, just cycling or prompting could work. Let's make a simple prompt or default.
        // A real UI would have a dropdown. Let's assume "Approved" for now or prompt.
        // Let's create a nice styled stamp.
        setEdits([...edits, {
            id: Math.random().toString(36).substr(2, 9),
            type: 'stamp',
            page: currPage,
            x: x - 50, y: y - 20,
            w: 100, h: 40,
            content: "APPROVED",
            color: { r: 0.8, g: 0, b: 0 } // Red
        }]);
        setActiveTool('cursor');
        return;
    }

    // Tools that require dragging
    if (['erase', 'shape-rect', 'shape-circle', 'shape-line', 'link', 'crop'].includes(activeTool)) {
        setIsDragging(true);
        setDragStart({ x, y });
        setCurrentDragRect({ x, y, w: 0, h: 0 });
    } else if (activeTool === 'cursor') {
        // Simple selection logic (hit test)
        // Find edit under cursor (reverse to find topmost)
        const hit = [...edits].reverse().find(ed => 
            ed.page === currPage && 
            x >= ed.x && x <= ed.x + (ed.w || 100) && 
            y >= ed.y && y <= ed.y + (ed.h || 20)
        );
        setSelectedEditId(hit ? hit.id : null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const { x, y } = getCanvasCoords(e);
    
    setCurrentDragRect({
        x: Math.min(x, dragStart.x),
        y: Math.min(y, dragStart.y),
        w: Math.abs(x - dragStart.x),
        h: Math.abs(y - dragStart.y)
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart || !currentDragRect) return;
    setIsDragging(false);
    const { w, h } = currentDragRect;
    
    // Ignore tiny drags
    if (w < 5 || h < 5) {
        setDragStart(null);
        setCurrentDragRect(null);
        return;
    }

    const { x, y } = getCanvasCoords(e); // End pos
    const startX = dragStart.x;
    const startY = dragStart.y;

    const newOp: PDFEditOperation = {
        id: Math.random().toString(36).substr(2, 9),
        type: activeTool as any,
        page: currPage,
        x: currentDragRect.x,
        y: currentDragRect.y,
        w: currentDragRect.w,
        h: currentDragRect.h,
    };

    if (activeTool === 'shape-line') {
        newOp.x = startX;
        newOp.y = startY;
        newOp.endX = x;
        newOp.endY = y;
        newOp.w = undefined; 
        newOp.h = undefined;
    }

    if (activeTool === 'link') {
        const url = prompt("输入链接 URL (例如 https://example.com):");
        if (!url) {
            setDragStart(null);
            setCurrentDragRect(null);
            return;
        }
        newOp.url = url;
    }

    if (activeTool === 'crop') {
        // Remove existing crop for this page if any
        const filtered = edits.filter(ed => !(ed.page === currPage && ed.type === 'crop'));
        setEdits([...filtered, newOp]);
    } else {
        setEdits([...edits, newOp]);
    }

    setDragStart(null);
    setCurrentDragRect(null);
    // Keep tool active for multiple draws? Or switch to cursor?
    // Usually switch to cursor for Crop/Link, keep for Shapes.
    if (['link', 'crop'].includes(activeTool)) setActiveTool('cursor');
  };

  const deleteSelected = () => {
      if (selectedEditId) {
          setEdits(edits.filter(e => e.id !== selectedEditId));
          setSelectedEditId(null);
      }
  };

  // --- Saving ---

  const save = async () => {
    if (!pdfDoc || !canvasRef.current) return;
    setProcessing(true);
    try {
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      for (const edit of edits) {
        if (edit.page > pages.length) continue;
        const page = pages[edit.page - 1];
        const { height } = page.getSize();
        
        const canvasHeight = canvasRef.current.height;
        const canvasWidth = canvasRef.current.width;
        const scaleX = page.getWidth() / canvasWidth;
        const scaleY = page.getHeight() / canvasHeight;

        // Coordinates transformation
        const pdfX = edit.x * scaleX;
        // PDF Y is from bottom-left
        
        if (edit.type === 'text' && edit.content) {
             const pdfY = height - (edit.y * scaleY);
             // Simple color mapping
             const color = edit.color ? rgb(edit.color.r, edit.color.g, edit.color.b) : rgb(0,0,0);
             // Handle rotation for watermark if needed, simplified here
             page.drawText(edit.content, { 
                 x: pdfX, 
                 y: pdfY - (edit.size || 12), // Adjust for baseline roughly
                 size: edit.size || 12, 
                 font, 
                 color,
                 opacity: edit.y > 300 && edit.y < 500 && edit.size && edit.size > 50 ? 0.2 : 1 // Heuristic for watermark opacity
             });
        } 
        else if (edit.type === 'stamp' && edit.content) {
            const rectY = height - (edit.y * scaleY) - (edit.h! * scaleY);
            const w = edit.w! * scaleX;
            const h = edit.h! * scaleY;
            // Draw border
            page.drawRectangle({
                x: pdfX, y: rectY, width: w, height: h,
                borderColor: rgb(0.8, 0, 0), borderWidth: 2,
                color: undefined, // Transparent fill
            });
            // Draw Text centered
            page.drawText(edit.content, {
                x: pdfX + 5, y: rectY + h/2 - 6,
                size: 16, font, color: rgb(0.8, 0, 0)
            });
        }
        else if (edit.type === 'erase') {
           const rectY = height - (edit.y * scaleY) - (edit.h! * scaleY);
           page.drawRectangle({ x: pdfX, y: rectY, width: edit.w! * scaleX, height: edit.h! * scaleY, color: rgb(1, 1, 1) });
        } 
        else if (edit.type === 'shape-rect') {
           const rectY = height - (edit.y * scaleY) - (edit.h! * scaleY);
           page.drawRectangle({ 
               x: pdfX, y: rectY, width: edit.w! * scaleX, height: edit.h! * scaleY, 
               borderColor: rgb(0, 0, 0), borderWidth: 2, color: undefined 
           });
        }
        else if (edit.type === 'shape-circle') {
           const w = edit.w! * scaleX;
           const h = edit.h! * scaleY;
           const centerX = pdfX + w/2;
           const centerY = height - (edit.y * scaleY) - h/2;
           // Draw ellipse
           page.drawEllipse({
               x: centerX, y: centerY, xScale: w/2, yScale: h/2,
               borderColor: rgb(0, 0, 0), borderWidth: 2, color: undefined
           });
        }
        else if (edit.type === 'shape-line') {
            const startY = height - (edit.y * scaleY);
            const endY = height - (edit.endY! * scaleY);
            const endX = edit.endX! * scaleX;
            page.drawLine({
                start: { x: pdfX, y: startY },
                end: { x: endX, y: endY },
                thickness: 2, color: rgb(0, 0, 0)
            });
        }
        else if (edit.type === 'link' && edit.url) {
            const rectY = height - (edit.y * scaleY) - (edit.h! * scaleY);
            
            // Create a link annotation manually as pdf-lib doesn't have a high-level helper for it on PDFPage
            const link = pdfDoc.context.register(
                pdfDoc.context.obj({
                    Type: 'Annot',
                    Subtype: 'Link',
                    Rect: [pdfX, rectY, pdfX + (edit.w! * scaleX), rectY + (edit.h! * scaleY)],
                    Border: [0, 0, 0],
                    A: {
                        Type: 'Action',
                        S: 'URI',
                        URI: PDFString.of(edit.url),
                    },
                })
            );

            // Add annotation to the page's Annots array
            let annots = page.node.Annots();
            if (!annots) {
                annots = pdfDoc.context.obj([]);
                page.node.set(PDFName.of('Annots'), annots);
            }
            annots.push(link);

            // Draw a blue highlight to indicate link area
            page.drawRectangle({
                 x: pdfX, y: rectY, width: edit.w! * scaleX, height: edit.h! * scaleY,
                 color: rgb(0, 0, 1), opacity: 0.1
            });
        }
        else if (edit.type === 'crop') {
             const rectY = height - (edit.y * scaleY) - (edit.h! * scaleY);
             page.setCropBox(pdfX, rectY, edit.w! * scaleX, edit.h! * scaleY);
        }
        else if (edit.type === 'image' && edit.src) {
          const imgBytes = await fetch(edit.src).then((r) => r.arrayBuffer());
          let embed;
          if (edit.src.startsWith('data:image/png')) {
            embed = await pdfDoc.embedPng(imgBytes);
          } else {
            embed = await pdfDoc.embedJpg(imgBytes);
          }
          const imgH = edit.h! * scaleY;
          const imgY = height - (edit.y * scaleY) - imgH;
          page.drawImage(embed, { x: pdfX, y: imgY, width: edit.w! * scaleX, height: imgH });
        }
      }
      const pdfBytes = await pdfDoc.save();
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'edited_document.pdf');
    } catch (e) {
      console.error(e);
      alert("保存 PDF 失败。");
    } finally {
      setProcessing(false);
    }
  };

  const ToolButton = ({ tool, icon: Icon, label }: { tool: EditorTool, icon: any, label: string }) => (
      <button 
        onClick={() => setActiveTool(tool)}
        className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] transition-all ${
            activeTool === tool 
            ? 'bg-blue-100 text-blue-700 shadow-sm ring-1 ring-blue-200' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`}
        title={label}
      >
        <Icon size={20} className="mb-1" />
        <span className="text-[10px] font-medium leading-tight">{label}</span>
      </button>
  );

  return (
    <div 
      className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative"
      onDragOver={onDragOver} 
      onDragLeave={onDragLeave} 
      onDrop={onDrop}
    >
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border-4 border-blue-500 border-dashed animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center gap-4 text-blue-600">
              <UploadCloud size={64} />
              <h3 className="text-2xl font-bold">松开以打开 PDF</h3>
            </div>
          </div>
        </div>
      )}

      {/* --- Enhanced Toolbar --- */}
      <div className="border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2 p-2 overflow-x-auto no-scrollbar">
          
          {/* Group 1: Basics */}
          <div className="flex gap-1 pr-3 border-r border-slate-100">
             <ToolButton tool="cursor" icon={MousePointer2} label="选择" />
             <ToolButton tool="text" icon={Type} label="插入文字" />
             <label className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] transition-all cursor-pointer ${!file ? 'opacity-50 pointer-events-none' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                <ImageIcon size={20} className="mb-1" />
                <span className="text-[10px] font-medium leading-tight">插入图片</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={!file} />
             </label>
             <ToolButton tool="erase" icon={Eraser} label="擦除" />
          </div>

          {/* Group 2: Shapes & Stamps */}
          <div className="flex gap-1 px-3 border-r border-slate-100">
             <ToolButton tool="shape-rect" icon={Square} label="矩形" />
             <ToolButton tool="shape-circle" icon={Circle} label="圆形" />
             <ToolButton tool="shape-line" icon={Minus} label="线条" />
             <ToolButton tool="stamp" icon={Stamp} label="图章" />
          </div>

          {/* Group 3: Page Tools */}
          <div className="flex gap-1 px-3 border-r border-slate-100">
             <ToolButton tool="crop" icon={Crop} label="裁剪页面" />
             <ToolButton tool="link" icon={LinkIcon} label="超链接" />
             <button onClick={() => addWatermark()} disabled={!file} className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] text-slate-500 hover:bg-slate-100">
                 <FileBadge size={20} className="mb-1" />
                 <span className="text-[10px] font-medium leading-tight">水印</span>
             </button>
             <button onClick={() => addHeaderFooter('header')} disabled={!file} className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] text-slate-500 hover:bg-slate-100">
                 <AppWindow size={20} className="mb-1" />
                 <span className="text-[10px] font-medium leading-tight">页眉页脚</span>
             </button>
          </div>

          {/* Save Action */}
          <div className="ml-auto flex items-center gap-2 pl-2">
            {selectedEditId && (
                <button onClick={deleteSelected} className="text-red-500 hover:bg-red-50 p-2 rounded-full" title="删除选中">
                    <X size={20} />
                </button>
            )}
            <button 
                onClick={save} 
                disabled={!file || processing} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
                {processing ? '处理中...' : '导出 PDF'} <Download size={16}/>
            </button>
          </div>
        </div>
      </div>

      {/* --- Editor Area --- */}
      {!file ? (
        <div className="flex-1 p-10 flex flex-col justify-center items-center bg-slate-50">
           <div className="max-w-xl w-full">
            <FileUploader onFilesSelected={handleFile} accept=".pdf" label="打开要编辑的 PDF" />
           </div>
        </div>
      ) : (
        <div className="flex-1 bg-slate-100 overflow-auto flex justify-center p-8 relative" ref={containerRef}>
          <div className="relative shadow-2xl border border-slate-200 bg-white" style={{ width: 'fit-content' }}>
            <canvas ref={canvasRef} className="block" />
            
            {/* Overlay Layer */}
            <div 
              className={`absolute inset-0 ${activeTool === 'cursor' ? 'cursor-default' : 'cursor-crosshair'}`} 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Existing Edits */}
              {edits.filter(e => e.page === currPage).map((e) => (
                <div 
                    key={e.id} 
                    style={{ 
                        position: 'absolute', 
                        left: e.x, top: e.y, 
                        width: e.w, height: e.h,
                        pointerEvents: 'none', // Allow clicking through to canvas for creation, simplified
                        border: selectedEditId === e.id ? '2px solid #3b82f6' : 'none' 
                    }}
                >
                  {e.type === 'text' && (
                    <span className="font-bold whitespace-nowrap" style={{ fontSize: `${e.size}px`, color: `rgb(${e.color?.r! * 255}, ${e.color?.g! * 255}, ${e.color?.b! * 255})` }}>
                        {e.content}
                    </span>
                  )}
                  {e.type === 'erase' && (
                    <div className="w-full h-full bg-white border border-slate-200 opacity-90"></div>
                  )}
                  {e.type === 'image' && (
                    <img src={e.src} className="w-full h-full object-contain" alt="edit" />
                  )}
                  {e.type === 'shape-rect' && (
                    <div className="w-full h-full border-2 border-black"></div>
                  )}
                  {e.type === 'shape-circle' && (
                    <div className="w-full h-full border-2 border-black rounded-full"></div>
                  )}
                  {e.type === 'shape-line' && (
                    <svg className="absolute overflow-visible top-0 left-0" style={{ pointerEvents: 'none' }}>
                         <line x1={0} y1={0} x2={e.endX! - e.x} y2={e.endY! - e.y} stroke="black" strokeWidth="2" />
                    </svg>
                  )}
                  {e.type === 'link' && (
                    <div className="w-full h-full bg-blue-500 opacity-20 border border-blue-600 flex items-center justify-center">
                        <LinkIcon size={16} className="text-blue-800" />
                    </div>
                  )}
                  {e.type === 'crop' && (
                    <div className="w-full h-full border-2 border-dashed border-slate-800 bg-black/10 flex items-center justify-center">
                        <span className="bg-black text-white text-xs px-1">裁剪区域</span>
                    </div>
                  )}
                  {e.type === 'stamp' && (
                    <div className="w-full h-full border-4 border-red-600 text-red-600 font-black flex items-center justify-center tracking-widest opacity-80" style={{ transform: 'rotate(-10deg)' }}>
                        {e.content}
                    </div>
                  )}
                </div>
              ))}

              {/* Drag Preview */}
              {isDragging && currentDragRect && (
                  <div 
                    className="absolute border-2 border-blue-500 bg-blue-100/20"
                    style={{
                        left: currentDragRect.x,
                        top: currentDragRect.y,
                        width: currentDragRect.w,
                        height: currentDragRect.h,
                        pointerEvents: 'none'
                    }}
                  >
                     {activeTool === 'shape-circle' && <div className="w-full h-full rounded-full border border-blue-500"></div>}
                     {activeTool === 'shape-line' && dragStart && (
                         <svg className="absolute inset-0 overflow-visible w-full h-full">
                             {/* Line preview is tricky with div rect, simplified to rect for now or implement better SVG overlay */}
                         </svg>
                     )}
                  </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Footer Pagination --- */}
      {file && (
        <div className="p-3 border-t border-slate-200 bg-white flex justify-between items-center">
          <div className="text-xs text-slate-400">
             提示：选中元素后按 Delete 键或点击上方删除按钮可移除。
          </div>
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setCurrPage(Math.max(1, currPage - 1))} 
                disabled={currPage === 1}
                className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30"
            >
                <ChevronLeft size={20}/>
            </button>
            <span className="font-medium text-slate-700 tabular-nums text-sm"> {currPage} / {total} </span>
            <button 
                onClick={() => setCurrPage(Math.min(total, currPage + 1))} 
                disabled={currPage === total}
                className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30"
            >
                <ChevronRight size={20}/>
            </button>
          </div>
          <div className="w-[100px]"></div> {/* Spacer for balance */}
        </div>
      )}
    </div>
  );
};

export default EditPDF;