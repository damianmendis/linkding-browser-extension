import React from 'react';
import styles from './BookmarkRow.module.css';
import { TagChip } from './TagChip';
import type { Bookmark } from '../lib/types';

const MAX_VISIBLE_TAGS = 3;

interface BookmarkRowProps {
  bookmark: Bookmark;
  isActive: boolean;
  titleMatchIndex: number;
  titleMatchLength: number;
  onOpen: (bm: Bookmark) => void;
  onEdit: (bm: Bookmark) => void;
  onFilterTag?: (tag: string) => void;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function HighlightedTitle({
  title,
  matchIndex,
  matchLength,
}: {
  title: string;
  matchIndex: number;
  matchLength: number;
}) {
  if (matchIndex === -1 || matchLength === 0) {
    return <>{title}</>;
  }
  const before = title.slice(0, matchIndex);
  const match = title.slice(matchIndex, matchIndex + matchLength);
  const after = title.slice(matchIndex + matchLength);
  return (
    <>
      {before}
      <mark className={styles.highlight}>{match}</mark>
      {after}
    </>
  );
}

export const BookmarkRow = React.forwardRef<HTMLDivElement, BookmarkRowProps>(
  (
    {
      bookmark,
      isActive,
      titleMatchIndex,
      titleMatchLength,
      onOpen,
      onEdit,
      onFilterTag,
    },
    ref
  ) => {
    const visibleTags = bookmark.tagNames.slice(0, MAX_VISIBLE_TAGS);
    const hiddenCount = bookmark.tagNames.length - visibleTags.length;

    return (
      <div
        ref={ref}
        className={`${styles.row} ${isActive ? styles.active : ''}`}
        role="option"
        aria-selected={isActive}
        onClick={() => onOpen(bookmark)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen(bookmark);
        }}
        tabIndex={-1}
      >
        <div className={styles.content}>
          <div className={styles.titleRow}>
            <span className={styles.title}>
              <HighlightedTitle
                title={bookmark.title || bookmark.url}
                matchIndex={titleMatchIndex}
                matchLength={titleMatchLength}
              />
            </span>
          </div>
          <div className={styles.meta}>
            <span className={styles.host}>{getHostname(bookmark.url)}</span>
          </div>
          {visibleTags.length > 0 && (
            <div className={styles.tags}>
              {visibleTags.map((tag) => (
                <TagChip
                  key={tag}
                  label={tag}
                  onClick={
                    onFilterTag
                      ? (e?: React.MouseEvent) => {
                          e?.stopPropagation();
                          onFilterTag(tag);
                        }
                      : undefined
                  }
                />
              ))}
              {hiddenCount > 0 && (
                <span className={styles.moreTag}>+{hiddenCount}</span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className={styles.editBtn}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(bookmark);
          }}
          aria-label={`Edit bookmark: ${bookmark.title || bookmark.url}`}
          tabIndex={-1}
        >
          ✏
        </button>
      </div>
    );
  }
);

BookmarkRow.displayName = 'BookmarkRow';
