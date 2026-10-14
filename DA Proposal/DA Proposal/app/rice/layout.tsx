export default function RiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="page-hero">
        <div className="page-container">
          <span className="eyebrow">Official Operations Dashboard</span>
          <h1>Rice Program Coordinating Unit</h1>
          <p>
            Official monitoring of current rice program activities, fund releases, farmer services, and published reports.
          </p>
        </div>
      </section>
      {children}
    </>
  );
}
