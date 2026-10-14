export default function RiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="page-hero">
        <div className="page-container">
          <h1>Rice Program Coordinating Unit</h1>
          <p>
            Official monitoring of current rice program activities, fund releases, farmer services, and reports.
          </p>
        </div>
      </section>
      {children}
    </>
  );
}
