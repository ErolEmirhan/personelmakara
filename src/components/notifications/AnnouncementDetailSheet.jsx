import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import { StaffAvatar } from '../ui/StaffAvatar';
import { Modal } from '../ui/Modal';
import { useBackHandler } from '../../hooks/useBackButton';
import {
  addAnnouncementComment,
  deleteStaffAnnouncement,
  subscribeAnnouncementComments,
} from '../../services/firebaseService';
import { formatLastSeen } from '../../utils/formatLastSeen';
import { canSendStaffAnnouncements } from '../../utils/staffRole';

function buildCommentThreads(comments) {
  const topLevel = [];
  const repliesByParent = new Map();

  comments.forEach((comment) => {
    if (comment.parentCommentId) {
      const list = repliesByParent.get(comment.parentCommentId) || [];
      list.push(comment);
      repliesByParent.set(comment.parentCommentId, list);
    } else {
      topLevel.push(comment);
    }
  });

  return topLevel.map((comment) => ({
    ...comment,
    replies: (repliesByParent.get(comment.id) || []).sort(
      (a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0)
    ),
  }));
}

function CommentBubble({ comment, accent, compact = false }) {
  const timeLabel = comment.createdAtMs ? formatLastSeen(comment.createdAtMs) : '';

  return (
    <div className={`flex gap-2.5 ${compact ? 'py-2' : 'py-2.5'}`}>
      <StaffAvatar
        name={comment.staffName}
        surname={comment.staffSurname}
        profileImageSrc={comment.profileImageSrc}
        isManager={comment.isManager}
        isChef={comment.isChef}
        isAdmin={comment.isAdmin}
        isBoss={comment.isBoss}
        size="xs"
        accent={accent}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-slate-900">
            {comment.staffName} {comment.staffSurname}
          </span>
          {comment.isReply && (
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded-full"
              style={{ backgroundColor: `${accent}12`, color: accent }}
            >
              Yanıt
            </span>
          )}
          {timeLabel && (
            <span className="text-[10px] text-slate-400">{timeLabel}</span>
          )}
        </div>
        {comment.isReply && (comment.replyToStaffName || comment.replyToStaffSurname) && (
          <p className="text-[11px] text-slate-400 mt-0.5">
            @{comment.replyToStaffName} {comment.replyToStaffSurname}
          </p>
        )}
        <p className="text-sm text-slate-600 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
          {comment.text}
        </p>
      </div>
    </div>
  );
}

function CommentThread({
  thread,
  accent,
  accentSolid,
  canReply,
  replyTargetId,
  replyText,
  sendingReply,
  onStartReply,
  onCancelReply,
  onReplyTextChange,
  onSendReply,
}) {
  const isReplying = replyTargetId === thread.id;

  return (
    <div className="py-1">
      <CommentBubble comment={thread} accent={accent} />
      {thread.replies.length > 0 && (
        <div className="ml-8 pl-3 border-l-2 border-slate-100 space-y-0.5">
          {thread.replies.map((reply) => (
            <CommentBubble key={reply.id} comment={reply} accent={accent} compact />
          ))}
        </div>
      )}
      {canReply && (
        <div className="ml-8 mt-1">
          {!isReplying ? (
            <button
              type="button"
              onClick={() => onStartReply(thread)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg active:scale-[0.98] transition-transform"
              style={{ color: accentSolid, backgroundColor: `${accentSolid}10` }}
            >
              Yanıtla
            </button>
          ) : (
            <div
              className="rounded-xl border p-2.5 space-y-2"
              style={{ borderColor: `${accentSolid}25`, backgroundColor: `${accentSolid}06` }}
            >
              <p className="text-[11px] font-medium text-slate-500">
                {thread.staffName} {thread.staffSurname} yorumuna yanıt
              </p>
              <textarea
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                placeholder="Yanıtınızı yazın…"
                rows={2}
                maxLength={500}
                autoFocus
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="flex-1 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-45 active:scale-[0.99] transition-all"
                  style={{ backgroundColor: accentSolid }}
                >
                  {sendingReply ? 'Gönderiliyor…' : 'Yanıt gönder'}
                </button>
                <button
                  type="button"
                  onClick={onCancelReply}
                  disabled={sendingReply}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold disabled:opacity-45"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AnnouncementDetailSheet({ announcement, open, onClose }) {
  const { staff } = useAuth();
  const { theme } = useBranch();
  const { showToast } = useApp();
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const scrollRef = useRef(null);
  const endRef = useRef(null);

  const isAuthor = staff && announcement
    && String(staff.id) === String(announcement.authorStaffId);
  const canReply = canSendStaffAnnouncements(staff);
  const commentThreads = useMemo(() => buildCommentThreads(comments), [comments]);
  const topLevelCount = commentThreads.length;

  useEffect(() => {
    if (!open || !announcement?.id) {
      setComments([]);
      setLoadingComments(true);
      setReplyTarget(null);
      setReplyText('');
      return undefined;
    }
    setLoadingComments(true);
    const unsub = subscribeAnnouncementComments(announcement.id, (list) => {
      setComments(list);
      setLoadingComments(false);
    });
    return unsub;
  }, [open, announcement?.id]);

  useEffect(() => {
    if (!open || loadingComments) return undefined;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, loadingComments, comments.length]);

  useBackHandler(open && !showDeleteConfirm && !replyTarget, onClose);
  useBackHandler(showDeleteConfirm, () => setShowDeleteConfirm(false));
  useBackHandler(!!replyTarget, () => {
    setReplyTarget(null);
    setReplyText('');
  });

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSendComment = async () => {
    if (!staff || !announcement?.id || !commentText.trim() || sending) return;
    setSending(true);
    try {
      await addAnnouncementComment(announcement.id, staff, commentText);
      setCommentText('');
    } catch (err) {
      showToast('error', 'Hata', err.message || 'Yorum eklenemedi');
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async () => {
    if (!staff || !announcement?.id || !replyTarget || !replyText.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      await addAnnouncementComment(announcement.id, staff, replyText, {
        parentCommentId: replyTarget.id,
        replyToStaffName: replyTarget.staffName,
        replyToStaffSurname: replyTarget.staffSurname,
      });
      setReplyTarget(null);
      setReplyText('');
    } catch (err) {
      showToast('error', 'Hata', err.message || 'Yanıt gönderilemedi');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!staff || !announcement?.id || deleting) return;
    setDeleting(true);
    try {
      await deleteStaffAnnouncement(announcement.id, staff);
      showToast('success', 'Silindi', 'Bildirim kaldırıldı');
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      showToast('error', 'Hata', err.message || 'Bildirim silinemedi');
    } finally {
      setDeleting(false);
    }
  };

  if (!open || !announcement) return null;

  const timeLabel = announcement.createdAtMs
    ? formatLastSeen(announcement.createdAtMs)
    : '';
  const accentSolid = theme.accentSolid;

  return (
    <div className="fixed inset-0 z-[8500]" role="dialog" aria-modal="true" aria-label="Bildirim detayı">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="Kapat"
      />

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col max-h-[min(90dvh,760px)] bg-white rounded-t-[1.75rem] shadow-[0_-24px_64px_rgba(15,23,42,0.18)] safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0 relative">
          <div className="w-10 h-1 rounded-full bg-slate-200" aria-hidden />
          {isAuthor && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="absolute right-4 top-2 w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Bildirimi sil"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-2 pb-3">
          <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
            <StaffAvatar
              name={announcement.authorName}
              surname={announcement.authorSurname}
              profileImageSrc={announcement.authorProfileImageSrc}
              isManager={announcement.authorIsManager}
              isChef={announcement.authorIsChef}
              isAdmin={announcement.authorIsAdmin}
              isBoss={announcement.authorIsBoss}
              size="sm"
              accent={theme.accent}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 text-sm">
                  {announcement.authorName} {announcement.authorSurname}
                </p>
                {timeLabel && (
                  <span className="text-[10px] text-slate-400">{timeLabel}</span>
                )}
              </div>
              <span
                className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${accentSolid}12`,
                  color: accentSolid,
                }}
              >
                Yönetici
              </span>
              {announcement.title && (
                <h2 className="font-display font-bold text-lg text-slate-900 mt-2 leading-tight">
                  {announcement.title}
                </h2>
              )}
              <p className="text-sm text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap">
                {announcement.message}
              </p>
            </div>
          </div>

          <div className="pt-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-2">
              Yorumlar {topLevelCount > 0 ? `(${topLevelCount})` : ''}
            </p>
            {loadingComments ? (
              <div className="flex justify-center py-8">
                <span className="w-6 h-6 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : commentThreads.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Henüz yorum yok. İlk yorumu siz ekleyin.
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {commentThreads.map((thread) => (
                  <CommentThread
                    key={thread.id}
                    thread={thread}
                    accent={theme.accent}
                    accentSolid={accentSolid}
                    canReply={canReply}
                    replyTargetId={replyTarget?.id}
                    replyText={replyText}
                    sendingReply={sendingReply}
                    onStartReply={(target) => {
                      setReplyTarget(target);
                      setReplyText('');
                    }}
                    onCancelReply={() => {
                      setReplyTarget(null);
                      setReplyText('');
                    }}
                    onReplyTextChange={setReplyText}
                    onSendReply={handleSendReply}
                  />
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
          <p className="text-[10px] text-slate-400 mb-2">
            {canReply
              ? 'Yorum ekleyebilir ve gelen yorumlara yanıt verebilirsiniz.'
              : 'Yorum ekleyebilirsiniz. Yanıtlar yönetici tarafından yazılır.'}
          </p>
          <div className="flex gap-2 items-end">
            {staff && (
              <StaffAvatar
                name={staff.name}
                surname={staff.surname}
                profileImageSrc={staff.profileImageSrc}
                isManager={staff.is_manager}
                isChef={staff.is_chef}
                isAdmin={staff.is_admin}
                isBoss={staff.is_boss}
                size="xs"
                accent={theme.accent}
              />
            )}
            <div className="flex-1 min-w-0">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Yorum yaz…"
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSendComment}
              disabled={!commentText.trim() || sending}
              className="shrink-0 w-10 h-10 rounded-xl text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
              style={{ backgroundColor: accentSolid }}
              aria-label="Yorum gönder"
            >
              {sending ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Bildirimi Sil">
        <p className="text-gray-600 mt-2 mb-2 leading-relaxed">
          Bu bildirimi ve tüm yorumları kalıcı olarak silmek istediğinize emin misiniz?
        </p>
        <p className="text-xs text-gray-400 mb-6">Bu işlem geri alınamaz.</p>
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
            onClick={() => setShowDeleteConfirm(false)}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold disabled:opacity-60"
          >
            Vazgeç
          </button>
        </div>
      </Modal>
    </div>
  );
}
