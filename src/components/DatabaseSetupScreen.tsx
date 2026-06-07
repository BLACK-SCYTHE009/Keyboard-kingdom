type DatabaseSetupScreenProps = {
  message?: string;
};

export default function DatabaseSetupScreen({ message }: DatabaseSetupScreenProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-classy bg-cover bg-center px-4 py-8 text-center text-white">
      <div className="absolute inset-0 bg-black/55" />
      <main className="stone-panel relative z-10 w-full max-w-2xl p-6 text-left shadow-2xl md:p-8">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-gold">Supabase Setup</p>
        <h1 className="text-2xl text-epic-gold md:text-4xl">DATABASE TABLES MISSING</h1>
        <p className="mt-5 font-sans text-sm leading-7 text-gray-100 text-shadow-none">
          Keyboard Kingdom is connected to Clerk, but Supabase does not have the profile tables yet.
        </p>
        {message && (
          <div className="mt-5 border border-red-500/40 bg-red-950/70 p-4 font-sans text-sm text-red-100 text-shadow-none">
            {message}
          </div>
        )}
        <div className="mt-6 border border-gold/30 bg-black/55 p-4">
          <p className="font-sans text-sm leading-7 text-gray-100 text-shadow-none">
            Open the Supabase SQL Editor and run the schema in:
          </p>
          <code className="mt-3 block break-all bg-black/70 p-3 font-mono text-xs text-gold text-shadow-none">supabase-schema.sql</code>
        </div>
      </main>
    </div>
  );
}
