import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import './index.css';

interface ErrorBoundaryState {
  error: Error | null;
}

function showStartupError(message: string) {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;
  rootElement.innerHTML = '';
  const panel = document.createElement('main');
  panel.style.cssText = 'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#F8FAF8;font-family:system-ui,sans-serif;color:#191C1B';
  const card = document.createElement('section');
  card.style.cssText = 'width:100%;max-width:560px;background:white;border:1px solid #BEC9C6;border-radius:14px;padding:24px;box-shadow:0 4px 18px #0001';
  const title = document.createElement('h1');
  title.textContent = 'KasSekolah mengalami kendala';
  title.style.cssText = 'font-size:22px;font-weight:700;color:#BA1A1A;margin:0 0 10px';
  const description = document.createElement('p');
  description.textContent = 'Aplikasi gagal dimuat. Muat ulang halaman. Jika masalah berlanjut, kirimkan pesan kesalahan di bawah kepada pengelola.';
  description.style.cssText = 'font-size:14px;line-height:1.5;margin:0 0 14px';
  const details = document.createElement('pre');
  details.textContent = message;
  details.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;background:#F2F4F2;padding:12px;border-radius:8px;font-size:12px;max-height:180px;overflow:auto';
  const button = document.createElement('button');
  button.textContent = 'Muat Ulang Aplikasi';
  button.style.cssText = 'margin-top:12px;background:#00433C;color:white;border:0;border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer';
  button.onclick = () => window.location.reload();
  card.append(title, description, details, button);
  panel.append(card);
  rootElement.append(panel);
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
            <p className="mt-2 text-sm text-gray-700">Halaman gagal ditampilkan. Muat ulang aplikasi. Jika masih terjadi, kirimkan pesan kesalahan di bawah kepada pengelola.</p>
            <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-100 p-3 text-xs">{this.state.error.message}</pre>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-[#00433C] px-4 py-2 text-sm font-semibold text-white">Muat Ulang Aplikasi</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<main style="padding:24px;font-family:sans-serif">Elemen aplikasi (#root) tidak ditemukan. Silakan muat ulang halaman.</main>';
} else {
  const root: Root = createRoot(rootElement);
  import('./App.tsx')
    .then(({ default: App }) => {
      root.render(
        <React.StrictMode>
          <AppErrorBoundary><App /></AppErrorBoundary>
        </React.StrictMode>
      );
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.stack || error.message : String(error);
      console.error('Gagal memuat modul KasSekolah:', error);
      showStartupError(message);
    });
}
