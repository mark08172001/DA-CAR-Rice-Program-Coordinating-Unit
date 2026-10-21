'use client';

import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import {
  BarChart3,
  TrendingUp,
  Target,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  Package,
  Table as TableIcon,
  Scale,
  Sparkles,
  Wheat,
  Droplets,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import {
  MonthlyDistribution,
  ProvinceTarget,
  InterventionDetail,
  RealSheetPhysicalData,
} from '@/utils/fetchPhysicalAccomplishmentSheet';

interface Props {
  initialData: RealSheetPhysicalData;
}

export default function PhysicalAccomplishmentClient({ initialData }: Props) {
  const [data] = useState<RealSheetPhysicalData>(initialData);
  const [scaleType, setScaleType] = useState<'logarithmic' | 'linear'>('linear');
  const [activeTab, setActiveTab] = useState<'visuals' | 'provinces' | 'schedule'>('visuals');
  const [chartView, setChartView] = useState<'both' | 'monthly' | 'provinces'>('both');

  const monthlyChartRef = useRef<HTMLCanvasElement | null>(null);
  const provinceChartRef = useRef<HTMLCanvasElement | null>(null);
  const monthlyChartInstance = useRef<Chart | null>(null);
  const provinceChartInstance = useRef<Chart | null>(null);

  // Visibility state for chart series (clickable legend)
  const [hiddenProvincial, setHiddenProvincial] = useState<{
    coverage: boolean;
    hybrid: boolean;
    inbred: boolean;
  }>({
    coverage: false,
    hybrid: false,
    inbred: false,
  });
  const hiddenProvincialRef = useRef(hiddenProvincial);
  hiddenProvincialRef.current = hiddenProvincial;

  const [hiddenMonthly, setHiddenMonthly] = useState<{
    hybrid: boolean;
    fertilizer: boolean;
  }>({
    hybrid: false,
    fertilizer: false,
  });
  const hiddenMonthlyRef = useRef(hiddenMonthly);
  hiddenMonthlyRef.current = hiddenMonthly;

  const toggleProvincialDataset = (key: 'coverage' | 'hybrid' | 'inbred') => {
    setHiddenProvincial((prev) => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };
      hiddenProvincialRef.current = updated;

      if (provinceChartInstance.current) {
        const chart = provinceChartInstance.current;
        // Dataset index mapping: 0 = Hybrid, 1 = Inbred, 2 = Coverage Rate
        const datasetIndex = key === 'coverage' ? 2 : key === 'hybrid' ? 0 : 1;
        chart.setDatasetVisibility(datasetIndex, !nextVal);

        if (key === 'coverage' && chart.options.scales?.y1) {
          chart.options.scales.y1.display = !nextVal;
        }

        chart.update();
      }

      return updated;
    });
  };

  const resetProvincialDatasets = () => {
    setHiddenProvincial({ coverage: false, hybrid: false, inbred: false });
    hiddenProvincialRef.current = { coverage: false, hybrid: false, inbred: false };
    if (provinceChartInstance.current) {
      const chart = provinceChartInstance.current;
      chart.setDatasetVisibility(0, true);
      chart.setDatasetVisibility(1, true);
      chart.setDatasetVisibility(2, true);
      if (chart.options.scales?.y1) {
        chart.options.scales.y1.display = true;
      }
      chart.update();
    }
  };

  const toggleMonthlyDataset = (key: 'hybrid' | 'fertilizer') => {
    setHiddenMonthly((prev) => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };
      hiddenMonthlyRef.current = updated;

      if (monthlyChartInstance.current) {
        const chart = monthlyChartInstance.current;
        const datasetIndex = key === 'hybrid' ? 0 : 1;
        chart.setDatasetVisibility(datasetIndex, !nextVal);
        chart.update();
      }

      return updated;
    });
  };

  const resetMonthlyDatasets = () => {
    setHiddenMonthly({ hybrid: false, fertilizer: false });
    hiddenMonthlyRef.current = { hybrid: false, fertilizer: false };
    if (monthlyChartInstance.current) {
      const chart = monthlyChartInstance.current;
      chart.setDatasetVisibility(0, true);
      chart.setDatasetVisibility(1, true);
      chart.update();
    }
  };

  // Short formatting for chart labels (e.g. 15.48K, 4.38K)
  const formatShort = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(2).replace(/\.00$/, '') + 'K';
    }
    return num.toLocaleString('en-PH');
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-PH');
  };

  // --------------------------------------------------------------------
  // CHART 1: MONTHLY TARGET DISTRIBUTION - WS & DS (FROM GOOGLE SHEET)
  // --------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'visuals' && activeTab !== 'schedule') return;
    if (chartView === 'provinces') return;
    if (!monthlyChartRef.current) return;

    if (monthlyChartInstance.current) {
      monthlyChartInstance.current.destroy();
      monthlyChartInstance.current = null;
    }

    const ctx = monthlyChartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = data.monthlySchedule.map((m) => m.month);
    const hybridValues = data.monthlySchedule.map((m) => m.hybridSeeds);
    const fertilizerValues = data.monthlySchedule.map((m) => m.inorganicFertilizer);

    // Custom badge plugin
    const badgePlugin = {
      id: 'monthlyDataBadges',
      afterDatasetsDraw(chart: any) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
          if (!chart.isDatasetVisible(datasetIndex)) return;
          const meta = chart.getDatasetMeta(datasetIndex);
          if (meta.hidden) return;
          meta.data.forEach((bar: any, index: number) => {
            const rawVal = dataset.data[index];
            if (rawVal === 0) return;
            const text = formatShort(rawVal);

            const x = bar.x;
            const y = Math.min(bar.y, chart.chartArea.bottom - 16);

            ctx.save();
            ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const textWidth = ctx.measureText(text).width;
            const padX = 4;
            const boxW = textWidth + padX * 2;
            const boxH = 14;
            const boxX = x - boxW / 2;
            const boxY = y - boxH - 3;

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetY = 1;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 2.5);
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#334155';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, boxY + boxH / 2 + 0.5);
            ctx.restore();
          });
        });
      },
    };

    const isLog = scaleType === 'logarithmic';

    monthlyChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Hybrid Seeds Target (ha)',
            data: hybridValues,
            hidden: hiddenMonthlyRef.current.hybrid,
            backgroundColor: '#f59e0b',
            hoverBackgroundColor: '#d97706',
            borderRadius: 2,
            borderSkipped: false,
            barPercentage: 0.82,
            categoryPercentage: 0.72,
          },
          {
            label: 'Inorganic Fertilizer Target (ha)',
            data: fertilizerValues,
            hidden: hiddenMonthlyRef.current.fertilizer,
            backgroundColor: '#16a34a',
            hoverBackgroundColor: '#15803d',
            borderRadius: 2,
            borderSkipped: false,
            barPercentage: 0.82,
            categoryPercentage: 0.72,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 26, right: 12, left: 6, bottom: 4 },
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
              label: (ctx) => ` ${ctx.dataset.label}: ${formatNumber(Number(ctx.raw))} ha`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#64748b',
              font: { size: 11, weight: 500 },
              maxRotation: 25,
              minRotation: 25,
            },
          },
          y: {
            type: isLog ? 'logarithmic' : 'linear',
            min: isLog ? 10 : 0,
            grid: { color: '#e2e8f0' },
            ticks: {
              color: '#64748b',
              font: { size: 11 },
              callback: (value) => `${Number(value).toLocaleString()} ha`,
            },
          },
        },
      },
      plugins: [badgePlugin],
    });

    return () => {
      if (monthlyChartInstance.current) {
        monthlyChartInstance.current.destroy();
        monthlyChartInstance.current = null;
      }
    };
  }, [data, scaleType, activeTab, chartView]);

  // --------------------------------------------------------------------
  // CHART 2: PROVINCIAL PHYSICAL ALLOCATION - CAR (DUAL BARS + TRENDLINE)
  // --------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'visuals' && activeTab !== 'provinces') return;
    if (chartView === 'monthly') return;
    if (!provinceChartRef.current) return;

    if (provinceChartInstance.current) {
      provinceChartInstance.current.destroy();
      provinceChartInstance.current = null;
    }

    const ctx = provinceChartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = data.provinces.map((p) => p.province);
    const hybridValues = data.provinces.map((p) => p.hybridTotal);
    const inbredValues = data.provinces.map((p) => p.iofInbredTotal);
    const rates = data.provinces.map((p) => p.completionRate);

    // Custom badge plugin matching the screenshot for provincial distribution
    const provBadgePlugin = {
      id: 'provinceDataBadges',
      afterDatasetsDraw(chart: any) {
        const { ctx } = chart;

        // 1. Draw bar value badges
        [0, 1].forEach((datasetIndex) => {
          if (!chart.isDatasetVisible(datasetIndex)) return;
          const meta = chart.getDatasetMeta(datasetIndex);
          if (meta.hidden) return;
          const dataset = chart.data.datasets[datasetIndex];
          if (!dataset) return;
          meta.data.forEach((bar: any, index: number) => {
            const rawVal = dataset.data[index];
            const text = formatShort(rawVal);

            const x = bar.x;
            const y = Math.min(bar.y, chart.chartArea.bottom - 16);

            ctx.save();
            ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const textWidth = ctx.measureText(text).width;
            const padX = 4;
            const boxW = textWidth + padX * 2;
            const boxH = 14;
            const boxX = x - boxW / 2;
            const boxY = y - boxH - 3;

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetY = 1;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 2.5);
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#334155';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, boxY + boxH / 2 + 0.5);
            ctx.restore();
          });
        });

        // 2. Draw Percentage Pink Badges on the line
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
              const padX = 5;
              const boxW = textWidth + padX * 2;
              const boxH = 17;
              const boxX = x - boxW / 2;
              const boxY = y - boxH - 5;

              // Blue badge box
              ctx.fillStyle = '#2563eb';
              ctx.shadowColor = 'rgba(37, 99, 235, 0.35)';
              ctx.shadowBlur = 4;
              ctx.shadowOffsetY = 1;
              ctx.beginPath();
              ctx.roundRect(boxX, boxY, boxW, boxH, 3);
              ctx.fill();

              // Text
              ctx.shadowColor = 'transparent';
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, x, boxY + boxH / 2 + 0.5);
              ctx.restore();
            });
          }
        }
      },
    };

    provinceChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Hybrid Seeds Target (ha)',
            data: hybridValues,
            hidden: hiddenProvincialRef.current.hybrid,
            backgroundColor: '#f59e0b',
            hoverBackgroundColor: '#d97706',
            borderRadius: 2,
            borderSkipped: false,
            barPercentage: 0.82,
            categoryPercentage: 0.72,
            yAxisID: 'y',
            order: 2,
          },
          {
            label: 'Inbred Fertilizer (IOF) (ha)',
            data: inbredValues,
            hidden: hiddenProvincialRef.current.inbred,
            backgroundColor: '#16a34a',
            hoverBackgroundColor: '#15803d',
            borderRadius: 2,
            borderSkipped: false,
            barPercentage: 0.82,
            categoryPercentage: 0.72,
            yAxisID: 'y',
            order: 3,
          },
          {
            label: 'Coverage / Procurement Rate',
            type: 'line',
            data: rates,
            hidden: hiddenProvincialRef.current.coverage,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.16)',
            fill: true,
            tension: 0,
            borderWidth: 2.8,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#2563eb',
            pointBorderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 32, right: 16, left: 6, bottom: 4 },
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
                  return ` Coverage Rate: ${rates[ctx.dataIndex].toFixed(1)}%`;
                }
                return ` ${ctx.dataset.label}: ${formatNumber(Number(ctx.raw))} ha`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#64748b',
              font: { size: 11.5, weight: 600 },
            },
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: '#e2e8f0' },
            ticks: {
              color: '#64748b',
              font: { size: 11 },
              callback: (value) => `${Number(value).toLocaleString()} ha`,
            },
          },
          y1: {
            type: 'linear',
            position: 'right',
            display: !hiddenProvincialRef.current.coverage,
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
      plugins: [provBadgePlugin],
    });

    return () => {
      if (provinceChartInstance.current) {
        provinceChartInstance.current.destroy();
        provinceChartInstance.current = null;
      }
    };
  }, [data, activeTab, chartView]);

  return (
    <div className="physical-accomplishment-page" style={{ paddingBottom: 60 }}>
      <div className="page-container" style={{ marginTop: 24 }}>
        {/* 2. EXECUTIVE METRIC CARDS (REAL NUMBERS FROM GOOGLE SHEET) */}
        <div className="summary-grid" style={{ marginBottom: 26 }}>
          <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px' }}>
            <div className="summary-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total WS Target Area
              </span>
              <MapPin size={17} style={{ color: '#166534' }} />
            </div>
            <div className="summary-value" style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>
              {data.totals.wsTotalArea.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>ha</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
              Original Regional Target across 6 CAR Provinces
            </span>
          </article>

          <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px' }}>
            <div className="summary-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Hybrid Seeds Target
              </span>
              <Wheat size={17} style={{ color: '#d97706' }} />
            </div>
            <div className="summary-value" style={{ fontSize: 26, fontWeight: 700, color: '#b45309' }}>
              {data.totals.hybridSeedsTotal.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>ha</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
              {data.totals.hybridWs.toLocaleString()} ha WS · {data.totals.hybridDs.toLocaleString()} ha DS
            </span>
          </article>

          <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px' }}>
            <div className="summary-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Inbred Fertilizer Target
              </span>
              <Package size={17} style={{ color: '#15803d' }} />
            </div>
            <div className="summary-value" style={{ fontSize: 26, fontWeight: 700, color: '#15803d' }}>
              {data.totals.iofInbredTotal.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>ha</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
              28,547 ha WS · 26,182 ha DS allocations
            </span>
          </article>

          <article className="summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px' }}>
            <div className="summary-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Liquid Fertilizer Quota
              </span>
              <Droplets size={17} style={{ color: '#2563eb' }} />
            </div>
            <div className="summary-value" style={{ fontSize: 26, fontWeight: 700, color: '#1d4ed8' }}>
              {data.totals.totalLiquidFertilizer.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>L</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
              Total Regional Liquid Fertilizer Procurement
            </span>
          </article>
        </div>

        {/* 3. NAVIGATION TOOLBAR & TABS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '12px 18px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          {/* Main Navigation Tabs */}
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
              onClick={() => setActiveTab('schedule')}
              style={{
                border: 'none',
                background: activeTab === 'schedule' ? '#166534' : 'transparent',
                color: activeTab === 'schedule' ? '#ffffff' : '#475569',
                fontWeight: activeTab === 'schedule' ? 700 : 500,
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
              <Calendar size={15} />
              <span>Monthly Distribution</span>
            </button>
          </div>

          {/* Right Toolbar */}
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
                  onClick={() => setChartView('monthly')}
                  className={`view-toggle-pill ${chartView === 'monthly' ? 'active' : ''}`}
                >
                  Monthly Rollout
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('provinces')}
                  className={`view-toggle-pill ${chartView === 'provinces' ? 'active' : ''}`}
                >
                  Provincial Matrix
                </button>
              </div>

              {chartView !== 'provinces' && (
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
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: COMPARATIVE VISUALS (FROM THE ACTUAL GOOGLE SHEET)      */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'visuals' && (
          <div className="visual-cards-container">
            {/* GRAPH 1: MONTHLY PHYSICAL TARGETS (WS & DS) */}
            {(chartView === 'both' || chartView === 'monthly') && (
              <div className="visual-card">
                <div className="visual-header">
                  <div className="visual-title-block">
                    <h3>
                      <span>Target VS. Monthly Distribution - WS & DS (ha)</span>
                      <span className="visual-title-badge">WS & DS Operations</span>
                    </h3>
                    <span className="visual-subtitle">
                      Monthly Physical Target Area Rollout across Wet Season (WS) and Dry Season (DS)
                    </span>
                  </div>

                  <div className="visual-stats-row">
                    <span className="visual-stat-chip">
                      <span>Total Target Area:</span>
                      <strong>{(data.totals.wsTotalArea ?? data.totals.totalTargetArea ?? 0).toLocaleString()} ha</strong>
                    </span>
                    <span className="visual-stat-chip">
                      <span>Timeline:</span>
                      <strong>{(data.monthlySchedule?.length ?? 0)} Operational Months</strong>
                    </span>
                  </div>
                </div>

                <div className="visual-canvas-container">
                  <canvas ref={monthlyChartRef} />
                </div>

                {/* Legend with Click-to-Hide Feature */}
                <div className="visual-legend-bar">
                  <button
                    type="button"
                    onClick={() => toggleMonthlyDataset('hybrid')}
                    className={`legend-toggle-btn ${hiddenMonthly.hybrid ? 'is-hidden' : ''}`}
                    title={
                      hiddenMonthly.hybrid
                        ? 'Click to show Hybrid Seeds Target (ha)'
                        : 'Click to hide Hybrid Seeds Target (ha)'
                    }
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        width: 32,
                        height: 12,
                        background: hiddenMonthly.hybrid ? '#cbd5e1' : '#f59e0b',
                      }}
                    />
                    <span>Hybrid Seeds Target (ha)</span>
                    {hiddenMonthly.hybrid && (
                      <EyeOff size={13} style={{ color: '#94a3b8', marginLeft: 2 }} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleMonthlyDataset('fertilizer')}
                    className={`legend-toggle-btn ${hiddenMonthly.fertilizer ? 'is-hidden' : ''}`}
                    title={
                      hiddenMonthly.fertilizer
                        ? 'Click to show Inorganic Fertilizer Target (ha)'
                        : 'Click to hide Inorganic Fertilizer Target (ha)'
                    }
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        width: 32,
                        height: 12,
                        background: hiddenMonthly.fertilizer ? '#cbd5e1' : '#16a34a',
                      }}
                    />
                    <span>Inorganic Fertilizer Target (ha)</span>
                    {hiddenMonthly.fertilizer && (
                      <EyeOff size={13} style={{ color: '#94a3b8', marginLeft: 2 }} />
                    )}
                  </button>

                  {(hiddenMonthly.hybrid || hiddenMonthly.fertilizer) && (
                    <button
                      type="button"
                      onClick={resetMonthlyDatasets}
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

            {/* GRAPH 2: PROVINCIAL PHYSICAL ALLOCATION (DUAL BARS + TRENDLINE) */}
            {(chartView === 'both' || chartView === 'provinces') && (
              <div className="visual-card">
                <div className="visual-header">
                  <div className="visual-title-block">
                    <h3>
                      <span>Provincial Physical Targets & Coverage Rate - CAR</span>
                      <span className="visual-title-badge">Provincial Benchmark</span>
                    </h3>
                    <span className="visual-subtitle">
                      CAR Provincial Allocation Comparison (Dual Bars with Coverage / Procurement Rate Line)
                    </span>
                  </div>

                  <div className="visual-stats-row">
                    <span className="visual-stat-chip">
                      <span>Provinces:</span>
                      <strong>{data.provinces.length} Active</strong>
                    </span>
                    <span className="visual-stat-chip">
                      <span>Hybrid Allocation:</span>
                      <strong>{data.totals.hybridSeedsTotal.toLocaleString()} ha</strong>
                    </span>
                    <span className="visual-stat-chip">
                      <span>Inbred (IOF):</span>
                      <strong>{data.totals.iofInbredTotal.toLocaleString()} ha</strong>
                    </span>
                  </div>
                </div>

                <div className="visual-canvas-container">
                  <canvas ref={provinceChartRef} />
                </div>

                {/* Legend with Click-to-Hide Feature */}
                <div className="visual-legend-bar">
                  <button
                    type="button"
                    onClick={() => toggleProvincialDataset('coverage')}
                    className={`legend-toggle-btn ${hiddenProvincial.coverage ? 'is-hidden' : ''}`}
                    title={
                      hiddenProvincial.coverage
                        ? 'Click to show Coverage / Procurement Rate (%)'
                        : 'Click to hide Coverage / Procurement Rate (%)'
                    }
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        width: 34,
                        height: 12,
                        background: hiddenProvincial.coverage ? '#f1f5f9' : 'rgba(37, 99, 235, 0.22)',
                        border: hiddenProvincial.coverage ? '2px dashed #cbd5e1' : '2px solid #2563eb',
                      }}
                    />
                    <span>Coverage / Procurement Rate (%)</span>
                    {hiddenProvincial.coverage && (
                      <EyeOff size={13} style={{ color: '#94a3b8', marginLeft: 2 }} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleProvincialDataset('hybrid')}
                    className={`legend-toggle-btn ${hiddenProvincial.hybrid ? 'is-hidden' : ''}`}
                    title={
                      hiddenProvincial.hybrid
                        ? 'Click to show Hybrid Seeds Target (ha)'
                        : 'Click to hide Hybrid Seeds Target (ha)'
                    }
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        width: 32,
                        height: 12,
                        background: hiddenProvincial.hybrid ? '#cbd5e1' : '#f59e0b',
                      }}
                    />
                    <span>Hybrid Seeds Target (ha)</span>
                    {hiddenProvincial.hybrid && (
                      <EyeOff size={13} style={{ color: '#94a3b8', marginLeft: 2 }} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleProvincialDataset('inbred')}
                    className={`legend-toggle-btn ${hiddenProvincial.inbred ? 'is-hidden' : ''}`}
                    title={
                      hiddenProvincial.inbred
                        ? 'Click to show Inbred Fertilizer (IOF) (ha)'
                        : 'Click to hide Inbred Fertilizer (IOF) (ha)'
                    }
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        width: 32,
                        height: 12,
                        background: hiddenProvincial.inbred ? '#cbd5e1' : '#16a34a',
                      }}
                    />
                    <span>Inbred Fertilizer (IOF) (ha)</span>
                    {hiddenProvincial.inbred && (
                      <EyeOff size={13} style={{ color: '#94a3b8', marginLeft: 2 }} />
                    )}
                  </button>

                  {(hiddenProvincial.coverage || hiddenProvincial.hybrid || hiddenProvincial.inbred) && (
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
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: PROVINCIAL MATRIX (LIVE FROM GOOGLE SHEET ROWS 1-23)   */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'provinces' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px' }}>
            <div style={{ marginBottom: 18 }}>
              <div className="eyebrow" style={{ color: '#166534', marginBottom: 4 }}>
                Cordillera Administrative Region · Provincial Matrix
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                FY 2026 Provincial Target Area & Fertilizer Allocation Matrix
              </h3>
              <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
                Extracted directly from Google Sheet rows 1–23. Shows Wet Season (WS) and Dry Season (DS) target areas, hybrid seeds, and inorganic fertilizer (IOF) requirements.
              </p>
            </div>

            <div className="data-table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: '#334155' }}>PROVINCE</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#334155' }}>TOTAL AREA (orig target)</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#166534' }}>HYBRID WS (ha)</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#166534' }}>HYBRID DS (ha)</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#b45309' }}>IOF FOR HYBRID (ha)</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#b45309' }}>IOF FOR INBRED (ha)</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#334155' }}>PROCURED COMPLETE</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#334155' }}>PROCURED UREA</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#2563eb' }}>TOTAL LIQUID FERT (L)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.provinces.map((p, idx) => (
                    <tr
                      key={p.province}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: '#0f172a' }}>{p.province}</td>
                      <td style={{ textAlign: 'right', padding: '11px 14px', fontWeight: 700, color: '#0f172a' }}>
                        {p.totalAreaOrig.toLocaleString()} ha
                      </td>
                      <td style={{ textAlign: 'right', padding: '11px 14px', color: '#166534' }}>
                        {p.hybridWs.toLocaleString()} ha
                      </td>
                      <td style={{ textAlign: 'right', padding: '11px 14px', color: '#166534' }}>
                        {p.hybridDs.toLocaleString()} ha
                      </td>
                      <td style={{ textAlign: 'right', padding: '11px 14px', color: '#b45309' }}>
                        {p.iofHybridTotal.toLocaleString()} ha
                      </td>
                      <td style={{ textAlign: 'right', padding: '11px 14px', color: '#b45309' }}>
                        {p.iofInbredTotal.toLocaleString()} ha
                      </td>
                      <td style={{ textAlign: 'right', padding: '11px 14px', color: '#475569' }}>
                        {p.procuredComplete > 0 ? p.procuredComplete.toLocaleString() : '—'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '11px 14px', color: '#475569' }}>
                        {p.procuredUrea > 0 ? p.procuredUrea.toLocaleString() : '—'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '11px 14px', fontWeight: 600, color: '#2563eb' }}>
                        {p.totalLiquidFert > 0 ? `${p.totalLiquidFert.toLocaleString()} L` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                    <td style={{ padding: '12px 14px', color: '#0f172a' }}>TOTAL REGIONAL ALLOCATION</td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', color: '#0f172a' }}>
                      {data.provinces.reduce((a, b) => a + b.totalAreaOrig, 0).toLocaleString()} ha
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', color: '#166534' }}>
                      {data.provinces.reduce((a, b) => a + b.hybridWs, 0).toLocaleString()} ha
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', color: '#166534' }}>
                      {data.provinces.reduce((a, b) => a + b.hybridDs, 0).toLocaleString()} ha
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', color: '#b45309' }}>
                      {data.provinces.reduce((a, b) => a + b.iofHybridTotal, 0).toLocaleString()} ha
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', color: '#b45309' }}>
                      {data.provinces.reduce((a, b) => a + b.iofInbredTotal, 0).toLocaleString()} ha
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', color: '#475569' }}>
                      {data.provinces.reduce((a, b) => a + b.procuredComplete, 0).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', color: '#475569' }}>
                      {data.provinces.reduce((a, b) => a + b.procuredUrea, 0).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', color: '#2563eb' }}>
                      {data.totals.totalLiquidFertilizer.toLocaleString()} L
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: MONTHLY DISTRIBUTION (WS & DS COMPLETE SCHEDULE)        */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'schedule' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px' }}>
            <div style={{ marginBottom: 18 }}>
              <div className="eyebrow" style={{ color: '#166534', marginBottom: 4 }}>
                Regional Calendar · Monthly Breakdown
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                Monthly Target Area Distribution Schedule (Wet & Dry Season)
              </h3>
              <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
                Extracted directly from Google Sheet headers and monthly columns. Tracks timeline across Wet Season (WS) and Dry Season (DS).
              </p>
            </div>

            <div className="data-table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: '#334155' }}>MONTH</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: '#334155' }}>SEASON</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#b45309' }}>HYBRID SEEDS (ha)</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#166534' }}>INORGANIC FERTILIZER (ha)</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>TOTAL AREA TARGET (ha)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlySchedule.map((m, idx) => (
                    <tr
                      key={m.month}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: '#0f172a' }}>{m.month}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            background: m.season === 'WS' ? '#e9f0e8' : '#fef3c7',
                            color: m.season === 'WS' ? '#166534' : '#92400e',
                          }}
                        >
                          {m.season === 'WS' ? 'Wet Season (WS)' : 'Dry Season (DS)'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '11px 14px', fontWeight: 600, color: '#b45309' }}>
                        {m.hybridSeeds > 0 ? `${m.hybridSeeds.toLocaleString()} ha` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '11px 14px', fontWeight: 600, color: '#166534' }}>
                        {m.inorganicFertilizer > 0 ? `${m.inorganicFertilizer.toLocaleString()} ha` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '11px 14px', fontWeight: 700, color: '#0f172a' }}>
                        {m.totalArea.toLocaleString()} ha
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
