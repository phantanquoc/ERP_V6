import { FileText, Paperclip } from 'lucide-react';
import { getFileUrl } from '../../config/api';

/**
 * Anything carrying attachments: the multi-file column plus the legacy single-file
 * one kept on older rows (YCCC/YCBS/YCMH all followed that migration path).
 */
export interface AttachmentSource {
  tepDinhKem?: string[] | null;
  fileKemTheo?: string | null;
}

/** Flatten one or more sources into a de-duplicated URL list, order preserved. */
export const collectAttachments = (
  ...sources: (AttachmentSource | null | undefined)[]
): string[] => {
  const urls: string[] = [];
  const push = (u?: string | null): void => {
    if (u && !urls.includes(u)) urls.push(u);
  };
  for (const src of sources) {
    if (!src) continue;
    (src.tepDinhKem ?? []).forEach(push);
    push(src.fileKemTheo);
  }
  return urls;
};

export const fileNameOf = (url: string): string => String(url.split('/').pop() ?? url);

interface Props {
  urls: string[];
  /** `full` = labelled block for detail views; `chip` = compact cell for table rows. */
  variant?: 'full' | 'chip';
  label?: string;
  /** Shown in `full` variant when there is nothing attached; hidden entirely if omitted. */
  emptyText?: string;
  className?: string;
}

const AttachmentList = ({ urls, variant = 'full', label = 'File đính kèm', emptyText, className = '' }: Props) => {
  if (urls.length === 0) {
    if (variant === 'chip') return <span className="text-gray-300">—</span>;
    if (!emptyText) return null;
    return (
      <div className={className}>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-sm italic text-gray-400">{emptyText}</p>
      </div>
    );
  }

  // Compact: a paperclip plus one numbered link per file — fits a table column and
  // still lets the reviewer open any file without drilling into the detail modal.
  if (variant === 'chip') {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`} title={urls.map(fileNameOf).join('\n')}>
        <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        {urls.map((url, i) => (
          <a
            key={url}
            href={getFileUrl(url)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={fileNameOf(url)}
            className="rounded bg-blue-50 px-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 hover:underline"
          >
            {i + 1}
          </a>
        ))}
      </span>
    );
  }

  return (
    <div className={className}>
      <p className="mb-1.5 text-xs font-medium text-gray-500">
        {label} ({urls.length})
      </p>
      <ul className="space-y-1.5">
        {urls.map((url, i) => (
          <li key={url}>
            <a
              href={getFileUrl(url)}
              target="_blank"
              rel="noreferrer"
              title={`Mở ${fileNameOf(url)} trong tab mới`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {i + 1}. {fileNameOf(url)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AttachmentList;
