import { useMemo } from 'react';

function splitMentions(text) {
  if (text == null || text === '') return [{ type: 'text', text: '' }];
  const source = typeof text === 'string' ? text : String(text);

  const parts = [];
  const regex = /@(destek)\b/gi;
  let lastIndex = 0;
  let match = regex.exec(source);

  while (match) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: source.slice(lastIndex, match.index) });
    }
    const key = match[1]?.toLowerCase();
    if (key) {
      parts.push({
        type: 'mention',
        key,
        label: match[0],
      });
    } else {
      parts.push({ type: 'text', text: match[0] });
    }
    lastIndex = match.index + match[0].length;
    match = regex.exec(source);
  }

  if (lastIndex < source.length) {
    parts.push({ type: 'text', text: source.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', text: source }];
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
