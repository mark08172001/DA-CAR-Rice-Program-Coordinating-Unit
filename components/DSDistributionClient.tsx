'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Chart from 'chart.js/auto';
import {
  Wheat,
  MapPin,
  Search,
  BarChart3,
  TrendingUp,
  Package,
  Droplets,
  Scale,
  RotateCcw,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import {
  DSDistributionData,
  DSDistributionRow,
  SeedVarietySummary,
  VarietyItem,
} from '@/utils/fetchDSDistributionSheet';

interface Props {
  initialData: DSDistributionData;
}

export default function DSDistributionClient({ initialData }: Props) {
  const [data] = useState<DSDistributionData>(initialData);
  const [scaleType, setScaleType] = useState<'logarithmic' | 'linear'>('linear');
  const [activeTab, setActiveTab] = useState<'visuals' | 'provinces' | 'varieties' | 'fertilizers'>('visuals');
  const [chartView, setChartView] = useState<'both' | 'provinces' | 'varieties'>('both');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Advanced' | 'In Progress' | 'Pending Delivery'>('all');
  const [expandedProvinces, setExpandedProvinces] = useState<Record<string, boolean>>({
    'Kalinga': true,
    'Apayao': true,
  });

  // Chart canvas refs & instances
  const provChartRef = useRef<HTMLCanvasElement | null>(null);
  const varietyChartRef = useRef<HTMLCanvasElement | null>(null);
  const provChartInstance = useRef<Chart | null>(null);
  const varietyChartInstance = useRef<Chart | null>(null);

  // Series visibility state for Provincial Chart
  const [hiddenProvincial, setHiddenProvincial] = useState<{
    target: boolean;
    delivered: boolean;
    rate: boolean;
  }>({
    target: false,
    delivered: false,
    rate: false,
  });
  const hiddenProvincialRef = useRef(hiddenProvincial);
  hiddenProvincialRef.current = hiddenProvincial;

  // Series visibility state for Variety Chart
  const [hiddenVariety, setHiddenVariety] = useState<{
    target: boolean;
    delivered: boolean;
    rate: boolean;
  }>({
    target: false,
    delivered: false,
    rate: false,
  });
  const hiddenVarietyRef = useRef(hiddenVariety);
  hiddenVarietyRef.current = hiddenVariety;

  const toggleProvincialDataset = (key: 'target' | 'delivered' | 'rate') => {
    setHiddenProvincial((prev) => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };
      hiddenProvincialRef.current = updated;

      if (provChartInstance.current) {
        const chart = provChartInstance.current;
        const datasetIndex = key === 'target' ? 0 : key === 'delivered' ? 1 : 2;
        chart.setDatasetVisibility(datasetIndex, !nextVal);
        if (key === 'rate' && chart.options.scales?.y1) {
          chart.options.scales.y1.display = !nextVal;
        }
        chart.update();
      }
      return updated;
    });
  };

  const resetProvincialDatasets = () => {
    setHiddenProvincial({ target: false, delivered: false, rate: false });
    hiddenProvincialRef.current = { target: false, delivered: false, rate: false };
    if (provChartInstance.current) {
      const chart = provChartInstance.current;
      chart.setDatasetVisibility(0, true);
      chart.setDatasetVisibility(1, true);
      chart.setDatasetVisibility(2, true);
      if (chart.options.scales?.y1) {
        chart.options.scales.y1.display = true;
      }
      chart.update();
    }
  };

  const toggleVarietyDataset = (key: 'target' | 'delivered' | 'rate') => {
    setHiddenVariety((prev) => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };
      hiddenVarietyRef.current = updated;

      if (varietyChartInstance.current) {
        const chart = varietyChartInstance.current;
        const datasetIndex = key === 'target' ? 0 : key === 'delivered' ? 1 : 2;
        chart.setDatasetVisibility(datasetIndex, !nextVal);
        if (key === 'rate' && chart.options.scales?.y1) {
          chart.options.scales.y1.display = !nextVal;
        }
        chart.update();
      }
      return updated;
    });
  };

  const resetVarietyDatasets = () => {
    setHiddenVariety({ target: false, delivered: false, rate: false });
    hiddenVarietyRef.current = { target: false, delivered: false, rate: false };
    if (varietyChartInstance.current) {
      const chart = varietyChartInstance.current;
      chart.setDatasetVisibility(0, true);
      chart.setDatasetVisibility(1, true);
      chart.setDatasetVisibility(2, true);
      if (chart.options.scales?.y1) {
        chart.options.scales.y1.display = true;
      }
      chart.update();
    }
  };

  // Helper formatting
  const formatShort = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(2).replace(/\.00$/, '') + 'K';
    }
    return num.toLocaleString('en-PH');
  };

  const formatNumber = (num: number): string => {
    return (num ?? 0).toLocaleString('en-PH');
  };

  const toggleProvinceExpand = (prov: string) => {
    setExpandedProvinces((prev) => ({
      ...prev,
      [prov]: !prev[prov],
    }));
  };

  // Filtered provincial rows
  const filteredProvinces = useMemo(() => {
    return (data.provinces || []).filter((p) => {
      const matchSearch =
        p.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.varieties.some((v) => v.variety.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [data.provinces, searchTerm, statusFilter]);

  // --------------------------------------------------------------------
  // CHART 1: PROVINCIAL SEED QUOTA VS ACTUAL DELIVERIES (DUAL BARS + TRENDLINE)
  // Matches the signature visual styling of /rice/physical
  // --------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'visuals') return;
    if (chartView === 'varieties') return;
    if (!provChartRef.current) return;

    if (provChartInstance.current) {
      provChartInstance.current.destroy();
      provChartInstance.current = null;
    }

    const ctx = provChartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = data.provinces.map((p) => p.province);
    const targetValues = data.provinces.map((p) => p.hybridSeedsTarget);
    const deliveredValues = data.provinces.map((p) => p.deliveredBags);
    const rates = data.provinces.map((p) => p.deliveryAccompRate);

    // Custom badge plugin matching /rice/physical
    const badgePlugin = {
      id: 'dsProvBadgePlugin',
      afterDatasetsDraw(chart: any) {
        const { ctx } = chart;

        // 1. Draw floating white pill badges above bars
        [0, 1].forEach((datasetIndex) => {
          if (!chart.isDatasetVisible(datasetIndex)) return;
          const meta = chart.getDatasetMeta(datasetIndex);
          if (meta.hidden) return;
          const dataset = chart.data.datasets[datasetIndex];
          if (!dataset) return;

          meta.data.forEach((bar: any, index: number) => {
            const rawVal = dataset.data[index];
            if (rawVal === 0) return;
            const text = formatShort(rawVal);

            const x = bar.x;
            const y = Math.min(bar.y, chart.chartArea.bottom - 16);

            ctx.save();
            ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const textWidth = ctx.measureText(text).width;
            const padX = 5;
            const boxW = textWidth + padX * 2;
            const boxH = 14;
            const boxX = x - boxW / 2;
            const boxY = y - boxH - 3;

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetY = 1;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 3);
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, boxY + boxH / 2 + 0.5);
            ctx.restore();
          });
        });

        // 2. Draw Accomplishment Rate % Pink Badge on the trendline points
        if (chart.isDatasetVisible(2)) {
          const lineMeta = chart.getDatasetMeta(2);
          if (lineMeta && !lineMeta.hidden && lineMeta.data) {
            lineMeta.data.forEach((point: any, index: number) => {
              const pct = rates[index];
              const text = `${pct.toFixed(1)}%`;

              const x = point.x;
              const y = point.y;

              ctx.save();
              ctx.font = '700 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              const textWidth = ctx.measureText(text).width;
              const padX = 6;
              const boxW = textWidth + padX * 2;
              const boxH = 17;
              const boxX = x - boxW / 2;
              const boxY = y - boxH - 8;

              // Pink badge pill
              ctx.fillStyle = '#f43f5e';
              ctx.shadowColor = 'rgba(244, 63, 94, 0.35)';
              ctx.shadowBlur = 4;
              ctx.shadowOffsetY = 2;
              ctx.beginPath();
              ctx.roundRect(boxX, boxY, boxW, boxH, 4);
              ctx.fill();

              // Down pointer triangle
              ctx.beginPath();
              ctx.moveTo(x - 3.5, boxY + boxH);
              ctx.lineTo(x + 3.5, boxY + boxH);
              ctx.lineTo(x, boxY + boxH + 3.5);
              ctx.closePath();
              ctx.fill();

              ctx.shadowColor = 'transparent';
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, x, boxY + boxH / 2);
              ctx.restore();
            });
          }
        }
      },
    };

    const isLog = scaleType === 'logarithmic';

    provChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Allocated Target Quota (bags/packs)',
            data: targetValues,
            hidden: hiddenProvincialRef.current.target,
            backgroundColor: '#f59e0b',
            hoverBackgroundColor: '#d97706',
            borderRadius: 3,
            borderSkipped: false,
            barPercentage: 0.82,
            categoryPercentage: 0.72,
            yAxisID: 'y',
            order: 2,
          },
          {
            label: 'Delivered to Drop-Off Points (bags/packs)',
            data: deliveredValues,
            hidden: hiddenProvincialRef.current.delivered,
            backgroundColor: '#16a34a',
            hoverBackgroundColor: '#15803d',
            borderRadius: 3,
            borderSkipped: false,
            barPercentage: 0.82,
            categoryPercentage: 0.72,
            yAxisID: 'y',
            order: 3,
          },
          {
            label: 'Delivery Accomplishment Rate (%)',
            type: 'line',
            data: rates,
            hidden: hiddenProvincialRef.current.rate,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.14)',
            fill: true,
            tension: 0.2,
            borderWidth: 2.8,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#2563eb',
            pointBorderWidth: 2.5,
            pointRadius: 4.5,
            pointHoverRadius: 6.5,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 32, right: 18, left: 8, bottom: 4 },
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            padding: 10,
            cornerRadius: 6,
            callbacks: {
              label: (ctx) => {
                if (ctx.datasetIndex === 2) {
                  return ` Accomplishment: ${rates[ctx.dataIndex].toFixed(2)}%`;
                }
                return ` ${ctx.dataset.label}: ${formatNumber(Number(ctx.raw))} bags/packs`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#475569',
              font: { size: 12, weight: 600 },
            },
          },
          y: {
            type: isLog ? 'logarithmic' : 'linear',
            position: 'left',
            min: isLog ? 10 : 0,
            grid: { color: '#e2e8f0' },
            ticks: {
              color: '#64748b',
              font: { size: 11 },
              callback: (value) => `${formatShort(Number(value))} bags`,
            },
          },
          y1: {
            type: 'linear',
            position: 'right',
            display: !hiddenProvincialRef.current.rate,
            min: 0,
            max: 100,
            grid: { display: false },
            ticks: {
              color: '#2563eb',
              font: { size: 11, weight: 600 },
              callback: (value) => `${value}%`,
            },
          },
        },
      },
      plugins: [badgePlugin],
    });

    return () => {
      if (provChartInstance.current) {
        provChartInstance.current.destroy();
        provChartInstance.current = null;
      }
    };
  }, [data, scaleType, activeTab, chartView]);

  // --------------------------------------------------------------------
  // CHART 2: SEED VARIETY CONSIGNMENT ROLLOUT (DUAL BARS + FULFILLMENT RATE)
  // --------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'visuals') return;
    if (chartView === 'provinces') return;
    if (!varietyChartRef.current) return;

    if (varietyChartInstance.current) {
      varietyChartInstance.current.destroy();
      varietyChartInstance.current = null;
    }

    const ctx = varietyChartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = data.varieties.map((v) => v.variety);
    const targetValues = data.varieties.map((v) => v.target);
    const deliveredValues = data.varieties.map((v) => v.delivered);
    const rates = data.varieties.map((v) => v.deliveryRate);

    const badgePlugin = {
      id: 'dsVarietyBadgePlugin',
      afterDatasetsDraw(chart: any) {
        const { ctx } = chart;

        [0, 1].forEach((datasetIndex) => {
          if (!chart.isDatasetVisible(datasetIndex)) return;
          const meta = chart.getDatasetMeta(datasetIndex);
          if (meta.hidden) return;
          const dataset = chart.data.datasets[datasetIndex];
          if (!dataset) return;

          meta.data.forEach((bar: any, index: number) => {
            const rawVal = dataset.data[index];
            if (rawVal === 0) return;
            const text = formatShort(rawVal);

            const x = bar.x;
            const y = Math.min(bar.y, chart.chartArea.bottom - 16);

            ctx.save();
            ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const textWidth = ctx.measureText(text).width;
            const padX = 5;
            const boxW = textWidth + padX * 2;
            const boxH = 14;
            const boxX = x - boxW / 2;
            const boxY = y - boxH - 3;

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetY = 1;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 3);
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, boxY + boxH / 2 + 0.5);
            ctx.restore();
          });
        });

        if (chart.isDatasetVisible(2)) {
          const lineMeta = chart.getDatasetMeta(2);
          if (lineMeta && !lineMeta.hidden && lineMeta.data) {
            lineMeta.data.forEach((point: any, index: number) => {
              const pct = rates[index];
              const text = `${pct.toFixed(1)}%`;

              const x = point.x;
              const y = point.y;

              ctx.save();
              ctx.font = '700 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              const textWidth = ctx.measureText(text).width;
              const padX = 6;
              const boxW = textWidth + padX * 2;
              const boxH = 17;
              const boxX = x - boxW / 2;
              const boxY = y - boxH - 8;

              // Purple badge pill
              ctx.fillStyle = '#9333ea';
              ctx.shadowColor = 'rgba(147, 51, 234, 0.35)';
              ctx.shadowBlur = 4;
              ctx.shadowOffsetY = 2;
              ctx.beginPath();
              ctx.roundRect(boxX, boxY, boxW, boxH, 4);
              ctx.fill();

              // Down pointer
              ctx.beginPath();
              ctx.moveTo(x - 3.5, boxY + boxH);
              ctx.lineTo(x + 3.5, boxY + boxH);
              ctx.lineTo(x, boxY + boxH + 3.5);
              ctx.closePath();
              ctx.fill();

              ctx.shadowColor = 'transparent';
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, x, boxY + boxH / 2);
              ctx.restore();
            });
          }
        }
      },
    };

    const isLog = scaleType === 'logarithmic';

    varietyChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Variety Target Quota (packs/bags)',
            data: targetValues,
            hidden: hiddenVarietyRef.current.target,
            backgroundColor: '#6366f1',
            hoverBackgroundColor: '#4f46e5',
            borderRadius: 3,
            borderSkipped: false,
            barPercentage: 0.82,
            categoryPercentage: 0.72,
            yAxisID: 'y',
            order: 2,
          },
          {
            label: 'Delivered to Drop-Offs (packs/bags)',
            data: deliveredValues,
            hidden: hiddenVarietyRef.current.delivered,
            backgroundColor: '#0d9488',
            hoverBackgroundColor: '#0f766e',
            borderRadius: 3,
            borderSkipped: false,
            barPercentage: 0.82,
            categoryPercentage: 0.72,
            yAxisID: 'y',
            order: 3,
          },
          {
            label: 'Variety Fulfillment Rate (%)',
            type: 'line',
            data: rates,
            hidden: hiddenVarietyRef.current.rate,
            borderColor: '#9333ea',
            backgroundColor: 'rgba(147, 51, 234, 0.12)',
            fill: true,
            tension: 0.2,
            borderWidth: 2.8,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#9333ea',
            pointBorderWidth: 2.5,
            pointRadius: 4.5,
            pointHoverRadius: 6.5,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 32, right: 18, left: 8, bottom: 4 },
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            padding: 10,
            cornerRadius: 6,
            callbacks: {
              label: (ctx) => {
                if (ctx.datasetIndex === 2) {
                  return ` Fulfillment Rate: ${rates[ctx.dataIndex].toFixed(2)}%`;
                }
                return ` ${ctx.dataset.label}: ${formatNumber(Number(ctx.raw))} units`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#475569',
              font: { size: 12, weight: 600 },
            },
          },
          y: {
            type: isLog ? 'logarithmic' : 'linear',
            position: 'left',
            min: isLog ? 10 : 0,
            grid: { color: '#e2e8f0' },
            ticks: {
              color: '#64748b',
              font: { size: 11 },
              callback: (value) => `${formatShort(Number(value))} units`,
            },
          },
          y1: {
            type: 'linear',
            position: 'right',
            display: !hiddenVarietyRef.current.rate,
            min: 0,
            max: 100,
            grid: { display: false },
            ticks: {
              color: '#9333ea',
              font: { size: 11, weight: 600 },
              callback: (value) => `${value}%`,
            },
          },
        },
      },
      plugins: [badgePlugin],
    });

    return () => {
      if (varietyChartInstance.current) {
        varietyChartInstance.current.destroy();
        varietyChartInstance.current = null;
      }
    };
  }, [data, scaleType, activeTab, chartView]);

  return (
    <div className="ds-distribution-container" style={{ paddingBottom: 60 }}>
      {/* 1. INSTITUTIONAL HERO HEADER */}
      <section className="page-hero" style={{ padding: '36px 0 30px' }}>
        <div className="page-container">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div className="eyebrow" style={{ color: '#e5c45c', marginBottom: 8 }}>
                Republic of the Philippines · Department of Agriculture · CAR
              </div>
              <h1 style={{ margin: '0 0 8px', fontSize: '32px', fontFamily: 'Georgia, serif', fontWeight: 400, color: '#ffffff' }}>
                DS 2026-2027 Distribution Status
              </h1>
              <p style={{ margin: 0, color: '#d2dfd6', fontSize: '13.5px', maxWidth: 740, lineHeight: 1.6 }}>
                Official Dry Season (DS) 2026-2027 live monitoring of regional seed consignments, provincial allocations, drop-off deliveries, and farmer drop-offs across the Cordillera Administrative Region.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/rice/physical"
                className="button"
                style={{
                  background: 'rgba(255, 255, 255, 0.16)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  fontSize: 12,
                  padding: '7px 14px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <BarChart3 size={15} />
                <span>Physical (WS Accomplishment)</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="page-container" style={{ marginTop: 28 }}>
        {/* 2. EXECUTIVE METRIC KPI CARDS (FROM GOOGLE SHEET) */}
        <div className="summary-grid" style={{ marginBottom: 26 }}>
          <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px' }}>
            <div className="summary-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total DS Target Area
              </span>
              <MapPin size={17} style={{ color: '#166534' }} />
            </div>
            <div className="summary-value" style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>
              {data.totals.totalTargetArea.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>ha</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
              {data.totals.gaaAreaHa.toLocaleString()} ha GAA · {data.totals.spilloverAreaHa.toLocaleString()} ha WS Spillover
            </span>
          </article>

          <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px' }}>
            <div className="summary-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Hybrid Seed Allocation
              </span>
              <Wheat size={17} style={{ color: '#d97706' }} />
            </div>
            <div className="summary-value" style={{ fontSize: 26, fontWeight: 700, color: '#b45309' }}>
              {data.totals.totalHybridSeeds.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>bags/packs</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
              Regional Hybrid Seed Program Target
            </span>
          </article>

          <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px' }}>
            <div className="summary-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Delivered to Drop-Offs
              </span>
              <CheckCircle2 size={17} style={{ color: '#16a34a' }} />
            </div>
            <div className="summary-value" style={{ fontSize: 26, fontWeight: 700, color: '#15803d' }}>
              {data.totals.totalDeliveredBags.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>bags</span>
            </div>
            <span style={{ fontSize: 11, color: '#166534', fontWeight: 600, marginTop: 4, display: 'block' }}>
              {data.totals.overallDeliveryRate.toFixed(1)}% Delivery Accomplished · {data.totals.totalBalanceBags.toLocaleString()} balance
            </span>
          </article>

          <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px' }}>
            <div className="summary-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Distributed to Farmers
              </span>
              <TrendingUp size={17} style={{ color: '#2563eb' }} />
            </div>
            <div className="summary-value" style={{ fontSize: 26, fontWeight: 700, color: '#1d4ed8' }}>
              {data.totals.totalDistributedQty.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>bags</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
              {data.totals.totalDistributedAreaHa.toLocaleString()} ha equivalent coverage (Kalinga QTA Rizal)
            </span>
          </article>
        </div>

        {/* 3. NAVIGATION CONTROLS & COMPARATIVE VISUAL TOOLBAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            padding: '12px 18px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {/* Main Module Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('visuals')}
              style={{
                border: 'none',
                background: activeTab === 'visuals' ? '#166534' : 'transparent',
                color: activeTab === 'visuals' ? '#ffffff' : '#475569',
                fontWeight: activeTab === 'visuals' ? 700 : 500,
                fontSize: 12.5,
                padding: '7px 14px',
                borderRadius: 5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <BarChart3 size={15} />
              <span>Comparative Visuals</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('provinces')}
              style={{
                border: 'none',
                background: activeTab === 'provinces' ? '#166534' : 'transparent',
                color: activeTab === 'provinces' ? '#ffffff' : '#475569',
                fontWeight: activeTab === 'provinces' ? 700 : 500,
                fontSize: 12.5,
                padding: '7px 14px',
                borderRadius: 5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <MapPin size={15} />
              <span>Provincial Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('varieties')}
              style={{
                border: 'none',
                background: activeTab === 'varieties' ? '#166534' : 'transparent',
                color: activeTab === 'varieties' ? '#ffffff' : '#475569',
                fontWeight: activeTab === 'varieties' ? 700 : 500,
                fontSize: 12.5,
                padding: '7px 14px',
                borderRadius: 5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <Wheat size={15} />
              <span>Seed Variety Consignments</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fertilizers')}
              style={{
                border: 'none',
                background: activeTab === 'fertilizers' ? '#166534' : 'transparent',
                color: activeTab === 'fertilizers' ? '#ffffff' : '#475569',
                fontWeight: activeTab === 'fertilizers' ? 700 : 500,
                fontSize: 12.5,
                padding: '7px 14px',
                borderRadius: 5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <Package size={15} />
              <span>Fertilizers & Inputs</span>
            </button>
          </div>

          {/* Right Toolbar for Visuals Tab */}
          {activeTab === 'visuals' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 3, gap: 2 }}>
                <button
                  type="button"
                  onClick={() => setChartView('both')}
                  className={`view-toggle-pill ${chartView === 'both' ? 'active' : ''}`}
                >
                  Both Views
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('provinces')}
                  className={`view-toggle-pill ${chartView === 'provinces' ? 'active' : ''}`}
                >
                  Provincial Deliveries
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('varieties')}
                  className={`view-toggle-pill ${chartView === 'varieties' ? 'active' : ''}`}
                >
                  Variety Breakdown
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 3, gap: 2 }}>
                <button
                  type="button"
                  onClick={() => setScaleType('linear')}
                  className={`view-toggle-pill ${scaleType === 'linear' ? 'active' : ''}`}
                >
                  Linear Scale
                </button>
                <button
                  type="button"
                  onClick={() => setScaleType('logarithmic')}
                  className={`view-toggle-pill ${scaleType === 'logarithmic' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Scale size={12} />
                  <span>Logarithmic</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: COMPARATIVE VISUALS (JUST LIKE /rice/physical)          */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'visuals' && (
          <div className="visual-cards-container">
            {/* GRAPH 1: PROVINCIAL SEED QUOTA VS ACTUAL DELIVERIES (DUAL BARS + TRENDLINE) */}
            {(chartView === 'both' || chartView === 'provinces') && (
              <div className="visual-card">
                <div className="visual-header">
                  <div className="visual-title-block">
                    <h3>
                      <span>Provincial Seed Quota vs Deliveries to Drop-Off Points - CAR</span>
                      <span className="visual-title-badge">Provincial Benchmark</span>
                    </h3>
                    <span className="visual-subtitle">
                      Cordillera DS 2026-2027 Hybrid Seed Allocation Comparison (Target Quota vs Delivered to Drop-off Points with Accomplishment Rate % Line)
                    </span>
                  </div>

                  <div className="visual-stats-row">
                    <span className="visual-stat-chip">
                      <span>Provinces:</span>
                      <strong>{data.provinces.length} Active</strong>
                    </span>
                    <span className="visual-stat-chip">
                      <span>Total Target Quota:</span>
                      <strong>{data.totals.totalHybridSeeds.toLocaleString()} bags</strong>
                    </span>
                    <span className="visual-stat-chip">
                      <span>Delivered:</span>
                      <strong>{data.totals.totalDeliveredBags.toLocaleString()} bags ({data.totals.overallDeliveryRate.toFixed(1)}%)</strong>
                    </span>
                    <span className="visual-stat-chip">
                      <span>Distributed:</span>
                      <strong>{data.totals.totalDistributedQty.toLocaleString()} bags</strong>
                    </span>
                  </div>
                </div>

                <div className="visual-canvas-container">
                  <canvas ref={provChartRef} />
                </div>

                {/* Legend with Click-to-Hide Feature */}
                <div className="visual-legend-bar">
                  <button
                    type="button"
                    onClick={() => toggleProvincialDataset('rate')}
                    className={`legend-toggle-btn ${hiddenProvincial.rate ? 'is-hidden' : ''}`}
                    title={
                      hiddenProvincial.rate
                        ? 'Click to show Delivery Accomplishment Rate (%)'
                        : 'Click to hide Delivery Accomplishment Rate (%)'
                    }
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        width: 34,
                        height: 12,
                        background: hiddenProvincial.rate ? '#f1f5f9' : 'rgba(37, 99, 235, 0.22)',
                        border: hiddenProvincial.rate ? '2px dashed #cbd5e1' : '2px solid #2563eb',
                      }}
                    />
                    <span>Delivery Accomplishment Rate (%)</span>
                    {hiddenProvincial.rate && (
                      <EyeOff size={13} style={{ color: '#94a3b8', marginLeft: 2 }} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleProvincialDataset('target')}
                    className={`legend-toggle-btn ${hiddenProvincial.target ? 'is-hidden' : ''}`}
                    title={
                      hiddenProvincial.target
                        ? 'Click to show Allocated Target Quota (bags/packs)'
                        : 'Click to hide Allocated Target Quota (bags/packs)'
                    }
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        width: 32,
                        height: 12,
                        background: hiddenProvincial.target ? '#cbd5e1' : '#f59e0b',
                      }}
                    />
                    <span>Allocated Target Quota (bags/packs)</span>
                    {hiddenProvincial.target && (
                      <EyeOff size={13} style={{ color: '#94a3b8', marginLeft: 2 }} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleProvincialDataset('delivered')}
                    className={`legend-toggle-btn ${hiddenProvincial.delivered ? 'is-hidden' : ''}`}
                    title={
                      hiddenProvincial.delivered
                        ? 'Click to show Delivered to Drop-Off Points (bags/packs)'
                        : 'Click to hide Delivered to Drop-Off Points (bags/packs)'
                    }
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        width: 32,
                        height: 12,
                        background: hiddenProvincial.delivered ? '#cbd5e1' : '#16a34a',
                      }}
                    />
                    <span>Delivered to Drop-Off Points (bags/packs)</span>
                    {hiddenProvincial.delivered && (
                      <EyeOff size={13} style={{ color: '#94a3b8', marginLeft: 2 }} />
                    )}
                  </button>

                  {(hiddenProvincial.target || hiddenProvincial.delivered || hiddenProvincial.rate) && (
                    <button
                      type="button"
                      onClick={resetProvincialDatasets}
                      className="legend-reset-chip"
                      title="Reset all series to visible"
                    >
                      <RotateCcw size={12} />
                      <span>Reset View</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* GRAPH 2: SEED VARIETY CONSIGNMENT FULFILLMENT (DUAL BARS + FULFILLMENT RATE TRENDLINE) */}
            {(chartView === 'both' || chartView === 'varieties') && (
              <div className="visual-card">
                <div className="visual-header">
                  <div className="visual-title-block">
                    <h3>
                      <span>Seed Variety Consignments & Regional Fulfillment - CAR</span>
                      <span className="visual-title-badge">Variety Consignment</span>
                    </h3>
                    <span className="visual-subtitle">
                      Comparative breakdown of hybrid seed varieties (Bigante Plus, HYVAR, SL-19 / SL19H, PHB 85, M20) across all consignments
                    </span>
                  </div>

                  <div className="visual-stats-row">
                    <span className="visual-stat-chip">
                      <span>Varieties:</span>
                      <strong>{data.varieties.length} Sourced</strong>
                    </span>
                    <span className="visual-stat-chip">
                      <span>Highest Volume:</span>
                      <strong>PHB 85 (47,335 packs)</strong>
                    </span>
                    <span className="visual-stat-chip">
                      <span>100% Complete:</span>
                      <strong>HYVAR & SL-19 / SL19H</strong>
                    </span>
                  </div>
                </div>

                <div className="visual-canvas-container">
                  <canvas ref={varietyChartRef} />
                </div>

                {/* Legend with Click-to-Hide Feature */}
                <div className="visual-legend-bar">
                  <button
                    type="button"
                    onClick={() => toggleVarietyDataset('rate')}
                    className={`legend-toggle-btn ${hiddenVariety.rate ? 'is-hidden' : ''}`}
                    title={
                      hiddenVariety.rate
                        ? 'Click to show Variety Fulfillment Rate (%)'
                        : 'Click to hide Variety Fulfillment Rate (%)'
                    }
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        width: 34,
                        height: 12,
                        background: hiddenVariety.rate ? '#f1f5f9' : 'rgba(147, 51, 234, 0.22)',
                        border: hiddenVariety.rate ? '2px dashed #cbd5e1' : '2px solid #9333ea',
                      }}
                    />
                    <span>Variety Fulfillment Rate (%)</span>
                    {hiddenVariety.rate && (
                      <EyeOff size={13} style={{ color: '#94a3b8', marginLeft: 2 }} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleVarietyDataset('target')}
                    className={`legend-toggle-btn ${hiddenVariety.target ? 'is-hidden' : ''}`}
                    title={
                      hiddenVariety.target
                        ? 'Click to show Variety Target Quota (packs/bags)'
                        : 'Click to hide Variety Target Quota (packs/bags)'
                    }
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        width: 32,
                        height: 12,
                        background: hiddenVariety.target ? '#cbd5e1' : '#6366f1',
                      }}
                    />
                    <span>Variety Target Quota (packs/bags)</span>
                    {hiddenVariety.target && (
                      <EyeOff size={13} style={{ color: '#94a3b8', marginLeft: 2 }} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleVarietyDataset('delivered')}
                    className={`legend-toggle-btn ${hiddenVariety.delivered ? 'is-hidden' : ''}`}
                    title={
                      hiddenVariety.delivered
                        ? 'Click to show Delivered to Drop-Offs (packs/bags)'
                        : 'Click to hide Delivered to Drop-Offs (packs/bags)'
                    }
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        width: 32,
                        height: 12,
                        background: hiddenVariety.delivered ? '#cbd5e1' : '#0d9488',
                      }}
                    />
                    <span>Delivered to Drop-Offs (packs/bags)</span>
                    {hiddenVariety.delivered && (
                      <EyeOff size={13} style={{ color: '#94a3b8', marginLeft: 2 }} />
                    )}
                  </button>

                  {(hiddenVariety.target || hiddenVariety.delivered || hiddenVariety.rate) && (
                    <button
                      type="button"
                      onClick={resetVarietyDatasets}
                      className="legend-reset-chip"
                      title="Reset all series to visible"
                    >
                      <RotateCcw size={12} />
                      <span>Reset View</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: PROVINCIAL MATRIX TABLE (WITH EXPANDABLE VARIETY DROPS) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'provinces' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Cordillera Dry Season 2026-2027 Provincial Targets vs Deliveries
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Live provincial target quotas, drop-off deliveries, distributed quantities, and variety consignment drilldowns.
                </span>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search province or variety..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: '6px 12px 6px 30px',
                      fontSize: 12.5,
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      outline: 'none',
                      width: 220,
                      color: '#1e293b',
                    }}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{
                    padding: '6px 10px',
                    fontSize: 12.5,
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    background: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="Completed">Completed (100%)</option>
                  <option value="Advanced">Advanced (75%+)</option>
                  <option value="In Progress">In Progress (&lt;75%)</option>
                  <option value="Pending Delivery">Pending Delivery</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 16px' }}>Province</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Target Area (ha)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hybrid Quota (bags)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Delivered</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Balance</th>
                    <th style={{ padding: '12px 16px', minWidth: 160 }}>Delivery Accomplishment</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Distributed to Farmers</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Consignment Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProvinces.map((prov) => {
                    const isExpanded = !!expandedProvinces[prov.province];
                    return (
                      <React.Fragment key={prov.province}>
                        <tr
                          onClick={() => toggleProvinceExpand(prov.province)}
                          style={{
                            borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                            background: isExpanded ? '#fafcfb' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 650, color: '#1e293b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isExpanded ? (
                                <ChevronDown size={15} style={{ color: '#166534' }} />
                              ) : (
                                <ChevronRight size={15} style={{ color: '#94a3b8' }} />
                              )}
                              <MapPin size={14} style={{ color: '#166534' }} />
                              <span>{prov.province}</span>
                              <span style={{ fontSize: 10, background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: 4 }}>
                                {prov.varieties.length} varieties
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: '#334155' }}>
                            <strong>{prov.targetAreaHa.toLocaleString()}</strong> ha
                            {prov.spilloverHa > 0 && (
                              <span style={{ display: 'block', fontSize: 10.5, color: '#64748b' }}>
                                (incl. {prov.spilloverHa} spillover)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#b45309' }}>
                            {prov.hybridSeedsTarget.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 650, color: '#15803d' }}>
                            {prov.deliveredBags.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: prov.balanceBags > 0 ? '#b91c1c' : '#64748b' }}>
                            {prov.balanceBags.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${Math.min(prov.progressPercent, 100)}%`,
                                    height: '100%',
                                    background: prov.progressPercent >= 100 ? '#166534' : prov.progressPercent >= 75 ? '#2563eb' : '#d97706',
                                    borderRadius: 99,
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', minWidth: 44, textAlign: 'right' }}>
                                {prov.progressPercent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: '#1e293b' }}>
                            {prov.distributedBags > 0 ? (
                              <div>
                                <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{prov.distributedBags.toLocaleString()} bags</span>
                                <span style={{ display: 'block', fontSize: 10.5, color: '#64748b' }}>({prov.distributedAreaHa} ha eq.)</span>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>0 bags</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                background:
                                  prov.status === 'Completed'
                                    ? '#dcfce7'
                                    : prov.status === 'Advanced'
                                      ? '#dbeafe'
                                      : prov.status === 'In Progress'
                                        ? '#fef3c7'
                                        : '#f1f5f9',
                                color:
                                  prov.status === 'Completed'
                                    ? '#15803d'
                                    : prov.status === 'Advanced'
                                      ? '#1d4ed8'
                                      : prov.status === 'In Progress'
                                        ? '#b45309'
                                        : '#64748b',
                              }}
                            >
                              {prov.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569' }}>
                            {prov.remarks || '—'}
                          </td>
                        </tr>

                        {/* Expandable Variety Dropoffs Sub-table */}
                        {isExpanded && (
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <td colSpan={9} style={{ padding: '10px 18px 14px 44px' }}>
                              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                  <thead>
                                    <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>
                                      <th style={{ padding: '7px 12px' }}>Seed Variety</th>
                                      <th style={{ padding: '7px 12px' }}>Unit</th>
                                      <th style={{ padding: '7px 12px', textAlign: 'right' }}>Target</th>
                                      <th style={{ padding: '7px 12px', textAlign: 'right' }}>Delivered</th>
                                      <th style={{ padding: '7px 12px', textAlign: 'right' }}>Balance</th>
                                      <th style={{ padding: '7px 12px', textAlign: 'right' }}>Fulfillment</th>
                                      <th style={{ padding: '7px 12px' }}>Notes / Allocation Remarks</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {prov.varieties.map((v, vIdx) => (
                                      <tr key={vIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '7px 12px', fontWeight: 600, color: '#1e293b' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Wheat size={13} style={{ color: '#d97706' }} />
                                            <span>{v.variety}</span>
                                          </div>
                                        </td>
                                        <td style={{ padding: '7px 12px', color: '#64748b' }}>{v.unit}</td>
                                        <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                                          {v.target.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: v.delivered > 0 ? '#15803d' : '#94a3b8' }}>
                                          {v.delivered.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '7px 12px', textAlign: 'right', color: v.balance > 0 ? '#b91c1c' : '#64748b' }}>
                                          {v.balance.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '7px 12px', textAlign: 'right' }}>
                                          <span
                                            style={{
                                              fontWeight: 700,
                                              color: v.accompRate >= 100 ? '#15803d' : v.accompRate > 0 ? '#b45309' : '#94a3b8',
                                            }}
                                          >
                                            {v.accompRate.toFixed(1)}%
                                          </span>
                                        </td>
                                        <td style={{ padding: '7px 12px', color: '#64748b', fontSize: 11.5 }}>
                                          {v.remarks || (v.delivered >= v.target ? '100% consignment received at provincial hub' : 'Pending batch dispatch')}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: SEED VARIETY CONSIGNMENT SUMMARY                        */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'varieties' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Dry Season 2026-2027 Seed Variety Consignment Summary
              </h3>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Aggregate regional quota allotments, actual delivery dispatch to drop-off points, and remaining consignment balances.
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Seed Variety</th>
                    <th style={{ padding: '12px 14px' }}>Unit</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Target Quota</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Delivered</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Balance</th>
                    <th style={{ padding: '12px 16px', minWidth: 160 }}>Regional Fulfillment Rate</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Provinces Assigned</th>
                    <th style={{ padding: '12px 16px' }}>Deployment Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.varieties.map((item) => (
                    <tr key={item.variety} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 650, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Wheat size={15} style={{ color: '#d97706' }} />
                          <span>{item.variety}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{item.unit}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                        {item.target.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                        {item.delivered.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: item.balance > 0 ? '#b91c1c' : '#64748b' }}>
                        {item.balance.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(item.deliveryRate, 100)}%`,
                                height: '100%',
                                background: item.deliveryRate >= 100 ? '#166534' : item.deliveryRate >= 75 ? '#2563eb' : '#d97706',
                                borderRadius: 99,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', minWidth: 42, textAlign: 'right' }}>
                            {item.deliveryRate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                        {item.provincesCount} CAR Provinces
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569' }}>
                        {item.remarks || 'Standard hybrid seed allocation'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: FERTILIZERS & INORGANIC INPUTS                          */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'fertilizers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Fertilizer Allocations (Hybrid Rice) — 17,604 ha Target Area
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Granular Urea, Complete, Liquid Urea, and T14 Wettable Powder allocations across the 6 CAR Provinces.
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 16px' }}>Province</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Urea Granular (bag)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Complete (bag)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Liquid Urea (bottle)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>T14 WP (pack)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Units</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fertilizers.hybrid.provinces.map((p) => (
                      <tr key={p.province} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0f172a' }}>{p.province}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155' }}>{p.ureaGranular.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155' }}>{p.complete.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155' }}>{p.liquidUrea.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155' }}>{p.t14WettablePowder.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{p.totalTarget.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                            Procurement / Transit
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Fertilizer Allocations (Inbred Rice) — 50,790 ha Target Area
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Spillover WS 2026 (21,081 ha) + GAA (29,709 ha) total allocation: 99,469 units.
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 16px' }}>Province</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Urea Granular (bag)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Complete (bag)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Liquid Urea (bottle)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>T14 WP (pack)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Units</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fertilizers.inbred.provinces.map((p) => (
                      <tr key={p.province} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0f172a' }}>{p.province}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155' }}>{p.ureaGranular.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155' }}>{p.complete.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155' }}>{p.liquidUrea.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155' }}>{p.t14WettablePowder.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{p.totalTarget.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                            Procurement / Transit
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
