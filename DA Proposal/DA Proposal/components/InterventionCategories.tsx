'use client';

import { useState, useEffect } from 'react';
import { Wheat, GraduationCap, Truck, Droplets, ClipboardCheck, ArrowRightLeft } from 'lucide-react';

export const INTERVENTION_SERVICES = [
  {
    title: 'Production Support Services',
    icon: Wheat,
    items: [
      'Hybrid Rice Seeds',
      'Inorganic Fertilizer',
      'Drone Project',
      'Biofertilizer',
      'Soil Ameliorant',
      'Seed Reserve (hybrid and certified seeds)',
    ],
  },
  {
    title: 'Extension Support, Education & Training Services',
    icon: GraduationCap,
    items: [
      'Palayamanan',
      'System of Rice Intensification',
      'Agroecology based rice farming',
      'Heirloom Rice',
    ],
  },
  {
    title: 'Agricultural Machinery, Equipment & Facility Support Services',
    icon: Truck,
    items: [
      'Hauling Truck',
      'Forklift',
      'Storage facilities',
      'Multi-crop drying pavement',
    ],
  },
  {
    title: 'Irrigation Network Services',
    icon: Droplets,
    items: [
      'SSIP construction - Spring Development',
      'SSIP construction - Diversion Dam',
      'SSIP construction - Irrigation Canal',
      'SSIP rehabilitation - Diversion Dam',
      'SSIP rehabilitation - Irrigation Canal',
      'SSIP rehabilitation - Small Water Impounding Project',
      'SSIP rehabilitation - Solar-Powered Irrigation System',
      'Other SSIPs (PISOS, pump & engine set, small farm reservoir, STWs, etc.)',
    ],
  },
];

export const MINIMUM_QUALIFICATIONS = [
  {
    title: 'Production Support Services',
    icon: Wheat,
    items: [
      'RSBSA Registered Farmers',
      'Member of FCA',
      'FCA must belong to a cluster',
      'Minimum area: ≥ 0.1 ha',
    ],
  },
  {
    title: 'Extension Support, Education & Training Services',
    icon: GraduationCap,
    items: [
      'RSBSA Registered Farmers',
      'Member of FCA',
      'FCA must belong to a cluster',
    ],
  },
  {
    title: 'Agricultural Machinery, Equipment & Facility Support Services',
    icon: Truck,
    items: [
      'Machineries and Equipment for rice FCAs/Clusters compliant to the MC41 documents',
    ],
  },
  {
    title: 'Irrigation Network Services',
    icon: Droplets,
    items: [
      'CSO accredited FCA',
      'With service area',
    ],
  },
];

export default function InterventionCategories() {
  const [activeTab, setActiveTab] = useState<'services' | 'qualifications'>('services');

  const currentData = activeTab === 'services' ? INTERVENTION_SERVICES : MINIMUM_QUALIFICATIONS;
  const currentTitle = activeTab === 'services' ? 'Interventions' : 'Minimum Qualifications';

  return (
    <div className="intervention-container">
      <div className="intervention-header-bar">
        <div className="intervention-title-group">
          {activeTab === 'services' ? (
            <Wheat className="intervention-header-icon" size={20} />
          ) : (
            <ClipboardCheck className="intervention-header-icon" size={20} />
          )}
          <h3>{currentTitle}</h3>
        </div>

        <div className="intervention-tab-controls" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'services'}
            className={`intervention-tab-btn ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <Wheat size={14} />
            <span>Programs & Services</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'qualifications'}
            className={`intervention-tab-btn ${activeTab === 'qualifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('qualifications')}
          >
            <ClipboardCheck size={14} />
            <span>Minimum Qualifications</span>
          </button>
        </div>
      </div>

      <div className="intervention-services-grid key-fade" key={activeTab}>
        {currentData.map((service, index) => {
          const Icon = service.icon;
          return (
            <article key={index} className={`intervention-service-card ${activeTab === 'qualifications' ? 'qualifications-card' : ''}`}>
              <div className="intervention-service-heading">
                <span className="intervention-service-icon">
                  <Icon size={20} />
                </span>
                <h2>{service.title}</h2>
              </div>
              <ul>
                {service.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

