'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw,
  Globe,
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ObligationBalanceRow } from '@/utils/obligationsStore';
import RiceCategoryFinancialReport from './RiceCategoryFinancialReport';

interface Props {
  initialRows: ObligationBalanceRow[];
  initialReports?: any[];
  initialCategory?: string;
}

const DEFAULT_GSHEET_URL =
  'https://docs.google.com/spreadsheets/d/15yF4sDQKR-_MdMV4k64d9I4lIpdqXH3iA94GkO-G0yM/edit?gid=949598133#gid=949598133';

export default function RiceReportsClient({ initialRows, initialCategory }: Props) {
  const [rows, setRows] = useState<ObligationBalanceRow[]>(initialRows || []);

  // Live Google Sheets synchronization state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [gSheetUrl, setGSheetUrl] = useState(DEFAULT_GSHEET_URL);
  const [isGSheetModalOpen, setIsGSheetModalOpen] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(30);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load saved Google Sheet configuration from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('da_obligations_gsheet_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url) setGSheetUrl(parsed.url);
        if (typeof parsed.interval === 'number') setAutoSyncInterval(parsed.interval);
        if (parsed.lastSyncedAt) setLastSyncedAt(parsed.lastSyncedAt);
      }
    } catch {}
  }, []);

  // Sync handler to pull fresh records from Google Sheet API
  const performSync = useCallback(
    async (urlToSync?: string, isManual = false) => {
      const targetUrl = (urlToSync || gSheetUrl).trim();
      if (!targetUrl) return;

      setIsSyncing(true);
      setSyncError(null);

      try {
        const res = await fetch('/api/obligations/google-sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: targetUrl,
            sheetName: 'Main Registry',
            autoSave: true,
          }),
        });

        const data = await res.json();
        if (data.success && Array.isArray(data.rows)) {
          setRows(data.rows);
          const nowStr = new Date().toISOString();
          setLastSyncedAt(nowStr);

          try {
            localStorage.setItem(
              'da_obligations_gsheet_config',
              JSON.stringify({
                url: targetUrl,
                sheetName: 'Main Registry',
                interval: autoSyncInterval,
                connected: true,
                lastSyncedAt: nowStr,
              })
            );
          } catch {}

          if (isManual) {
            setSyncMessage(`Successfully synchronized ${data.count} records live from Google Sheets.`);
            setTimeout(() => setSyncMessage(null), 4000);
            setIsGSheetModalOpen(false);
          }
        } else {
          setSyncError(data.error || 'Failed to sync with Google Sheet.');
        }
      } catch (err: any) {
        setSyncError(err.message || 'Network error syncing with Google Sheet.');
      } finally {
        setIsSyncing(false);
      }
    },
    [gSheetUrl, autoSyncInterval]
  );

  // Auto-sync on initial mount
  const hasTriggeredMountSync = useRef(false);
  useEffect(() => {
    if (!hasTriggeredMountSync.current) {
      hasTriggeredMountSync.current = true;
      let target = DEFAULT_GSHEET_URL;
      try {
        const saved = localStorage.getItem('da_obligations_gsheet_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.url) target = parsed.url;
        }
      } catch {}
      performSync(target, false);
    }
  }, [performSync]);

  // Periodic polling auto-sync
  useEffect(() => {
    if (autoSyncInterval <= 0) return;
    const intervalMs = autoSyncInterval * 1000;
    const timer = setInterval(() => {
      performSync(gSheetUrl, false);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoSyncInterval, gSheetUrl, performSync]);



  return (
    <div className="rice-reports-client-container">
      {/* Toast Alert Notification */}
      {syncMessage && (
        <div className="spreadsheet-toast success" role="alert" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={16} />
          <span>{syncMessage}</span>
          <button onClick={() => setSyncMessage(null)} className="toast-close">
            <X size={14} />
          </button>
        </div>
      )}

      {syncError && (
        <div className="spreadsheet-toast error" role="alert" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} />
          <span>{syncError}</span>
          <button onClick={() => setSyncError(null)} className="toast-close">
            <X size={14} />
          </button>
        </div>
      )}

      {/* RICE FINANCIAL REPORT (2026) */}
      <RiceCategoryFinancialReport
        rows={rows}
        isLiveSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onSyncLiveSheet={() => performSync(gSheetUrl, true)}
        gSheetUrl={gSheetUrl}
        onOpenGSheetConfig={() => setIsGSheetModalOpen(true)}
        initialCategory={initialCategory}
      />

      {/* Google Sheets Live Configuration Modal */}
      {isGSheetModalOpen && (
        <div
          className="spreadsheet-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsGSheetModalOpen(false);
          }}
        >
          <div className="spreadsheet-modal-card">
            <div className="modal-header">
              <div className="modal-title-group">
                <Globe size={20} className="modal-icon" />
                <div>
                  <h3>Configure Live Google Sheet Source</h3>
                  <p>Real-time synchronization for DA-CAR Rice Financial Report 2026</p>
                </div>
              </div>
              <button
                onClick={() => setIsGSheetModalOpen(false)}
                className="modal-close-btn"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="gsheet-modal-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="gsheet-field-label" style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Google Spreadsheet Web Link
                </label>
                <input
                  type="url"
                  value={gSheetUrl}
                  onChange={(e) => setGSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="filter-input"
                  style={{ width: '100%', fontSize: 13, padding: '8px 12px' }}
                />
                <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 4 }}>
                  Ensure your Google Sheet is shared with <em>Anyone with the link can view</em>.
                </span>
              </div>

              <div>
                <label className="gsheet-field-label" style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Real-Time Background Auto-Sync Interval
                </label>
                <select
                  value={autoSyncInterval}
                  onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                  className="filter-select"
                  style={{ width: '100%', fontSize: 13, padding: '8px 12px' }}
                >
                  <option value={15}>Every 15 Seconds (Ultra Real-Time)</option>
                  <option value={30}>Every 30 Seconds (Recommended)</option>
                  <option value={60}>Every 1 Minute</option>
                  <option value={300}>Every 5 Minutes</option>
                  <option value={0}>Manual Sync Only</option>
                </select>
              </div>

              {lastSyncedAt && (
                <div style={{ fontSize: 12.5, color: '#166534', background: '#f0fdf4', padding: '10px 14px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                  ✓ Last synced: <strong>{new Date(lastSyncedAt).toLocaleString()}</strong>
                </div>
              )}
            </div>

            <div className="gsheet-modal-footer" style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setIsGSheetModalOpen(false)}
                className="button button-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => performSync(gSheetUrl, true)}
                disabled={isSyncing || !gSheetUrl.trim()}
                className="button button-primary action-btn gsheet-connect-btn"
              >
                <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
                {isSyncing ? 'Syncing...' : 'Save & Sync Live Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
