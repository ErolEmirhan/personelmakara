import { useMemo } from 'react';

const MENTION_REGEX = /@(destek)\b/gi;

function splitMentions(text) {
  if (!text) return [{ type: 'text', text: '' }];

  const parts = [];
  let lastIndex = 0;
  let match = MENTION_REGEX.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'mention',
      key: match[1].toLowerCase(),
      label: match[0],
    });
    lastIndex = match.index + match[0].length;
    match = MENTION_REGEX.exec(text);
  }

  MENTION_REGEX.lastIndex = 0;

  if (lastIndex < text.length) {
    parts.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', text }];
}

function openSupportFromMention() {
  window.dispatchEvent(
    new CustomEvent('makara-open-support', {
      detail: { ticketId: null },
    })
  );
}

export function AnnouncementRichText({
  text,
  accentSolid = '#7c3aed',
  className = '',
  onMentionNavigate,
}) {
  const parts = useMemo(() => splitMentions(text), [text]);

  const handleMentionClick = (event, key) => {
    event.preventDefault();
    event.stopPropagation();
    if (key === 'destek') {
      openSupportFromMention();
      onMentionNavigate?.();
    }
  };

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <button
              key={`m-${index}`}
              type="button"
              onClick={(event) => handleMentionClick(event, part.key)}
              className="inline font-semibold underline decoration-2 underline-offset-2 rounded px-0.5 -mx-0.5 active:scale-[0.98] transition-transform"
              style={{
                color: accentSolid,
                textDecorationColor: `${accentSolid}55`,
              }}
              aria-label="Destek bölümünü aç"
            >
              {part.label}
            </button>
          );
        }
        return <span key={`t-${index}`}>{part.text}</span>;
      })}
    </span>
  );
}
