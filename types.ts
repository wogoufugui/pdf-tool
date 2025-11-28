
export enum ToolType {
  EDIT = 'edit',
  MERGE = 'merge',
  SPLIT = 'split',
  IMG_TO_PDF = 'img2pdf',
  CONVERT = 'convert',
}

export interface NavItemProps {
  id: ToolType;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: (id: ToolType) => void;
}

export interface PDFEditOperation {
  id: string; // Unique ID for deletion/selection
  type: 'text' | 'image' | 'erase' | 'shape-rect' | 'shape-circle' | 'shape-line' | 'link' | 'crop' | 'stamp';
  page: number;
  x: number;
  y: number;
  w?: number;
  h?: number;
  // Text & Stamp
  content?: string;
  size?: number;
  color?: { r: number, g: number, b: number };
  // Image
  src?: string;
  // Line
  endX?: number;
  endY?: number;
  // Link
  url?: string;
}

export interface FileWithPreview extends File {
  preview?: string;
}