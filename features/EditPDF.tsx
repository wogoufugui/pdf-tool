import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import saveAs from 'file-saver';
import { 
  Type, Image as ImageIcon, Eraser, Download, ChevronLeft, ChevronRight, 
  MousePointer2, Square, Circle, Minus, Crop, 
  Stamp, FileBadge, X, UploadCloud, Undo2, Check
} from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { PDFEditOperation } from '../types';
import { useLanguage } from '../components/LanguageContext';

type EditorTool = 'cursor' | 'text' | 'image' | 'erase' | 'shape-rect' | 'shape-circle' | 'shape-line' | 'crop' | 'stamp';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

const HANDLE_SIZE = 10;
const MIN_SIZE = 10;
const RENDER_SCALE = 1.5; 

// Stamp Templates
const STAMP_TEMPLATES = [
  { label: 'APPROVED', text: 'APPROVED', color: { r: 0, g: 0.5, b: 0 } }, 
  { label: 'REJECTED', text: 'REJECTED', color: { r: 0.8, g: 0, b: 0 } }, 
  { label: 'DRAFT', text: 'DRAFT', color: { r: 0.5, g: 0.5, b: 0.5 } }, 
  { label: 'CONFIDENTIAL', text: 'CONFIDENTIAL', color: { r: 0.8, g: 0, b: 0 } }, 
  { label: 'COMPLETED', text: 'COMPLETED', color: { r: 0, g: 0, b: 0.8 } }, 
  { label: 'VOID', text: 'VOID', color: { r: 0.2, g: 0.2, b: 0.2 } }, 
];

const EditPDF: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [currPage, setCurrPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTool, setActiveTool] = useState<EditorTool>('cursor');
  const [edits, setEdits] = useState<PDFEditOperation[]>([]);
  const [processing, setProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Stamp State
  const [selectedStampIdx, setSelectedStampIdx] = useState(0);

  // Text Input State (Inline)
  const [textInput, setTextInput] = useState<{x: number, y: number, visible: boolean, value: string} | null>(null);
  
  // Watermark Modal State
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [wmSettings, setWmSettings] = useState({
    text: 'CONFIDENTIAL',
    opacity: 0.3,
    rotation: 45,
    size: 40,
    color: '#808080',
    layout: 'tile' as 'center' | 'tile'
  });

  const { t } = useLanguage();
  
  // Undo Stack
  const [undoStack, setUndoStack] = useState<PDFEditOperation[][]>([]);
  
  // Interaction State
  const [selectedEditId, setSelectedEditId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'none' | 'drawing' | 'moving' | 'resizing'>('none');
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  
  // Temporary state for drag operations
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [elementStartSnapshot, setElementStartSnapshot] = useState<Partial<PDFEditOperation> | null>(null);
  const [currentDragRect, setCurrentDragRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);

  // Refs
  const undoSnapshotRef = useRef<PDFEditOperation[] | null>(null);
  const hasModifiedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (fs: File[]) => {
    const f = fs[0];
    setFile(f);
    setEdits([]);
    setUndoStack([]);
    setSelectedEditId(null);
    setTextInput(null);
    try {
      const arrayBuffer = await f.arrayBuffer();
      const doc = await PDFDocument.load(arrayBuffer);
      setTotal(doc.getPageCount());
      setCurrPage(1);
    } catch (e) {
      alert(t('alert_load_fail'));
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
        alert(t('alert_only_pdf'));
      }
    }
  };

  useEffect(() => {
    const renderPage = async () => {
      if (!file || !canvasRef.current) return;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(currPage);
      
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport: viewport } as any).promise;
    };

    renderPage();
  }, [file, currPage]);

  // Focus text input when it appears
  useEffect(() => {
    if (textInput?.visible && textInputRef.current) {
        textInputRef.current.focus();
    }
  }, [textInput?.visible]);

  // --- Undo Logic ---

  const pushUndo = () => {
    setUndoStack(prev => [...prev, edits]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setEdits(previousState);
    setSelectedEditId(null); 
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
          // Don't delete if editing text
          if (textInput?.visible) return;
          if (selectedEditId) deleteSelected();
      }
      if (e.key === 'Enter' && textInput?.visible) {
          commitText();
      }
      if (e.key === 'Escape' && textInput?.visible) {
          setTextInput(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, edits, selectedEditId, textInput]);


  // --- Helper Functions ---

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

  const isOverHandle = (x: number, y: number, rect: {x: number, y: number, w: number, h: number}) => {
    const handles = [
      { id: 'nw', x: rect.x, y: rect.y },
      { id: 'ne', x: rect.x + rect.w, y: rect.y },
      { id: 'sw', x: rect.x, y: rect.y + rect.h },
      { id: 'se', x: rect.x + rect.w, y: rect.y + rect.h }
    ];
    const hitRadius = HANDLE_SIZE;
    return handles.find(h => 
      x >= h.x - hitRadius && x <= h.x + hitRadius &&
      y >= h.y - hitRadius && y <= h.y + hitRadius
    )?.id as ResizeHandle | undefined;
  };

  const getElementRect = (op: PDFEditOperation) => {
    const w = op.w || 100;
    const h = op.h || (op.type === 'text' ? (op.size || 18) * 1.5 : 50);
    return { x: op.x, y: op.y, w, h };
  };

  // --- Actions ---

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const applyWatermark = () => {
    if (!wmSettings.text) return;
    
    pushUndo();
    const newEdits: PDFEditOperation[] = [];
    const color = hexToRgb(wmSettings.color);
    
    // Canvas dimensions (visual)
    const canvasW = canvasRef.current?.width || 800;
    const canvasH = canvasRef.current?.height || 1000;
    
    for (let i = 1; i <= total; i++) {
        if (wmSettings.layout === 'center') {
            const estW = wmSettings.text.length * wmSettings.size * 0.6;
            newEdits.push({
                id: Math.random().toString(36).substr(2, 9),
                type: 'text',
                page: i,
                x: (canvasW / 2) - (estW / 2),
                y: canvasH / 2,
                w: estW,
                h: wmSettings.size * 1.5,
                content: wmSettings.text,
                size: wmSettings.size,
                color: color,
                rotation: wmSettings.rotation,
                opacity: wmSettings.opacity
            });
        } else {
            // Tiled
            const gapX = 300;
            const gapY = 300;
            for (let y = 100; y < canvasH; y += gapY) {
                for (let x = 100; x < canvasW; x += gapX) {
                     newEdits.push({
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'text',
                        page: i,
                        x: x,
                        y: y,
                        w: 200,
                        h: 50,
                        content: wmSettings.text,
                        size: wmSettings.size,
                        color: color,
                        rotation: wmSettings.rotation,
                        opacity: wmSettings.opacity
                    });
                }
            }
        }
    }
    setEdits([...edits, ...newEdits]);
    setShowWatermarkModal(false);
  };

  const commitText = () => {
      if (textInput && textInput.value.trim()) {
          pushUndo();
          const fontSize = 24;
          const estW = textInput.value.length * fontSize * 0.6 + 20; 
          const estH = fontSize * 1.5;
          
          const newId = Math.random().toString(36).substr(2, 9);
          setEdits([...edits, {
              id: newId,
              type: 'text',
              page: currPage,
              x: textInput.x,
              y: textInput.y,
              w: estW,
              h: estH,
              content: textInput.value,
              size: fontSize,
              color: { r: 0, g: 0, b: 0 }
          }]);
          setSelectedEditId(newId);
      }
      setTextInput(null);
      setActiveTool('cursor');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          pushUndo();
          const id = Math.random().toString(36).substr(2, 9);
          setEdits([...edits, { 
            id,
            type: 'image', 
            page: currPage, 
            x: 100, 
            y: 100, 
            w: 150, 
            h: 150, 
            src: ev.target.result as string 
          }]);
          setActiveTool('cursor');
          setSelectedEditId(id);
        }
      };
      reader.readAsDataURL(imgFile);
    }
  };

  // --- Mouse Interactions ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!file) return;
    
    // If text input is open, commit it first (unless clicking inside input, which is handled by input events)
    if (textInput?.visible) {
        commitText();
        return;
    }

    const { x, y } = getCanvasCoords(e);
    setDragStart({ x, y });

    // 1. Text Tool - Open Inline Input
    if (activeTool === 'text') {
        setTextInput({ x, y, visible: true, value: '' });
        return;
    }

    // 2. Stamp Tool
    if (activeTool === 'stamp') {
        let stampText = "";
        let stampColor = { r: 0.8, g: 0, b: 0 };
        
        if (selectedStampIdx === -1) {
            // Custom
            const text = prompt(t('prompt_text'), "MY STAMP");
            if (!text) return;
            stampText = text;
        } else {
            const template = STAMP_TEMPLATES[selectedStampIdx];
            stampText = template.text;
            stampColor = template.color;
        }

        pushUndo();
        const newId = Math.random().toString(36).substr(2, 9);
        const estW = Math.max(120, stampText.length * 15);

        setEdits([...edits, {
            id: newId,
            type: 'stamp',
            page: currPage,
            x: x - (estW/2), y: y - 25,
            w: estW, h: 50,
            content: stampText,
            color: stampColor,
            rotation: -10,
            opacity: 0.9
        }]);
        setActiveTool('cursor');
        setSelectedEditId(newId);
        return;
    }

    // 3. Cursor Mode
    if (activeTool === 'cursor') {
        undoSnapshotRef.current = edits;
        hasModifiedRef.current = false;

        if (selectedEditId) {
            const selectedEl = edits.find(e => e.id === selectedEditId);
            if (selectedEl && selectedEl.page === currPage) {
                const rect = getElementRect(selectedEl);
                const handleId = isOverHandle(x, y, rect);
                
                if (handleId) {
                    setInteractionMode('resizing');
                    setActiveHandle(handleId);
                    setElementStartSnapshot({ ...selectedEl });
                    return;
                }
            }
        }

        const hit = [...edits].reverse().find(ed => {
            if (ed.page !== currPage) return false;
            const r = getElementRect(ed);
            return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
        });

        if (hit) {
            setSelectedEditId(hit.id);
            setInteractionMode('moving');
            setElementStartSnapshot({ ...hit });
        } else {
            setSelectedEditId(null);
            setInteractionMode('none');
        }
        return;
    }

    // 4. Drawing Tools
    if (['erase', 'shape-rect', 'shape-circle', 'shape-line', 'crop'].includes(activeTool)) {
        setInteractionMode('drawing');
        setCurrentDragRect({ x, y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart) return;
    const { x, y } = getCanvasCoords(e);
    
    if ((interactionMode === 'resizing' || interactionMode === 'moving') && !hasModifiedRef.current && undoSnapshotRef.current) {
        setUndoStack(prev => [...prev, undoSnapshotRef.current!]);
        hasModifiedRef.current = true;
    }

    if (interactionMode === 'resizing' && selectedEditId && elementStartSnapshot && activeHandle) {
        const snapshot = elementStartSnapshot as PDFEditOperation;
        let newX = snapshot.x;
        let newY = snapshot.y;
        let newW = snapshot.w || 0;
        let newH = snapshot.h || 0;
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;

        if (activeHandle.includes('e')) newW = (snapshot.w || 0) + dx;
        if (activeHandle.includes('s')) newH = (snapshot.h || 0) + dy;
        if (activeHandle.includes('w')) {
            newX = snapshot.x + dx;
            newW = (snapshot.w || 0) - dx;
        }
        if (activeHandle.includes('n')) {
            newY = snapshot.y + dy;
            newH = (snapshot.h || 0) - dy;
        }

        if (newW < MIN_SIZE) newW = MIN_SIZE;
        if (newH < MIN_SIZE) newH = MIN_SIZE;

        const updatedEdits = edits.map(ed => {
            if (ed.id === selectedEditId) {
                const updated = { ...ed, x: newX, y: newY, w: newW, h: newH };
                if (ed.type === 'text' && snapshot.h && snapshot.size) {
                    const ratio = newH / snapshot.h;
                    updated.size = snapshot.size * ratio;
                }
                return updated;
            }
            return ed;
        });
        setEdits(updatedEdits);
        return;
    }

    if (interactionMode === 'moving' && selectedEditId && elementStartSnapshot) {
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;
        
        const updatedEdits = edits.map(ed => {
            if (ed.id === selectedEditId) {
                let updated = { 
                    ...ed, 
                    x: (elementStartSnapshot.x || 0) + dx, 
                    y: (elementStartSnapshot.y || 0) + dy 
                };
                if (ed.type === 'shape-line' && elementStartSnapshot.endX !== undefined && elementStartSnapshot.endY !== undefined) {
                    updated.endX = elementStartSnapshot.endX + dx;
                    updated.endY = elementStartSnapshot.endY + dy;
                }
                return updated;
            }
            return ed;
        });
        setEdits(updatedEdits);
        return;
    }

    if (interactionMode === 'drawing') {
        setCurrentDragRect({
            x: Math.min(x, dragStart.x),
            y: Math.min(y, dragStart.y),
            w: Math.abs(x - dragStart.x),
            h: Math.abs(y - dragStart.y)
        });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (interactionMode === 'drawing' && dragStart && currentDragRect) {
        const { w, h } = currentDragRect;
        if (w > 5 && h > 5) {
             pushUndo();
             const { x, y } = getCanvasCoords(e);
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
                opacity: 1
            };

            if (activeTool === 'shape-line') {
                newOp.x = startX;
                newOp.y = startY;
                newOp.endX = x;
                newOp.endY = y;
                newOp.w = undefined;
                newOp.h = undefined;
            }

            if (activeTool === 'crop') {
                 const filtered = edits.filter(ed => !(ed.page === currPage && ed.type === 'crop'));
                 setEdits([...filtered, newOp]);
            } else {
                setEdits([...edits, newOp]);
            }
            
            if (['crop'].includes(activeTool)) setActiveTool('cursor');
        }
    }

    setInteractionMode('none');
    setDragStart(null);
    setElementStartSnapshot(null);
    setCurrentDragRect(null);
    setActiveHandle(null);
  };

  const deleteSelected = () => {
      if (selectedEditId) {
          pushUndo();
          setEdits(edits.filter(e => e.id !== selectedEditId));
          setSelectedEditId(null);
      }
  };

  // --- Saving ---

  const save = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const exportDoc = await PDFDocument.load(arrayBuffer);
      const pages = exportDoc.getPages();
      const font = await exportDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await exportDoc.embedFont(StandardFonts.HelveticaBold);
      
      for (const edit of edits) {
        if (edit.page > pages.length) continue;
        const page = pages[edit.page - 1];
        
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const rotation = page.getRotation().angle;
        
        const scale = 1 / RENDER_SCALE;

        // Visual Coordinates (Top-Left Origin)
        const vx = edit.x * scale;
        const vy = edit.y * scale;
        
        // Map Visual (Top-Left) to PDF (Bottom-Left, Unrotated)
        let pdfX = 0;
        let pdfY = 0;
        let contentRotation = (edit.rotation || 0);

        // Correct logic for Visual Canvas -> PDF Coordinates mapping based on Page Rotation
        if (rotation === 0) {
            pdfX = vx;
            pdfY = pageHeight - vy;
        } else if (rotation === 90) {
            // Visual X (Right) -> PDF Y (Up)
            // Visual Y (Down) -> PDF X (Right)
            pdfX = vy;
            pdfY = vx; 
            contentRotation -= 90; 
        } else if (rotation === 180) {
            pdfX = pageWidth - vx;
            pdfY = vy;
            contentRotation -= 180;
        } else if (rotation === 270) {
            pdfX = pageWidth - vy;
            pdfY = pageHeight - vx;
            contentRotation -= 270;
        }

        // --- DRAWING ---
        if (edit.type === 'text' && edit.content) {
             const pdfFontSize = (edit.size || 12) * scale;
             const color = edit.color ? rgb(edit.color.r, edit.color.g, edit.color.b) : rgb(0,0,0);
             page.drawText(edit.content, { 
                 x: pdfX, 
                 y: pdfY, 
                 size: pdfFontSize, 
                 font, 
                 color,
                 opacity: edit.opacity ?? 1,
                 rotate: degrees(contentRotation)
             });
        } 
        else if (edit.type === 'stamp' && edit.content) {
            const h = edit.h! * scale;
            const w = edit.w! * scale;
            const color = edit.color ? rgb(edit.color.r, edit.color.g, edit.color.b) : rgb(0.8, 0, 0);

            // Calculate center of the stamp based on pdfX, pdfY (which are top-left of visual stamp)
            // We need to offset from the "corner" pdfX, pdfY to the center of the box
            // Note: pdfX/pdfY logic above maps visual Top-Left to a point on PDF.
            // If Rotation=0: pdfX, pdfY is Top-Left of Rect. Center is x+w/2, y-h/2.
            // If Rotation=90: pdfX, pdfY is visual Top-Left => PDF point. Visual Width goes to PDF Y.
            // This is getting complex. Let's use Visual Center mapping, it's safer.

            // 1. Find Visual Center
            const vcx = vx + w/2;
            const vcy = vy + h/2;

            // 2. Map Visual Center to PDF Center
            let pcx = 0;
            let pcy = 0;
            if (rotation === 0) { pcx = vcx; pcy = pageHeight - vcy; }
            else if (rotation === 90) { pcx = vcy; pcy = vcx; }
            else if (rotation === 180) { pcx = pageWidth - vcx; pcy = vcy; }
            else if (rotation === 270) { pcx = pageWidth - vcy; pcy = pageHeight - vcx; }

            // 3. Draw Rotated Rect around Center (pcx, pcy)
            // drawRectangle rotates around its (x, y) anchor.
            // We want center to be (pcx, pcy).
            // Relative to anchor (x,y), unrotated center is (w/2, h/2).
            // We need to solve for anchor (ax, ay) such that after rotation, center is (pcx, pcy).
            // Rotated center = Rotate(anchor + (w/2, h/2)) = Rotate(anchor) + Rotate(w/2, h/2)? 
            // No, Rotate is around anchor.
            // Rotated Center Point = anchor + RotateVector((w/2, h/2), theta)
            
            const rad = (contentRotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            // Vector from anchor to center (unrotated)
            const dx = w/2;
            const dy = h/2;
            
            // Vector from anchor to center (rotated)
            const rdx = dx * cos - dy * sin;
            const rdy = dx * sin + dy * cos;
            
            // Anchor position
            const ax = pcx - rdx;
            const ay = pcy - rdy;

            page.drawRectangle({
                x: ax, y: ay,
                width: w, height: h,
                borderColor: color, borderWidth: 3 * scale,
                rotate: degrees(contentRotation),
                opacity: edit.opacity ?? 1
            });
             
             // Text Centering
             const fontSize = h * 0.6; 
             const textWidth = fontBold.widthOfTextAtSize(edit.content, fontSize);
             // Unrotated text offset relative to center (pcx, pcy)
             const tdx = -textWidth / 2;
             const tdy = -fontSize / 3; 

             // Rotated text offset
             const rtdx = tdx * cos - tdy * sin;
             const rtdy = tdx * sin + tdy * cos;

             page.drawText(edit.content, {
                 x: pcx + rtdx,
                 y: pcy + rtdy,
                 size: fontSize, font: fontBold, color: color,
                 opacity: edit.opacity ?? 1,
                 rotate: degrees(contentRotation)
             });
        }
        else if (edit.type === 'image' && edit.src) {
           try {
              const imgBytes = await fetch(edit.src).then((r) => r.arrayBuffer());
              let embed;
              if (edit.src.startsWith('data:image/png')) embed = await exportDoc.embedPng(imgBytes);
              else if (edit.src.startsWith('data:image/jpeg') || edit.src.startsWith('data:image/jpg')) embed = await exportDoc.embedJpg(imgBytes);
              else continue;

              const w = edit.w! * scale;
              const h = edit.h! * scale;

              // Visual Center Mapping
              const vcx = vx + w/2;
              const vcy = vy + h/2;
              let pcx = 0, pcy = 0;
              if (rotation === 0) { pcx = vcx; pcy = pageHeight - vcy; }
              else if (rotation === 90) { pcx = vcy; pcy = vcx; }
              else if (rotation === 180) { pcx = pageWidth - vcx; pcy = vcy; }
              else if (rotation === 270) { pcx = pageWidth - vcy; pcy = pageHeight - vcx; }
              
              // Image draws from bottom-left. We need to calculate anchor from center.
              // Images can also be rotated in pdf-lib.
              const rad = (contentRotation * Math.PI) / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              const dx = w/2;
              const dy = h/2;
              const rdx = dx * cos - dy * sin;
              const rdy = dx * sin + dy * cos;
              const ax = pcx - rdx;
              const ay = pcy - rdy;

              page.drawImage(embed, { 
                  x: ax, 
                  y: ay, 
                  width: w, 
                  height: h, 
                  rotate: degrees(contentRotation),
                  opacity: edit.opacity ?? 1
              });
           } catch(e) { console.error(e); }
        }
        else if (edit.type === 'erase') {
            const h = edit.h! * scale;
            const w = edit.w! * scale;
            const vcx = vx + w/2;
            const vcy = vy + h/2;
            let pcx = 0, pcy = 0;
            if (rotation === 0) { pcx = vcx; pcy = pageHeight - vcy; }
            else if (rotation === 90) { pcx = vcy; pcy = vcx; }
            else if (rotation === 180) { pcx = pageWidth - vcx; pcy = vcy; }
            else if (rotation === 270) { pcx = pageWidth - vcy; pcy = pageHeight - vcx; }

            const rad = (contentRotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const rdx = (w/2) * cos - (h/2) * sin;
            const rdy = (w/2) * sin + (h/2) * cos;
            const ax = pcx - rdx;
            const ay = pcy - rdy;

            page.drawRectangle({ x: ax, y: ay, width: w, height: h, color: rgb(1,1,1), rotate: degrees(contentRotation) });
        }
      }
      const pdfBytes = await exportDoc.save();
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'edited_document.pdf');
    } catch (e) {
      console.error(e);
      alert(t('alert_save_fail'));
    } finally {
      setProcessing(false);
    }
  };

  const ToolButton = ({ tool, icon: Icon, label }: { tool: EditorTool, icon: any, label: string }) => (
      <button 
        onClick={() => {
            setActiveTool(tool);
            if (tool !== 'cursor') setSelectedEditId(null);
        }}
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
      {/* Watermark Modal */}
      {showWatermarkModal && (
          <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <FileBadge className="text-blue-600"/> {t('edit_watermark')}
                  </h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-sm font-medium text-slate-600 block mb-1">{t('prompt_watermark')}</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg"
                            value={wmSettings.text}
                            onChange={e => setWmSettings({...wmSettings, text: e.target.value})}
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-sm font-medium text-slate-600 block mb-1">Layout</label>
                              <select 
                                className="w-full p-2 border rounded-lg"
                                value={wmSettings.layout}
                                onChange={e => setWmSettings({...wmSettings, layout: e.target.value as any})}
                              >
                                  <option value="center">Center (居中)</option>
                                  <option value="tile">Tile (平铺)</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-sm font-medium text-slate-600 block mb-1">Color</label>
                              <input 
                                type="color" 
                                className="w-full h-[38px] p-1 border rounded-lg cursor-pointer"
                                value={wmSettings.color}
                                onChange={e => setWmSettings({...wmSettings, color: e.target.value})}
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-sm font-medium text-slate-600 block mb-1">Rotation ({wmSettings.rotation}°)</label>
                              <input 
                                type="range" min="0" max="360"
                                className="w-full"
                                value={wmSettings.rotation}
                                onChange={e => setWmSettings({...wmSettings, rotation: Number(e.target.value)})}
                              />
                           </div>
                           <div>
                              <label className="text-sm font-medium text-slate-600 block mb-1">Opacity ({wmSettings.opacity})</label>
                              <input 
                                type="range" min="0.1" max="1" step="0.1"
                                className="w-full"
                                value={wmSettings.opacity}
                                onChange={e => setWmSettings({...wmSettings, opacity: Number(e.target.value)})}
                              />
                           </div>
                      </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                      <button onClick={() => setShowWatermarkModal(false)} className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
                      <button onClick={applyWatermark} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Apply</button>
                  </div>
              </div>
          </div>
      )}

      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border-4 border-blue-500 border-dashed animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center gap-4 text-blue-600">
              <UploadCloud size={64} />
              <h3 className="text-2xl font-bold">{t('edit_drag_overlay')}</h3>
            </div>
          </div>
        </div>
      )}

      {/* --- Toolbar --- */}
      <div className="border-b border-slate-100 bg-white z-10 flex flex-col">
        <div className="flex items-center gap-2 p-2 overflow-x-auto no-scrollbar">
          
          <div className="flex gap-1 pr-3 border-r border-slate-100">
             <ToolButton tool="cursor" icon={MousePointer2} label={t('edit_tool_cursor')} />
             <ToolButton tool="text" icon={Type} label={t('edit_tool_text')} />
             <label className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] transition-all cursor-pointer ${!file ? 'opacity-50 pointer-events-none' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                <ImageIcon size={20} className="mb-1" />
                <span className="text-[10px] font-medium leading-tight">{t('edit_tool_image')}</span>
                <input type="file" className="hidden" accept="image/png, image/jpeg, image/jpg" onChange={handleImageUpload} disabled={!file} />
             </label>
             <ToolButton tool="erase" icon={Eraser} label={t('edit_tool_erase')} />
          </div>

          <div className="flex gap-1 px-3 border-r border-slate-100">
             <ToolButton tool="shape-rect" icon={Square} label={t('edit_tool_rect')} />
             <ToolButton tool="shape-circle" icon={Circle} label={t('edit_tool_circle')} />
             <ToolButton tool="shape-line" icon={Minus} label={t('edit_tool_line')} />
             <ToolButton tool="stamp" icon={Stamp} label={t('edit_tool_stamp')} />
          </div>

          <div className="flex gap-1 px-3 border-r border-slate-100">
             <ToolButton tool="crop" icon={Crop} label={t('edit_tool_crop')} />
             <button onClick={() => setShowWatermarkModal(true)} disabled={!file} className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] text-slate-500 hover:bg-slate-100">
                 <FileBadge size={20} className="mb-1" />
                 <span className="text-[10px] font-medium leading-tight">{t('edit_watermark')}</span>
             </button>
          </div>

          <div className="ml-auto flex items-center gap-2 pl-2">
            <button 
                onClick={handleUndo} 
                disabled={undoStack.length === 0}
                className="text-slate-500 hover:bg-slate-100 disabled:opacity-30 p-2 rounded-full transition-colors" 
                title={t('edit_undo_tooltip')}
            >
                <Undo2 size={20} />
            </button>
            {selectedEditId && (
                <button onClick={deleteSelected} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors" title={t('edit_delete_tooltip')}>
                    <X size={20} />
                </button>
            )}
            <button 
                onClick={save} 
                disabled={!file || processing} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
                {processing ? t('edit_processing') : t('edit_export_btn')} <Download size={16}/>
            </button>
          </div>
        </div>

        {/* Sub-toolbar for Stamps */}
        {activeTool === 'stamp' && (
             <div className="bg-slate-50 border-t border-slate-100 p-2 flex gap-2 items-center text-sm px-4 animate-in slide-in-from-top-2">
                <span className="font-medium text-slate-600">选择图章样式:</span>
                <select 
                    className="p-1.5 rounded border border-slate-300 bg-white"
                    value={selectedStampIdx}
                    onChange={(e) => setSelectedStampIdx(Number(e.target.value))}
                >
                    {STAMP_TEMPLATES.map((t, i) => (
                        <option key={t.label} value={i}>{t.label}</option>
                    ))}
                    <option value={-1}>自定义文字 (Custom)...</option>
                </select>
                <span className="text-xs text-slate-400 ml-2">点击画布放置图章</span>
             </div>
        )}
      </div>

      {/* --- Editor Area --- */}
      {!file ? (
        <div className="flex-1 p-10 flex flex-col justify-center items-center bg-slate-50">
           <div className="max-w-xl w-full">
            <FileUploader onFilesSelected={handleFile} accept=".pdf" label={t('edit_open_pdf')} />
           </div>
        </div>
      ) : (
        <div className="flex-1 bg-slate-100 overflow-auto flex justify-center p-8 relative" ref={containerRef}>
          <div className="relative shadow-2xl border border-slate-200 bg-white" style={{ width: 'fit-content' }}>
            <canvas ref={canvasRef} className="block" />
            
            {/* Overlay Layer */}
            <div 
              className={`absolute inset-0 ${
                activeTool !== 'cursor' ? 'cursor-crosshair' : 
                interactionMode === 'moving' ? 'cursor-grabbing' : 
                'cursor-default'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Existing Edits */}
              {edits.filter(e => e.page === currPage).map((e) => {
                  const isSelected = selectedEditId === e.id;
                  const rect = getElementRect(e);
                  
                  return (
                    <div 
                        key={e.id} 
                        style={{ 
                            position: 'absolute', 
                            left: rect.x, top: rect.y, 
                            width: rect.w, height: rect.h,
                            pointerEvents: activeTool === 'cursor' ? 'auto' : 'none',
                            transform: e.rotation ? `rotate(${e.rotation}deg)` : 'none',
                            opacity: e.opacity ?? 1
                        }}
                        className={`group ${isSelected ? 'z-10' : 'z-0'} ${activeTool === 'cursor' ? 'cursor-grab hover:outline hover:outline-1 hover:outline-blue-300' : ''}`}
                    >
                      {/* Selection Border & Resize Handles */}
                      {isSelected && (
                        <>
                            <div className="absolute inset-0 border-2 border-blue-600 pointer-events-none" />
                            {/* Resize Handles - Only for Rect-like objects (Not Line for simplicity for now) */}
                            {e.type !== 'shape-line' && (
                                <>
                                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 cursor-nw-resize" />
                                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 cursor-ne-resize" />
                                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 cursor-sw-resize" />
                                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 cursor-se-resize" />
                                </>
                            )}
                        </>
                      )}

                      {/* Content Rendering */}
                      {e.type === 'text' && (
                        <div className="w-full h-full overflow-hidden flex items-start" 
                             style={{ 
                                 fontSize: `${e.size}px`, 
                                 lineHeight: '1',
                                 fontFamily: 'Helvetica, sans-serif',
                                 color: `rgb(${e.color?.r! * 255}, ${e.color?.g! * 255}, ${e.color?.b! * 255})`,
                                 whiteSpace: 'nowrap'
                             }}>
                            {e.content}
                        </div>
                      )}
                      {e.type === 'erase' && (
                        <div className="w-full h-full bg-white border border-slate-200 opacity-90"></div>
                      )}
                      {e.type === 'image' && e.src && (
                        <img src={e.src} className="w-full h-full object-fill select-none" alt="edit" draggable={false} />
                      )}
                      {e.type === 'shape-rect' && (
                        <div className="w-full h-full border-2 border-black box-border"></div>
                      )}
                      {e.type === 'shape-circle' && (
                        <div className="w-full h-full border-2 border-black rounded-full box-border"></div>
                      )}
                      {e.type === 'shape-line' && (
                        <svg className="absolute overflow-visible top-0 left-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                             <line x1={0} y1={0} x2={e.endX! - e.x} y2={e.endY! - e.y} stroke="black" strokeWidth="2" />
                        </svg>
                      )}
                      {e.type === 'crop' && (
                        <div className="w-full h-full border-2 border-dashed border-slate-800 bg-black/10 flex items-center justify-center">
                            <span className="bg-black text-white text-xs px-1">{t('crop_area')}</span>
                        </div>
                      )}
                      {e.type === 'stamp' && (
                        <div 
                            className="w-full h-full border-4 font-black flex items-center justify-center tracking-widest" 
                            style={{ 
                                borderColor: `rgb(${e.color?.r! * 255}, ${e.color?.g! * 255}, ${e.color?.b! * 255})`,
                                color: `rgb(${e.color?.r! * 255}, ${e.color?.g! * 255}, ${e.color?.b! * 255})`,
                            }}
                        >
                            {e.content}
                        </div>
                      )}
                    </div>
                  );
              })}

              {/* Drawing Preview */}
              {interactionMode === 'drawing' && currentDragRect && (
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
                  </div>
              )}
            </div>

            {/* Inline Text Input (Moved after Overlay to be on top) */}
            {textInput?.visible && (
                <div 
                    className="absolute z-50 flex gap-1 animate-in zoom-in-95 duration-100"
                    style={{ left: textInput.x, top: textInput.y }}
                >
                    <input
                        ref={textInputRef}
                        type="text"
                        className="bg-white border-2 border-blue-500 rounded p-1 shadow-lg outline-none min-w-[200px]"
                        value={textInput.value}
                        onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                        placeholder={t('prompt_text')}
                        onKeyDown={(e) => {
                             if (e.key === 'Enter') commitText();
                             if (e.key === 'Escape') setTextInput(null);
                        }}
                    />
                    <button onClick={commitText} className="bg-blue-600 text-white p-1.5 rounded shadow-lg hover:bg-blue-700">
                        <Check size={16} />
                    </button>
                    <button onClick={() => setTextInput(null)} className="bg-white text-slate-500 p-1.5 rounded shadow-lg hover:text-red-500">
                        <X size={16} />
                    </button>
                </div>
            )}
          </div>
        </div>
      )}

      {/* --- Footer --- */}
      {file && (
        <div className="p-3 border-t border-slate-200 bg-white flex justify-between items-center z-10">
          <div className="text-xs text-slate-400">
             {t('edit_hint')}
          </div>
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setCurrPage(Math.max(1, currPage - 1))} 
                disabled={currPage === 1}
                className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30"
            >
                <ChevronLeft size={20}/>
            </button>
            <span className="font-medium text-slate-700 tabular-nums text-sm"> {t('page_counter', { curr: currPage, total: total })} </span>
            <button 
                onClick={() => setCurrPage(Math.min(total, currPage + 1))} 
                disabled={currPage === total}
                className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30"
            >
                <ChevronRight size={20}/>
            </button>
          </div>
          <div className="w-[100px]"></div>
        </div>
      )}
    </div>
  );
};

export default EditPDF;