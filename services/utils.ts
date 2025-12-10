import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const getTodayStr = () => {
  const d = new Date();
  return d.toLocaleDateString('ru-RU');
};

export const normalizeString = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// Soft match logic similar to Python version
export const softMatch = (a: string, b: string): boolean => {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  
  if (!normA || !normB) return false;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  
  const wordsA = new Set(normA.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(normB.split(' ').filter(w => w.length > 2));
  
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const minLen = Math.min(wordsA.size, wordsB.size);
  
  return intersection.size >= Math.max(1, Math.floor(0.5 * minLen));
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};