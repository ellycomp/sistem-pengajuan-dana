import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('KasSekolah gagal ditampilkan:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-[#F8FAF8] flex items-center justify-center p-6 text-[#191C1B]">
          <section className="w-full max-w-xl rounded-xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-red-700">Aplikasi mengalami kendala</h1>
            <p className="mt-2 text-sm text-gray-700">
              Halaman berhasil dimuat, tetapi ada kesalahan saat menampilkan aplikasi.
              Muat ulang halaman terlebih dahulu. Jika masih terjadi, kirimkan pesan
              kesalahan di bawah kepada pengelola.
            </p>
            <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-100 p-3 text-xs">{this.state.error.message}</pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-[#00433C] px-4 py-2 text-sm font-semibold text-white"
            >
              Muat Ulang Aplikasi
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>
  );
} else {
  document.body.innerHTML = '<main style="padding:24px;font-family:sans-serif">Elemen aplikasi (#root) tidak ditemukan. Silakan muat ulang halaman.</main>';
}
