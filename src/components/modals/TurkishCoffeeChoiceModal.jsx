import { Modal } from '../ui/Modal';
import { useBranch } from '../../context/BranchContext';
import { useBackHandler } from '../../hooks/useBackButton';
import {
  COFFEE_SUGAR_OPTIONS,
  getCoffeeModalCopy,
} from '../../utils/productOptions';

export function TurkishCoffeeChoiceModal({ open, product, onSelect, onClose }) {
  const { theme } = useBranch();
  const copy = product ? getCoffeeModalCopy(product.name) : { title: '', subtitle: '' };

  useBackHandler(open, onClose);

  return (
    <Modal open={open} onClose={onClose} title={copy.title}>
      <p className="text-sm text-slate-500 mb-5 leading-relaxed">{copy.subtitle}</p>

      {product && (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          {product.name}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {COFFEE_SUGAR_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`w-full py-4 px-5 rounded-2xl text-base font-bold text-white bg-gradient-to-r ${theme.accent} shadow-float active:scale-[0.98] transition-all duration-ui ease-premium`}
          >
            {option}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full mt-4 py-3 rounded-2xl text-sm font-semibold text-slate-500 active:bg-slate-50 transition-colors"
      >
        Vazgeç
      </button>
    </Modal>
  );
}
