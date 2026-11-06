import CircleLoading from '@/components/CircleLoading';

export default function Loading() {
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '85vh', overflow: 'hidden' }}>
      {/* Blurred ghost silhouette of the website layout */}
      <div
        aria-hidden="true"
        style={{
          filter: 'blur(12px) brightness(0.92)',
          opacity: 0.35,
          pointerEvents: 'none',
          userSelect: 'none',
          padding: '24px 28px',
          maxWidth: '1560px',
          margin: '0 auto',
        }}
      >
        {/* Ghost Header */}
        <div style={{ height: 48, background: '#e2e8f0', borderRadius: 10, marginBottom: 24, width: '38%' }} />

        {/* Ghost KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 28 }}>
          <div style={{ height: 105, background: '#ffffff', borderRadius: 12, border: '1px solid #cbd5e1' }} />
          <div style={{ height: 105, background: '#ffffff', borderRadius: 12, border: '1px solid #cbd5e1' }} />
          <div style={{ height: 105, background: '#ffffff', borderRadius: 12, border: '1px solid #cbd5e1' }} />
        </div>

        {/* Ghost Chart Card */}
        <div style={{ height: 340, background: '#ffffff', borderRadius: 14, border: '1px solid #cbd5e1', marginBottom: 24 }} />

        {/* Ghost Table */}
        <div style={{ height: 240, background: '#ffffff', borderRadius: 12, border: '1px solid #cbd5e1' }} />
      </div>

      {/* Single Circle Spinner Overlay with Blurred Backdrop */}
      <CircleLoading text="Loading..." />
    </div>
  );
}

