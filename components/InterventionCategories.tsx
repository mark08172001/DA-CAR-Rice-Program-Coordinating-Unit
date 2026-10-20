'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sprout, GraduationCap, Truck, Droplets, ClipboardCheck, ArrowRight, Wheat } from 'lucide-react';

export interface InterventionGroup {
  kicker: string;
  items: string[];
}

export interface InterventionCategoryItem {
  title: string;
  code: string;
  papCode: string;
  subtitle: string;
  icon: any;
  groups: InterventionGroup[];
}

export const INTERVENTION_SERVICES: InterventionCategoryItem[] = [
  {
    title: 'Production Support Services',
    code: 'PSS RICE',
    papCode: '310101100001000',
    subtitle: 'Certified seed reserves, soil health & biological inputs',
    icon: Sprout,
    groups: [
      {
        kicker: 'SEEDS & VARIETALS',
        items: ['Hybrid Rice Seeds', 'Seed Reserve (hybrid & certified seeds)'],
      },
      {
        kicker: 'SOIL & CROP NUTRITION',
        items: ['Inorganic Fertilizer', 'Biofertilizer', 'Soil Ameliorant'],
      },
      {
        kicker: 'MODERNIZATION',
        items: ['Agricultural Drone Project'],
      },
    ],
  },
  {
    title: 'Extension Support, Education & Training',
    code: 'ESETS RICE',
    papCode: '310103100001000',
    subtitle: 'Farmer field schools & sustainable highland methodologies',
    icon: GraduationCap,
    groups: [
      {
        kicker: 'FARMING METHODOLOGIES',
        items: [
          'Palayamanan Integrated Farming',
          'System of Rice Intensification (SRI)',
          'Agroecology-based rice farming',
        ],
      },
      {
        kicker: 'INDIGENOUS HERITAGE',
        items: ['Cordillera Heirloom Rice Preservation'],
      },
    ],
  },
  {
    title: 'Machinery, Equipment & Facility Support',
    code: 'RD / AMF RICE',
    papCode: '310104100001000',
    subtitle: 'Farm mechanization, hauling logistics & post-harvest storage',
    icon: Truck,
    groups: [
      {
        kicker: 'LOGISTICS & TRANSPORT',
        items: ['Hauling Truck', 'Heavy-Duty Forklift'],
      },
      {
        kicker: 'POST-HARVEST FACILITIES',
        items: ['Regional Storage Facilities', 'Multi-crop drying pavement'],
      },
    ],
  },
  {
    title: 'Irrigation Network Services',
    code: 'INS RICE',
    papCode: '310202100001000',
    subtitle: 'Small-Scale Irrigation Projects (SSIP) across 6 provinces',
    icon: Droplets,
    groups: [
      {
        kicker: 'SSIP NEW CONSTRUCTION',
        items: ['Spring Development', 'Diversion Dam', 'Irrigation Canal'],
      },
      {
        kicker: 'SSIP REHABILITATION & SOLAR',
        items: [
          'Diversion Dam & Canal Rehab',
          'Small Water Impounding Project',
          'Solar-Powered Irrigation System',
        ],
      },
      {
        kicker: 'OTHER SSIP UNITS',
        items: ['PISOS, pump & engine set, small farm reservoir, STWs'],
      },
    ],
  },
];

export const MINIMUM_QUALIFICATIONS = [
  {
    title: 'Production Support Services',
    code: 'PSS RICE',
    subtitle: 'Farmer eligibility for seeds & fertilizer assistance',
    icon: Sprout,
    groups: [
      {
        kicker: 'BASIC REQUIREMENTS',
        items: ['RSBSA Registered Farmers', 'Member of registered FCA'],
      },
      {
        kicker: 'CLUSTER CRITERIA',
        items: ['FCA must belong to a verified cluster', 'Minimum area: ≥ 0.1 ha'],
      },
    ],
  },
  {
    title: 'Extension Support, Education & Training',
    code: 'ESETS RICE',
    subtitle: 'Farmer eligibility for training programs & schools',
    icon: GraduationCap,
    groups: [
      {
        kicker: 'BASIC REQUIREMENTS',
        items: ['RSBSA Registered Farmers', 'Member of registered FCA'],
      },
      {
        kicker: 'CLUSTER CRITERIA',
        items: ['FCA must belong to a verified cluster'],
      },
    ],
  },
  {
    title: 'Machinery, Equipment & Facility Support',
    code: 'RD / AMF RICE',
    subtitle: 'Cooperative qualifications for mechanization units',
    icon: Truck,
    groups: [
      {
        kicker: 'COMPLIANCE',
        items: [
          'Compliant to DA MC41 guidelines',
          'Valid registration with CDA or DOLE',
          'Trained machinery operators',
        ],
      },
    ],
  },
  {
    title: 'Irrigation Network Services',
    code: 'INS RICE',
    subtitle: 'Eligibility for small-scale irrigation systems',
    icon: Droplets,
    groups: [
      {
        kicker: 'ACCREDITATION',
        items: ['CSO accredited FCA or irrigators association', 'Identified arable service area'],
      },
    ],
  },
];

export default function InterventionCategories() {
  const [activeTab, setActiveTab] = useState<'services' | 'qualifications'>('services');

  const currentData = activeTab === 'services' ? INTERVENTION_SERVICES : MINIMUM_QUALIFICATIONS;

  return (
    <div className="intervention-clean-container">
      {/* Tab toggle control */}
      <div className="intervention-clean-tabs-bar">
        <div className="intervention-clean-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'services'}
            className={`intervention-clean-tab ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <Wheat size={14} />
            <span>Programs & Services</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'qualifications'}
            className={`intervention-clean-tab ${activeTab === 'qualifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('qualifications')}
          >
            <ClipboardCheck size={14} />
            <span>Minimum Qualifications</span>
          </button>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="intervention-clean-grid" key={activeTab}>
        {currentData.map((item, index) => {
          const IconComponent = item.icon;

          return (
            <article key={index} className="intervention-card-clean">
              {/* Card Header */}
              <div className="intervention-card-top">
                <div className="intervention-icon-box">
                  <IconComponent size={18} className="intervention-icon" />
                </div>
                <span className="intervention-code-pill">{item.code}</span>
              </div>

              {/* Title & Subtitle */}
              <h3 className="intervention-card-title">{item.title}</h3>
              <p className="intervention-card-subtitle">{item.subtitle}</p>

              {/* Grouped Items List */}
              <div className="intervention-groups-list">
                {item.groups.map((group, gIdx) => (
                  <div key={gIdx} className="intervention-group-block">
                    <span className="intervention-group-kicker">{group.kicker}</span>
                    <ul className="intervention-items-ul">
                      {group.items.map((it, iIdx) => (
                        <li key={iIdx} className="intervention-item-li">
                          <span className="bullet-dot">•</span>
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Card Footer (Clean link, NO budget data) */}
              <div className="intervention-card-footer">
                <a href="#event-calendar" className="intervention-action-link">
                  <span>Activities</span>
                  <span>›</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
