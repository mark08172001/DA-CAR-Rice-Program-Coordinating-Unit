export interface ObligationBalanceRow {
  id: string;
  fund: string;                   // FUND
  pap: string;                    // PAP
  source: string;                 // SOURCE
  class: string;                  // CLASS (MOOE, CO, PS, FE)
  rc: string;                     // RC (Responsibility Center)
  obj_code: string;               // OBJ CODE
  description: string;            // DESCRIPTION
  appropriations: number;         // APPROPRIATIONS (₱)
  adjusted_allotment: number;     // ADJUSTED ALLOTMENT (₱)
  total_obligation: number;       // TOTAL OBLIGATION (₱)
  unobligated_allotment: number;  // UNOBLIGATED ALLOTMENT (₱) = Adjusted Allotment - Total Obligation
  earmark: number;                // EARMARK (₱)
  unallocated_allotment: number;  // UNALLOCATED ALLOTMENT (₱) = Unobligated Allotment - Earmark
  disbursement: number;           // DISBURSEMENT (₱)
  unpaid: number;                 // UNPAID (₱) = Total Obligation - Disbursement
  row_order?: number;             // Original sequence in imported file / spreadsheet
  sheet_name?: string;            // Name of the Sheet Tab / Table (e.g. 'Main Registry', '2026 SAAODB Q1')
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_OBLIGATIONS: ObligationBalanceRow[] = [];
