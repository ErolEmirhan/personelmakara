import { Component } from 'react';
import {
  isRecoverableDeployError,
  redirectToCacheReset,
} from '../../utils/chunkLoadRecovery';
import { persistAppError, readLastAppError } from '../../utils/appErrorLog';

function RecoveryOverlay() {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#f5f3ff] text-slate-900 px-6 text-center">
      <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-5" />
      <h1 className="font-bold text-lg mb-2">Güncelleniyor</h1>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
        Uygulama önbelleği yenileniyor. Birkaç saniye içinde hazır olacak.
      </p>
    </div>
  );
}

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, recovering: false, retryKey: 0 };
    this.retryTimer = null;
    this.hasRetried = false;
  }

  static getDerivedStateFromError(error) {
    if (isRecoverableDeployError(error)) {
      return { error: null, recovering: true };
    }
    return { error, recovering: false };
  }

  componentDidCatch(error) {
    console.error('App render error:', error);
    persistAppError(error);

    if (isRecoverableDeployError(error)) {
      redirectToCacheReset();
      return;
    }

    if (!this.hasRetried) {
      this.hasRetried = true;
      this.retryTimer = window.setTimeout(() => {
        this.retryTimer = null;
        this.setState((prev) => ({
          error: null,
          recovering: false,
          retryKey: prev.retryKey + 1,
        }));
      }, 120);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  handleReset = () => {
    redirectToCacheReset();
  };

  render() {
    if (this.state.recovering) {
      return <RecoveryOverlay />;
    }

    if (!this.state.error) {
      return (
        <div key={this.state.retryKey}>
          {this.props.children}
        </div>
      );
    }

    const lastError = readLastAppError();

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
        {(this.state.error?.message || lastError?.message) && (
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mb-4 font-mono break-all">
            {this.state.error?.message || lastError?.message}
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
