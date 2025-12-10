export type Organization = 'FERGANA' | 'UCHKUPRIK';

export interface RequestItem {
  id: string;
  name: string;
  unit: string;
  qty: string;
  issueDate: string;
  details: string;
  invoiceNumbers: string[];
}

export interface RequestDoc {
  id: string;
  number: string;
  date: string;
  department: string;
  applicant: string;
  objectName: string;
  org: Organization;
  items: RequestItem[];
  approved: boolean | null; // null = pending
  approvedBy: string;
  checkedBy: string;
  createdAt: number;
}

export interface InvoiceFile {
  id: string;
  name: string;
  number: string;
  uploadDate: string;
  size: number;
  type: string;
  path?: string; // Simulated path
}

export interface CatalogItem {
  name: string;
}

// Stats for charts
export interface StatsData {
  name: string;
  value: number;
}