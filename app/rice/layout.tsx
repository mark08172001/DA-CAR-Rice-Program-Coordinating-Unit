import RiceHeroHeader from '@/components/RiceHeroHeader';

export default function RiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RiceHeroHeader />
      {children}
    </>
  );
}
