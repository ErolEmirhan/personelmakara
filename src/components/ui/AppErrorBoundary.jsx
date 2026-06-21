import { Component } from 'react';
import { isChunkLoadError, redirectToCacheReset } from '../../utils/chunkLoadRecovery';

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('App render error:', error);
    if (isChunkLoadError(error?.message || String(error))) {
      redirectToCacheReset();
    }
  }

  handleReset = () => {
    redirectToCacheReset();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[100dvh] min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-[#f5f3ff] text-slate-900 text-center">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center text-2xl mb-4">
          !
        </div>
        <h1 className="font-bold text-lg mb-2">Bir hata oluştu</h1>
        <p className="text-sm text-slate-500 leading-relaxed max-w-xs mb-6">
          Uygulama beklenmedik şekilde durdu. Bu genelde eski önbellekten kaynaklanır.
          Aşağıdaki düğmeyle önbelleği temizleyip yeniden deneyin.
        </p>
        {this.state.error?.message && (
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mb-4 font-mono break-all">
            {this.state.error.message}
          </p>
        )}
        <button
          type="button"
          onClick={this.handleReset}
          className="px-5 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm active:scale-[0.98] transition-transform"
        >
          Önbelleği temizle ve yenile
        </button>
      </div>
    );
  }
}
