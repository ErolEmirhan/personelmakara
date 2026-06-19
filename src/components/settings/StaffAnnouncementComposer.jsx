import { useState } from 'react';
import { createStaffAnnouncement } from '../../services/firebaseService';
import { sendAnnouncementPush } from '../../services/pushNotifications';

export function StaffAnnouncementComposer({ branchKey, staff, theme, showToast }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const trimmedTitle = title.trim();
      const trimmedMessage = message.trim();
      const result = await createStaffAnnouncement(branchKey, staff, {
        title: trimmedTitle,
        message: trimmedMessage,
      });
      setTitle('');
      setMessage('');

      try {
        const pushResult = await sendAnnouncementPush({
          branchKey,
          staffId: staff.id,
          title: trimmedTitle,
          message: trimmedMessage,
          announcementId: result.id,
        });
        const sent = pushResult?.sent ?? 0;
        showToast(
          'success',
          'Gönderildi',
          sent > 0
            ? `Bildirim uygulamada ve ${sent} cihaza push olarak iletildi`
            : 'Bildirim uygulamada görünür (henüz push kayıtlı cihaz yok)'
        );
      } catch {
        showToast(
          'success',
          'Gönderildi',
          'Bildirim uygulamada görünür; push gönderimi başarısız oldu'
        );
      }
    } catch (err) {
      showToast('error', 'Hata', err.message || 'Bildirim gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 leading-relaxed">
        Gönderdiğiniz bildirim uygulamada görünür; izin veren personelin telefonuna push gider.
      </p>
      <label className="block">
        <span className="text-xs font-semibold text-slate-500">Başlık (isteğe bağlı)</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Örn. Servis notu"
          maxLength={120}
          className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-300 focus:bg-white transition-colors"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-slate-500">Mesaj</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ekibe iletmek istediğiniz bildirimi yazın…"
          rows={4}
          maxLength={1000}
          className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-300 focus:bg-white transition-colors resize-none"
        />
        <span className="text-[10px] text-slate-400 mt-1 block text-right">{message.length}/1000</span>
      </label>
      <button
        type="button"
        onClick={handleSend}
        disabled={!message.trim() || sending}
        className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-45 active:scale-[0.99] transition-all"
        style={{ background: `linear-gradient(135deg, ${theme.accentSolid} 0%, ${theme.accentSolid}cc 100%)` }}
      >
        {sending ? 'Gönderiliyor…' : 'Bildirim gönder'}
      </button>
    </div>
  );
}
