import { RequestDoc, InvoiceFile } from '../types';

const KEYS = {
  REQUESTS: 'GT_REQUESTS',
  CATALOG: 'GT_CATALOG',
  INVOICES: 'GT_INVOICES',
  THEME: 'GT_THEME',
};

export const StorageService = {
  getRequests: (): RequestDoc[] => {
    try {
      const data = localStorage.getItem(KEYS.REQUESTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveRequests: (requests: RequestDoc[]) => {
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));
  },

  getCatalog: (): string[] => {
    try {
      const data = localStorage.getItem(KEYS.CATALOG);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addToCatalog: (newNames: string[]) => {
    const current = StorageService.getCatalog();
    const unique = new Set([...current, ...newNames.map(n => n.trim()).filter(Boolean)]);
    localStorage.setItem(KEYS.CATALOG, JSON.stringify(Array.from(unique).sort()));
  },

  getInvoices: (): InvoiceFile[] => {
    try {
      const data = localStorage.getItem(KEYS.INVOICES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addInvoice: (invoice: InvoiceFile) => {
    const current = StorageService.getInvoices();
    current.push(invoice);
    localStorage.setItem(KEYS.INVOICES, JSON.stringify(current));
  },
};