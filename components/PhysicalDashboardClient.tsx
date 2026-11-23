'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Wheat,
  GraduationCap,
  FlaskConical,
  Building2,
  Layers,
} from 'lucide-react';

export type PhysicalDashboardTabKey =
  | 'overall'
  | 'pss'
  | 'esets'
  | 'rnd'
  | 'ins';

interface TabDefinition {
  id: PhysicalDashboardTabKey;
  label: string;
  shortLabel: string;
  fullName: string;
  icon: React.ElementType;
  description: string;
}

const TABS: TabDefinition[] = [
  {
    id: 'overall',
    label: 'Overall vs Annual',
    shortLabel: 'Overall',
    fullName: 'Overall vs Annual Targets & Accomplishments',
    icon: BarChart3,
    description:
      'Cumulative program target milestones compared against annual physical accomplishment benchmarks across Cordillera provinces.',
  },
  {
    id: 'pss',
    label: 'PSS',
    shortLabel: 'PSS',
    fullName: 'Production Support Services (PSS)',
    icon: Wheat,
    description:
      'Agricultural input distributions including hybrid and inbred certified seeds, fertilizer vouchers, bio-fertilizers, and crop protection materials.',
  },
  {
    id: 'esets',
    label: 'ESETS',
    shortLabel: 'ESETS',
    fullName: 'Extension Support, Education & Training Services (ESETS)',
    icon: GraduationCap,
    description:
      'Capacity building, specialized technical trainings, Farmer Field Schools (FFS), and information education campaign (IEC) deployments.',
  },
  {
    id: 'rnd',
    label: 'RND',
    shortLabel: 'RND',
    fullName: 'Research & Development (RND)',
    icon: FlaskConical,
    description:
      'Applied agricultural research, regional varietal trial validations, technological demonstrations, and climate-resilient farming assessments.',
  },
  {
    id: 'ins',
    label: 'INS',
    shortLabel: 'INS',
    fullName: 'Infrastructure Support Services (INS)',
    icon: Building2,
    description:
      'Small-scale irrigation systems (SSIP), communal irrigation rehabilitations, post-harvest processing facilities, and farm machinery provisions.',
  },
];

export default function PhysicalDashboardClient() {
  const [activeTab, setActiveTab] = useState<PhysicalDashboardTabKey>('overall');

  const currentTab = TABS.find((tab) => tab.id === activeTab) || TABS[0];
  const IconComponent = currentTab.icon;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : '#475569',
                background: isActive ? '#166534' : '#ffffff',
                border: isActive ? '1px solid #166534' : '1px solid #cbd5e1',
                boxShadow: isActive ? '0 2px 6px rgba(22, 101, 52, 0.25)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <TabIcon
                size={16}
                style={{
                  color: isActive ? '#ffffff' : '#64748b',
                  strokeWidth: isActive ? 2.5 : 2,
                }}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Context Header */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                flexShrink: 0,
              }}
            >
              <IconComponent size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {currentTab.fullName}
                </h1>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: '#64748b',
                  margin: '4px 0 0',
                  lineHeight: 1.5,
                  maxWidth: 880,
                }}
              >
                {currentTab.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Blank Template Container */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px dashed #cbd5e1',
          padding: '70px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 380,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            marginBottom: 16,
          }}
        >
          <Layers size={26} strokeWidth={1.8} />
        </div>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#334155',
            margin: '0 0 6px',
          }}
        >
          {currentTab.label} Dashboard Template
        </h2>
        <p
          style={{
            fontSize: 13,
            color: '#94a3b8',
            margin: 0,
            maxWidth: 480,
            lineHeight: 1.5,
          }}
        >
          This workspace is initialized and kept blank. Modules, metrics, visual analytics, and provincial breakdown tables can be added here.
        </p>
      </div>
    </div>
  );
}
