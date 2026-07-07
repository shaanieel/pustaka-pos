export const config = {
  runtime: "experimental-edge",
};

export default function ErrorPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Error
        </p>
        <h1 className="mt-3 text-3xl font-bold">Terjadi kesalahan</h1>
        <a
          href="/"
          className="mt-6 inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Kembali ke dashboard
        </a>
      </div>
    </main>
  );
}
