import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { StaffAvatar } from '../ui/StaffAvatar';
import {
  updateStaffMemberProfile,
  updateStaffMemberRoles,
} from '../../services/firebaseService';

function RoleToggle({ label, description, checked, onChange, disabled }) {
  return (
    <label
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-colors ${
        disabled
          ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
          : checked
            ? 'bg-violet-50 border-violet-200'
            : 'bg-white border-gray-100'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-violet-500' : 'bg-gray-200'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

function FieldInput({ label, value, onChange, placeholder, type = 'text', autoComplete = 'off' }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
      />
    </label>
  );
}

export function StaffAssignModal({ open, onClose, member, branchKey, accent, onSaved }) {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBoss, setIsBoss] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isChef, setIsChef] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const showChef = branchKey === 'makara';

  useEffect(() => {
    if (!open || !member) return;
    setName(member.name || '');
    setSurname(member.surname || '');
    setPassword('');
    setIsAdmin(!!member.is_admin);
    setIsBoss(!!member.is_boss);
    setIsManager(!!member.is_manager);
    setIsChef(!!member.is_chef);
    setError('');
  }, [open, member]);

  const handleSave = async () => {
    if (!member) return;
    const trimmedName = name.trim();
    const trimmedSurname = surname.trim();
    if (!trimmedName || !trimmedSurname) {
      setError('Ad ve soyad zorunludur');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateStaffMemberProfile(member.id, {
        name: trimmedName,
        surname: trimmedSurname,
        password,
      });
      await updateStaffMemberRoles(branchKey, member.id, {
        is_admin: isAdmin,
        is_boss: isBoss,
        is_manager: isManager,
        is_chef: isChef,
      });
      onSaved?.({
        ...member,
        name: trimmedName,
        surname: trimmedSurname,
        is_admin: isAdmin,
        is_boss: isBoss,
        is_manager: isManager,
        is_chef: showChef ? isChef : false,
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Kayıt güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  if (!member) return null;

  return (
    <Modal open={open} onClose={onClose} title="Personel Düzenle">
      <div className="flex items-center gap-3 mt-2 mb-5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
        <StaffAvatar
          name={name || member.name}
          surname={surname || member.surname}
          profileImageSrc={member.profileImageSrc}
          isManager={isManager}
          isChef={isChef}
          isAdmin={isAdmin}
          isBoss={isBoss}
          size="md"
          accent={accent}
        />
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {name.trim() || member.name} {surname.trim() || member.surname}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Profil bilgileri ve roller</p>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <FieldInput label="Ad" value={name} onChange={setName} placeholder="Ad" autoComplete="given-name" />
        <FieldInput label="Soyad" value={surname} onChange={setSurname} placeholder="Soyad" autoComplete="family-name" />
        <FieldInput
          label="Yeni şifre"
          value={password}
          onChange={setPassword}
          placeholder="Değiştirmek için girin"
          type="password"
          autoComplete="new-password"
        />
        <p className="text-[11px] text-gray-400 -mt-1">Şifre alanını boş bırakırsanız mevcut şifre korunur.</p>
      </div>

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Roller</p>
      <div className="space-y-2.5">
        <RoleToggle
          label="Admin"
          description="Personel yönetimi ve tüm müdür yetkileri"
          checked={isAdmin}
          onChange={setIsAdmin}
        />
        <RoleToggle
          label="Patron"
          description="İşletme sahibi ünvanı — listede admin altında"
          checked={isBoss}
          onChange={setIsBoss}
        />
        <RoleToggle
          label="Müdür"
          description="Aynı anda yalnızca bir müdür atanabilir"
          checked={isManager}
          onChange={(val) => {
            setIsManager(val);
            if (val) setIsChef(false);
          }}
        />
        {showChef && (
          <RoleToggle
            label="Şef"
            description="Mevcut sipariş iptali yetkisi (Makara)"
            checked={isChef}
            onChange={(val) => {
              setIsChef(val);
              if (val) setIsManager(false);
            }}
          />
        )}
        {!showChef && (
          <RoleToggle
            label="Personel"
            description="Standart garson yetkileri"
            checked={!isAdmin && !isBoss && !isManager}
            onChange={(val) => {
              if (val) {
                setIsAdmin(false);
                setIsBoss(false);
                setIsManager(false);
                setIsChef(false);
              }
            }}
          />
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-bold disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold"
        >
          İptal
        </button>
      </div>
    </Modal>
  );
}
