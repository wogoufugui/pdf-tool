import React from 'react';

export enum ToolType {
  HOME = 'home',
  EDIT = 'edit',
  MERGE = 'merge',
  SPLIT = 'split',
  IMG_TO_PDF = 'img2pdf',
  EXTRACT_IMAGES = 'extract_images',
  CONVERT = 'convert',
  REMOVE_WATERMARK = 'remove_watermark',
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
  type: 'text' | 'image' | 'erase' | 'shape-rect' | 'shape-circle' | 'shape-line' | 'stamp';
  page: number;
  x: number;
  y: number;
  w?: number;
  h?: number;
  // Text & Stamp
  content?: string;
  size?: number;
  color?: { r: number, g: number, b: number };
  // Visual properties
  rotation?: number; // degrees
  opacity?: number; // 0 to 1
  // Image
  src?: string;
  // Line
  endX?: number;
  endY?: number;
}

export interface FileWithPreview extends File {
  preview?: string;
}