import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { deleteStaffMember } from '../../services/firebaseService';

export function StaffDeleteModal({ open, onClose, member, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!member) return null;

  const displayName = `${member.name || ''} ${member.surname || ''}`.trim();

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await deleteStaffMember(member.id);
      onDeleted?.(member.id);
      onClose();
    } catch {
      setError('Personel silinemedi');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Personeli Sil">
      <p className="text-gray-600 mt-2 mb-2 leading-relaxed">
        <span className="font-semibold text-gray-900">{displayName}</span>
        {' '}
        adlı personeli kalıcı olarak silmek istediğinize emin misiniz?
      </p>
      <p className="text-xs text-gray-400 mb-6">
        Bu işlem geri alınamaz. Personel tekrar giriş yapamaz.
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-600 font-medium">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-60"
        >
          {deleting ? 'Siliniyor…' : 'Sil'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold"
        >
          İptal
        </button>
      </div>
    </Modal>
  );
}
