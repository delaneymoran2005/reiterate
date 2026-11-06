"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const PDFReader = dynamic(() => import("./PDFReader"), {
  ssr: false,
});

export default function Home() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold">Reiterate.</h1>
          <p className="mt-2 text-slate-600">
            Scientific research, made understandable.
          </p>
        </header>

        <section className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">
            Upload a research paper
          </h2>

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0];

              if (selectedFile) {
                setFile(selectedFile);
              }
            }}
            className="mt-4 block w-full rounded border p-3"
          />
        </section>

        {file ? (
          <PDFReader key={file.name + file.lastModified} file={file} />
        ) : (
          <div className="rounded-xl border-2 border-dashed p-16 text-center text-slate-500">
            Upload a PDF to begin reading.
          </div>
        )}
      </div>
    </main>
  );
}
