import DisclaimerFooter from '@/components/DisclaimerFooter';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        {children}
      </div>
      <DisclaimerFooter />
    </div>
  );
}