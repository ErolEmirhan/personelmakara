import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useBackHandler } from '../../hooks/useBackButton';
import {
  createSupportTicket,
  resolveSupportTicket,
  sendSupportMessage,
  subscribeBranchSupportTickets,
  subscribeStaffSupportTickets,
  subscribeSupportMessages,
} from '../../services/firebaseService';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_STATUS,
  supportCategoryLabel,
} from '../../constants/supportTickets';
import { isStaffAdmin } from '../../utils/staffRole';
import { formatLastSeen } from '../../utils/formatLastSeen';

function FlagIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18M3 4.5h12.5a1.5 1.5 0 011.5 1.5v0a1.5 1.5 0 001.5 1.5H21V18H6.5a1.5 1.5 0 00-1.5 1.5v0" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function TicketStatusBadge({ status }) {
  if (status === SUPPORT_STATUS.RESOLVED) {
    return (
      <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
        Çözüldü
      </span>
    );
  }
  return (
    <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
      Açık
    </span>
  );
}

function TicketListItem({ ticket, onClick, isAdminView }) {
  const time = ticket.lastMessageAtMs ? formatLastSeen(ticket.lastMessageAtMs) : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 border-b border-slate-100 active:bg-slate-50/80 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-50 flex items-center justify-center text-lg">
          {SUPPORT_CATEGORIES.find((c) => c.id === ticket.category)?.icon || '💬'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">
              {supportCategoryLabel(ticket.category)}
            </span>
            <TicketStatusBadge status={ticket.status} />
            {isAdminView && ticket.needsAdminReply && ticket.status === SUPPORT_STATUS.OPEN && (
              <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" aria-label="Yanıt bekliyor" />
            )}
          </div>
          {isAdminView && (
            <p className="text-xs font-medium text-violet-700 mt-0.5">
              {ticket.staffName} {ticket.staffSurname}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {ticket.status === SUPPORT_STATUS.RESOLVED ? 'Konuşma kapatıldı' : ticket.lastMessage}
          </p>
          {time && <p className="text-[10px] text-slate-400 mt-1">{time}</p>}
        </div>
        <svg className="w-4 h-4 text-slate-300 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function MessageBubble({ message, isOwn, accentSolid }) {
  const time = message.createdAtMs ? formatLastSeen(message.createdAtMs) : '';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
          isOwn
            ? 'rounded-br-md text-white'
            : 'rounded-bl-md bg-white border border-slate-100 text-slate-800'
        }`}
        style={isOwn ? { background: `linear-gradient(135deg, ${accentSolid} 0%, ${accentSolid}dd 100%)` } : undefined}
      >
        {!isOwn && (
          <p className="text-[10px] font-bold mb-1 text-violet-600">
            {message.isAdmin ? 'Admin' : `${message.staffName} ${message.staffSurname}`.trim()}
          </p>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
        {time && (
          <p className={`text-[9px] mt-1.5 ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>{time}</p>
        )}
      </div>
    </div>
  );
}

function NewTicketView({ category, setCategory, text, setText, sending, onSubmit, accentSolid }) {
  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Konu türü</p>
        <div className="grid grid-cols-2 gap-2">
          {SUPPORT_CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`text-left p-3 rounded-2xl border transition-all active:scale-[0.98] ${
                  active
                    ? 'border-violet-300 bg-violet-50 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <p className="text-sm font-semibold text-slate-900 mt-1.5">{cat.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{cat.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Mesajınız</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Sorununuzu veya önerinizi detaylı yazın…"
          rows={5}
          maxLength={2000}
          className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-300 focus:bg-white resize-none transition-colors"
        />
        <span className="text-[10px] text-slate-400 mt-1 block text-right">{text.length}/2000</span>
      </label>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!text.trim() || sending}
        className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-45 active:scale-[0.99] transition-all shadow-lg shadow-violet-500/20"
        style={{ background: `linear-gradient(135deg, ${accentSolid} 0%, ${accentSolid}cc 100%)` }}
      >
        {sending ? 'Gönderiliyor…' : 'Konuşmayı başlat'}
      </button>
    </div>
  );
}

function ChatView({
  ticket,
  messages,
  staff,
  draft,
  setDraft,
  sending,
  resolving,
  onSend,
  onResolve,
  accentSolid,
}) {
  const scrollRef = useRef(null);
  const isAdmin = isStaffAdmin(staff);
  const isResolved = ticket.status === SUPPORT_STATUS.RESOLVED;
  const canSend = !isResolved && (isAdmin || ticket.staffId === staff.id);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {isResolved && (
        <div className="shrink-0 mx-4 mt-3 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">✓</span>
          <div>
            <p className="text-sm font-semibold text-emerald-900">Çözüldü</p>
            <p className="text-xs text-emerald-700/80 mt-0.5">
              {ticket.resolvedByName ? `${ticket.resolvedByName} tarafından kapatıldı` : 'Konuşma sonlandırıldı'}
            </p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.staffId === staff.id}
            accentSolid={accentSolid}
          />
        ))}
      </div>

      {canSend && (
        <div className="shrink-0 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white/95 backdrop-blur-sm">
          <div className="flex gap-2 items-end">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Mesajınızı yazın…"
              rows={1}
              maxLength={2000}
              className="flex-1 min-h-[44px] max-h-28 px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-300 focus:bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!draft.trim() || sending}
              className="shrink-0 w-11 h-11 rounded-2xl text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
              style={{ background: accentSolid }}
              aria-label="Gönder"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {isAdmin && !isResolved && (
        <div className="shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onResolve}
            disabled={resolving}
            className="w-full py-3 rounded-2xl text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {resolving ? 'Kaydediliyor…' : 'Çözüldü olarak işaretle'}
          </button>
        </div>
      )}
    </div>
  );
}

export function SupportFlagButton({ onClick, badgeCount = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative shrink-0 w-10 h-10 rounded-2xl bg-slate-100/90 text-slate-600 flex items-center justify-center active:scale-[0.96] transition-transform"
      aria-label="Destek ve geri bildirim"
      title="Destek"
    >
      <FlagIcon />
      {badgeCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </button>
  );
}

export function SupportPanel({ open, onClose }) {
  const { staff } = useAuth();
  const { theme, branchKey } = useBranch();
  const isAdmin = isStaffAdmin(staff);

  const [view, setView] = useState('list');
  const [tickets, setTickets] = useState([]);
  const [adminTab, setAdminTab] = useState('open');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newCategory, setNewCategory] = useState('issue');
  const [newText, setNewText] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  const accentSolid = theme.accentSolid || '#7c3aed';

  useEffect(() => {
    if (!open || !staff?.id) return undefined;

    setView('list');
    setSelectedTicket(null);
    setError('');

    const unsub = isAdmin
      ? subscribeBranchSupportTickets(branchKey, setTickets)
      : subscribeStaffSupportTickets(staff.id, setTickets);

    return unsub;
  }, [open, staff?.id, branchKey, isAdmin]);

  useEffect(() => {
    if (!selectedTicket?.id) {
      setMessages([]);
      return undefined;
    }
    return subscribeSupportMessages(selectedTicket.id, setMessages);
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (!selectedTicket?.id || !tickets.length) return;
    const fresh = tickets.find((t) => t.id === selectedTicket.id);
    if (fresh) setSelectedTicket(fresh);
  }, [tickets, selectedTicket?.id]);

  const filteredTickets = useMemo(() => {
    if (!isAdmin) return tickets;
    if (adminTab === 'open') {
      return tickets.filter((t) => t.status === SUPPORT_STATUS.OPEN);
    }
    return tickets.filter((t) => t.status === SUPPORT_STATUS.RESOLVED);
  }, [tickets, isAdmin, adminTab]);

  const handleBack = () => {
    if (view === 'chat' || view === 'new') {
      setView('list');
      setSelectedTicket(null);
      setError('');
      return true;
    }
    onClose();
    return true;
  };

  useBackHandler(open, handleBack);

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setView('chat');
    setDraft('');
    setError('');
  };

  const handleCreate = async () => {
    if (!staff || !newText.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const id = await createSupportTicket(branchKey, staff, {
        category: newCategory,
        text: newText.trim(),
      });
      setNewText('');
      setView('chat');
      setSelectedTicket({
        id,
        category: newCategory,
        status: SUPPORT_STATUS.OPEN,
        staffId: staff.id,
        staffName: staff.name,
        staffSurname: staff.surname,
      });
    } catch (err) {
      setError(err.message || 'Gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!staff || !selectedTicket || !draft.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await sendSupportMessage(selectedTicket.id, staff, draft.trim());
      setDraft('');
    } catch (err) {
      setError(err.message || 'Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!staff || !selectedTicket || resolving) return;
    setResolving(true);
    setError('');
    try {
      await resolveSupportTicket(selectedTicket.id, staff);
    } catch (err) {
      setError(err.message || 'Kapatılamadı');
    } finally {
      setResolving(false);
    }
  };

  if (!open || !staff) return null;

  const headerTitle =
    view === 'new'
      ? 'Yeni bildirim'
      : view === 'chat' && selectedTicket
        ? supportCategoryLabel(selectedTicket.category)
        : isAdmin
          ? 'Destek merkezi'
          : 'Geri bildirim';

  const headerSubtitle =
    view === 'chat' && selectedTicket && isAdmin
      ? `${selectedTicket.staffName} ${selectedTicket.staffSurname}`
      : view === 'list' && isAdmin
        ? `${filteredTickets.length} konuşma`
        : '';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f4f6fa]" role="dialog" aria-modal="true">
      <div className="shrink-0 pt-[env(safe-area-inset-top,0px)] bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.12)]">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            type="button"
            onClick={handleBack}
            className="shrink-0 w-10 h-10 rounded-2xl bg-slate-100/90 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
            aria-label="Geri"
          >
            <BackIcon />
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${accentSolid}, ${accentSolid}bb)` }}
            >
              <FlagIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-base text-slate-900 truncate leading-tight">
                {headerTitle}
              </h2>
              {headerSubtitle && (
                <p className="text-[11px] text-slate-500 truncate">{headerSubtitle}</p>
              )}
            </div>
          </div>

          {view === 'list' && !isAdmin && (
            <button
              type="button"
              onClick={() => { setView('new'); setError(''); }}
              className="shrink-0 text-xs font-bold px-3 py-2 rounded-xl text-white active:scale-95 transition-transform"
              style={{ background: accentSolid }}
            >
              Yeni
            </button>
          )}
        </div>

        {view === 'list' && isAdmin && (
          <div className="flex gap-2 px-4 pb-3">
            {[
              { id: 'open', label: 'Açık' },
              { id: 'resolved', label: 'Çözüldü' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAdminTab(tab.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  adminTab === tab.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="shrink-0 mx-4 mt-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto overscroll-contain bg-white mt-2 mx-3 mb-3 rounded-2xl border border-slate-100 shadow-sm">
            {filteredTickets.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-50 flex items-center justify-center text-2xl mb-4">🚩</div>
                <p className="text-sm font-semibold text-slate-900">
                  {isAdmin ? 'Henüz bildirim yok' : 'Geçmiş konuşma yok'}
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
                  {isAdmin
                    ? 'Personel sorun veya öneri bildirdiğinde burada görünür.'
                    : 'Sorun, şikayet, istek veya önerinizi paylaşmak için yeni konuşma başlatın.'}
                </p>
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => setView('new')}
                    className="mt-6 text-sm font-bold px-5 py-2.5 rounded-xl text-white active:scale-95"
                    style={{ background: accentSolid }}
                  >
                    Konuşma başlat
                  </button>
                )}
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <TicketListItem
                  key={ticket.id}
                  ticket={ticket}
                  isAdminView={isAdmin}
                  onClick={() => openTicket(ticket)}
                />
              ))
            )}
          </div>
        )}

        {view === 'new' && (
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <NewTicketView
              category={newCategory}
              setCategory={setNewCategory}
              text={newText}
              setText={setNewText}
              sending={sending}
              onSubmit={handleCreate}
              accentSolid={accentSolid}
            />
          </div>
        )}

        {view === 'chat' && selectedTicket && (
          <ChatView
            ticket={selectedTicket}
            messages={messages}
            staff={staff}
            draft={draft}
            setDraft={setDraft}
            sending={sending}
            resolving={resolving}
            onSend={handleSend}
            onResolve={handleResolve}
            accentSolid={accentSolid}
          />
        )}
      </div>
    </div>
  );
}

export function useSupportBadgeCount(branchKey, staff) {
  const [count, setCount] = useState(0);
  const isAdmin = isStaffAdmin(staff);

  useEffect(() => {
    if (!staff?.id || !isAdmin) {
      setCount(0);
      return undefined;
    }
    return subscribeBranchSupportTickets(branchKey, (tickets) => {
      setCount(tickets.filter((t) => t.status === SUPPORT_STATUS.OPEN && t.needsAdminReply).length);
    });
  }, [branchKey, staff?.id, isAdmin]);

  return count;
}
