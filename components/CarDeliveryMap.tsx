'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  Map as LeafletMap,
  TileLayer,
  Marker,
  CircleMarker,
  Polygon,
  divIcon,
} from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MappedDeliverySite {
  key: string;
  municipality: string;
  province: string;
  lat: number;
  lng: number;
  totalUnits: number;
  dropCount: number;
  fundSources: string[];
  seasons: string[];
  topProducts: { product: string; qty: number; unit: string }[];
}

interface CarDeliveryMapProps {
  sites: MappedDeliverySite[];
  selectedSiteKey: string | null;
  onSelectSite: (siteKey: string | null) => void;
}

// Approximate Cordillera Administrative Region (CAR) perimeter polygon for visual regional highlight
const CAR_BOUNDARY_COORDS: [number, number][] = [
  [18.55, 120.95],
  [18.48, 121.45],
  [18.25, 121.62],
  [17.75, 121.65],
  [17.45, 121.70],
  [17.15, 121.62],
  [16.85, 121.55],
  [16.58, 121.28],
  [16.28, 120.88],
  [16.18, 120.52],
  [16.45, 120.42],
  [16.85, 120.46],
  [17.30, 120.48],
  [17.75, 120.52],
  [18.18, 120.72],
];

const CAR_PROVINCES = new Set([
  'Abra',
  'Apayao',
  'Benguet',
  'Ifugao',
  'Kalinga',
  'Mountain Province',
]);

const isWithinCAR = (site: MappedDeliverySite): boolean =>
  CAR_PROVINCES.has(site.province) &&
  site.lat >= 16.05 &&
  site.lat <= 18.70 &&
  site.lng >= 120.25 &&
  site.lng <= 121.85;

const PROVINCE_COLORS: Record<string, string> = {
  Abra: '#0284c7',
  Apayao: '#16a34a',
  Benguet: '#0d9488',
  Ifugao: '#d97706',
  Kalinga: '#14532d',
  'Mountain Province': '#7c3aed',
};

const formatNumber = (n: number) =>
  new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(n);

export default function CarDeliveryMap({
  sites,
  selectedSiteKey,
  onSelectSite,
}: CarDeliveryMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const layersRef = useRef<(Marker | CircleMarker)[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      const active = document.fullscreenElement === wrapperRef.current;
      setIsFullscreen(active);
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 120);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && wrapperRef.current) {
        await wrapperRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Fallback if browser blocks fullscreen
    }
  };

  // Initialize Leaflet Map centered on Cordillera Administrative Region (unlocked panning/zooming)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = new LeafletMap(mapContainerRef.current, {
      center: [17.32, 121.02],
      zoom: 8,
      zoomControl: true,
    });

    new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // Highlight Cordillera Administrative Region boundary
    new Polygon(CAR_BOUNDARY_COORDS, {
      color: '#14532d',
      weight: 2,
      dashArray: '6, 5',
      fillColor: '#16a34a',
      fillOpacity: 0.05,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
      layersRef.current = [];
    };
  }, []);

  // Render & update delivery site markers whenever filtered sites change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers/circles
    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];
    markersRef.current.clear();

    // Only plot delivery sites within the Cordillera Administrative Region (CAR)
    const carSites = sites.filter(isWithinCAR);
    const maxUnits = Math.max(1, ...carSites.map((s) => s.totalUnits));

    carSites.forEach((site) => {
      const color = PROVINCE_COLORS[site.province] || '#166534';
      const ratio = site.totalUnits / maxUnits;
      const radius = Math.max(8, Math.min(28, 8 + Math.sqrt(ratio) * 20));

      // Scaled highlight halo circle
      const circle = new CircleMarker([site.lat, site.lng], {
        radius,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.28,
      }).addTo(map);

      // Custom crisp pin marker (avoids broken default webpack marker-icon.png)
      const pinIcon = divIcon({
        className: 'car-delivery-pin',
        html: `<div style="
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${color};
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          cursor: pointer;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -8],
      });

      const productListHtml = site.topProducts
        .slice(0, 4)
        .map(
          (p) =>
            `<div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;padding:2px 0;border-bottom:1px dashed #e2e8f0;">
              <span style="color:#334155;font-weight:600;">${p.product}</span>
              <span style="color:#166534;font-weight:700;">${formatNumber(p.qty)} ${p.unit}</span>
            </div>`
        )
        .join('');

      const popupHtml = `
        <div style="min-width:210px;font-family:system-ui,-apple-system,sans-serif;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${color};letter-spacing:0.04em;">
            ${site.province} • CAR
          </div>
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin:2px 0 6px;">
            ${site.municipality}
          </div>
          <div style="display:flex;justify-content:space-between;background:#f8fafc;padding:6px 8px;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:8px;">
            <div>
              <div style="font-size:10px;color:#64748b;">Total Delivered</div>
              <div style="font-size:13px;font-weight:800;color:#166534;">${formatNumber(site.totalUnits)} units</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:10px;color:#64748b;">Drops</div>
              <div style="font-size:13px;font-weight:800;color:#0f172a;">${site.dropCount}</div>
            </div>
          </div>
          <div style="font-size:10px;color:#475569;margin-bottom:6px;line-height:1.4;">
            <strong>Fund:</strong> ${site.fundSources.slice(0, 2).join(', ')}${site.fundSources.length > 2 ? ` +${site.fundSources.length - 2}` : ''}<br/>
            <strong>Season:</strong> ${site.seasons.slice(0, 2).join(', ')}
          </div>
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;">
            Top Inputs Delivered
          </div>
          ${productListHtml}
        </div>
      `;

      const marker = new Marker([site.lat, site.lng], { icon: pinIcon })
        .addTo(map)
        .bindPopup(popupHtml);

      marker.on('click', () => {
        onSelectSite(site.key);
      });
      circle.on('click', () => {
        onSelectSite(site.key);
        marker.openPopup();
      });

      layersRef.current.push(circle, marker);
      markersRef.current.set(site.key, marker);
    });
  }, [sites, onSelectSite]);

  // Pan & open popup when a site is selected from the sidebar/table
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedSiteKey) return;

    const targetSite = sites.find((s) => s.key === selectedSiteKey);
    const marker = markersRef.current.get(selectedSiteKey);
    if (targetSite && marker) {
      map.flyTo([targetSite.lat, targetSite.lng], 11, { duration: 0.6 });
      marker.openPopup();
    }
  }, [selectedSiteKey, sites]);

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    onSelectSite(null);
    map.flyTo([17.32, 121.02], 8, { duration: 0.5 });
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : '100%',
        background: '#ffffff',
      }}
    >
      <style>{`
        .car-map-el { height: 500px; }
        @media (max-width: 640px) {
          .car-map-el { height: 340px; }
        }
      `}</style>
      <div
        ref={mapContainerRef}
        id="map"
        className={isFullscreen ? undefined : 'car-map-el'}
        style={{
          width: '100%',
          height: isFullscreen ? '100vh' : undefined,
          borderRadius: isFullscreen ? 0 : 10,
          border: isFullscreen ? 'none' : '1px solid #cbd5e1',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 400,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={handleResetView}
          style={{
            background: '#166534',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          }}
        >
          Reset Map
        </button>
        <button
          type="button"
          onClick={handleToggleFullscreen}
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
          }}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
        </button>
      </div>
    </div>
  );
}
