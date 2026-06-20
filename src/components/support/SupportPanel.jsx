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
import { StaffAvatar } from '../ui/StaffAvatar';

function FlagIcon({ className = 'w-5 h-5' }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
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

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

function MessageBubble({ message, isOwn, accentSolid, fallbackProfileSrc }) {
  const time = message.createdAtMs ? formatLastSeen(message.createdAtMs) : '';
  const profileSrc = message.profileImageSrc || fallbackProfileSrc || null;
  const displayName = `${message.staffName} ${message.staffSurname}`.trim();

  if (message.isAdmin) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm bg-white border border-slate-100 text-slate-800">
          <p className="text-[10px] font-bold mb-1 text-violet-600">Admin</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
          {time && <p className="text-[9px] mt-1.5 text-slate-400">{time}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2.5 mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <StaffAvatar
          size="2xs"
          name={message.staffName}
          surname={message.staffSurname}
          profileImageSrc={profileSrc}
        />
      )}
      <div className={`flex flex-col max-w-[78%] min-w-0 ${isOwn ? 'items-end' : 'items-start'}`}>
        <p className={`text-[10px] font-semibold text-slate-500 mb-1 px-0.5 ${isOwn ? 'text-right' : 'text-left'}`}>
          {displayName}
        </p>
        <div
          className={`rounded-2xl px-3.5 py-2.5 shadow-sm ${
            isOwn
              ? 'rounded-br-md text-white'
              : 'rounded-bl-md bg-white border border-slate-100 text-slate-800'
          }`}
          style={isOwn ? { background: `linear-gradient(135deg, ${accentSolid} 0%, ${accentSolid}dd 100%)` } : undefined}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
          {time && (
            <p className={`text-[9px] mt-1.5 ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>{time}</p>
          )}
        </div>
      </div>
      {isOwn && (
        <StaffAvatar
          size="2xs"
          name={message.staffName}
          surname={message.staffSurname}
          profileImageSrc={profileSrc}
        />
      )}
    </div>
  );
}

function ComposerBar({ value, onChange, onSend, sending, placeholder, accentSolid }) {
  return (
    <div className="shrink-0 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="flex gap-2 items-end">
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
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
          disabled={!value.trim() || sending}
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
  );
}

function ResolvedStamp({ resolvedByName }) {
  return (
    <div className="shrink-0 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-emerald-100 bg-gradient-to-b from-white via-emerald-50/30 to-emerald-50/70">
      <div className="relative w-full min-h-[112px] py-7 px-5 rounded-3xl border-2 border-emerald-200/90 bg-emerald-50 flex flex-col items-center justify-center text-center overflow-hidden shadow-inner">
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          aria-hidden
        >
          <span className="text-[3.25rem] font-black uppercase tracking-[0.18em] text-emerald-600/10 rotate-[-14deg]">
            Çözüldü
          </span>
        </div>
        <div className="relative z-10 w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-2.5 shadow-lg shadow-emerald-500/30">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="relative z-10 text-lg font-black uppercase tracking-[0.12em] text-emerald-800">Çözüldü</p>
        <p className="relative z-10 text-[11px] text-emerald-700/75 mt-1.5 max-w-[240px] leading-relaxed">
          {resolvedByName ? `${resolvedByName} tarafından kapatıldı` : 'Bu konuşma sonlandırıldı'}
        </p>
      </div>
    </div>
  );
}

function NewTicketView({ category, setCategory, text, setText, sending, onSubmit, accentSolid }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5">
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

      <ComposerBar
        value={text}
        onChange={(e) => setText(e.target.value)}
        onSend={onSubmit}
        sending={sending}
        placeholder="Sorununuzu veya önerinizi yazın…"
        accentSolid={accentSolid}
      />
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
  const staffProfileFallback = ticket.staffProfileImageSrc || null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.staffId === staff.id}
            accentSolid={accentSolid}
            fallbackProfileSrc={
              msg.staffId === staff.id
                ? staff.profileImageSrc || staffProfileFallback
                : staffProfileFallback
            }
          />
        ))}
      </div>

      {canSend && (
        <>
          {isAdmin && (
            <div className="shrink-0 px-4 pb-2">
              <button
                type="button"
                onClick={onResolve}
                disabled={resolving}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {resolving ? 'Kaydediliyor…' : 'Çözüldü olarak işaretle'}
              </button>
            </div>
          )}
          <ComposerBar
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onSend={onSend}
            sending={sending}
            placeholder="Mesajınızı yazın…"
            accentSolid={accentSolid}
          />
        </>
      )}

      {isResolved && <ResolvedStamp resolvedByName={ticket.resolvedByName} />}
    </div>
  );
}

export function SupportFlagButton({ onClick, badgeCount = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative shrink-0 w-10 h-10 rounded-2xl bg-white border border-slate-200/80 text-slate-500 flex items-center justify-center active:scale-[0.96] transition-transform shadow-sm"
      aria-label="Destek ve geri bildirim"
      title="Destek"
    >
      <FlagIcon className="w-[18px] h-[18px]" />
      {badgeCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </button>
  );
}

export function SupportPanel({ open, onClose, initialTicketId = null }) {
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

    setView(isAdmin ? 'list' : 'new');
    setSelectedTicket(null);
    setNewText('');
    setError('');

    try {
      history.pushState({ makaraSupport: true }, '');
    } catch {
      /* ignore */
    }

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

  useEffect(() => {
    if (!open || !initialTicketId || !tickets.length) return;
    const ticket = tickets.find((t) => t.id === initialTicketId);
    if (ticket) {
      setSelectedTicket(ticket);
      setView('chat');
      setDraft('');
      setError('');
    }
  }, [open, initialTicketId, tickets]);

  const filteredTickets = useMemo(() => {
    if (!isAdmin) return tickets;
    if (adminTab === 'open') {
      return tickets.filter((t) => t.status === SUPPORT_STATUS.OPEN);
    }
    return tickets.filter((t) => t.status === SUPPORT_STATUS.RESOLVED);
  }, [tickets, isAdmin, adminTab]);

  const handleBack = () => {
    if (view === 'chat') {
      setView(isAdmin ? 'list' : tickets.length > 0 ? 'list' : 'new');
      setSelectedTicket(null);
      setError('');
      return;
    }
    onClose();
  };

  const handleClose = () => {
    onClose();
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
      ? 'Sorun Bildir'
      : view === 'chat' && selectedTicket
        ? supportCategoryLabel(selectedTicket.category)
        : isAdmin
          ? 'Destek merkezi'
          : 'Geçmiş konuşmalar';

  const headerSubtitle =
    view === 'chat' && selectedTicket && isAdmin
      ? `${selectedTicket.staffName} ${selectedTicket.staffSurname}`
      : view === 'list' && isAdmin
        ? `${filteredTickets.length} konuşma`
        : '';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f4f6fa]" role="dialog" aria-modal="true">
      <div className="shrink-0 pt-[env(safe-area-inset-top,0px)] bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.12)]">
        <div className="relative flex items-center justify-between px-4 h-14">
          <button
            type="button"
            onClick={handleBack}
            className="relative z-10 shrink-0 w-10 h-10 rounded-2xl bg-slate-100/90 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
            aria-label={view === 'chat' ? 'Geri' : 'Uygulamaya dön'}
          >
            <BackIcon />
          </button>

          <div className="pointer-events-none absolute inset-x-0 flex justify-center px-[calc(5rem+1rem)]">
            <div className="min-w-0 flex items-center gap-2.5 max-w-full">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${accentSolid}, ${accentSolid}bb)` }}
              >
                <FlagIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-center">
                <h2 className="font-display font-bold text-base text-slate-900 truncate leading-tight">
                  {headerTitle}
                </h2>
                {headerSubtitle && (
                  <p className="text-[11px] text-slate-500 truncate">{headerSubtitle}</p>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 shrink-0">
            {view === 'new' && !isAdmin && tickets.length > 0 && (
              <button
                type="button"
                onClick={() => { setView('list'); setError(''); }}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 text-slate-600 active:scale-95 transition-transform"
              >
                Geçmiş
              </button>
            )}

            {view === 'list' && !isAdmin && (
              <button
                type="button"
                onClick={() => { setView('new'); setError(''); }}
                className="text-xs font-bold px-3 py-2 rounded-xl text-white active:scale-95 transition-transform"
                style={{ background: accentSolid }}
              >
                Yeni
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 w-10 h-10 rounded-2xl bg-slate-100/90 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
              aria-label="Kapat"
              title="Uygulamaya dön"
            >
              <CloseIcon />
            </button>
          </div>
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
                <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-500 mb-4">
                  <FlagIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {isAdmin ? 'Henüz bildirim yok' : 'Geçmiş konuşma yok'}
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
                  {isAdmin
                    ? 'Personel sorun veya öneri bildirdiğinde burada görünür.'
                    : 'Yeni bir konu başlatmak için geri dönün ve mesajınızı yazın.'}
                </p>
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
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
