import DisclaimerFooter from '@/components/DisclaimerFooter';
import RequireAuth from '@/components/RequireAuth';
import TopNav from '@/components/TopNav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="h-full flex flex-col">
        <TopNav />
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
        <DisclaimerFooter />
      </div>
    </RequireAuth>
  );
}