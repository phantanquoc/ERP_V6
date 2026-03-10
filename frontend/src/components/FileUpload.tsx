import React, { useRef, useId } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  label?: string;
  helpText?: string;
  existingFileUrl?: string;
  existingFileName?: string;
  onRemoveExisting?: () => void;
  compact?: boolean;
}

const DEFAULT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';

const FileUpload: React.FC<FileUploadProps> = ({
  files,
  onChange,
  multiple = false,
  accept = DEFAULT_ACCEPT,
  maxFiles = 5,
  maxSizeMB = 100,
  disabled = false,
  label,
  helpText,
  existingFileUrl,
  existingFileName,
  onRemoveExisting,
  compact = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const uniqueId = useId();
  const inputId = `file-upload-${uniqueId}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);

    // Validate size
    const oversized = newFiles.filter(f => f.size > maxSizeMB * 1024 * 1024);
    if (oversized.length > 0) {
      alert(`Mỗi file không được vượt quá ${maxSizeMB}MB`);
      return;
    }

    if (multiple) {
      const combined = [...files, ...newFiles];
      if (combined.length > maxFiles) {
        alert(`Chỉ được chọn tối đa ${maxFiles} files`);
        return;
      }
      onChange(combined);
    } else {
      onChange([newFiles[0]]);
    }

    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const acceptDisplay = accept
    .split(',')
    .map(ext => ext.replace('.', '').toUpperCase())
    .join(', ');

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded cursor-pointer hover:bg-gray-200">
          <Upload className="w-3 h-3" />
          <span>Chọn file</span>
          <input ref={inputRef} type="file" className="hidden" accept={accept}
            multiple={multiple} onChange={handleChange} disabled={disabled} />
        </label>
        {files.length > 0 && (
          <span className="text-xs text-blue-600 truncate max-w-[120px]" title={files[0].name}>
            {files[0].name}
          </span>
        )}
        {!files.length && existingFileName && (
          <span className="text-xs text-blue-600 truncate max-w-[120px]" title={existingFileName}>
            {existingFileName}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {multiple && ` (Tối đa ${maxFiles} files, mỗi file < ${maxSizeMB}MB)`}
        </label>
      )}

      {/* Drop zone */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
        <input ref={inputRef} type="file" id={inputId} className="hidden"
          accept={accept} multiple={multiple} onChange={handleChange} disabled={disabled} />
        <label htmlFor={inputId} className={`cursor-pointer flex flex-col items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <Upload className="w-5 h-5 text-gray-400 mb-1" />
          <p className="text-sm text-gray-600">
            Click để chọn file {multiple && 'hoặc kéo thả vào đây'}
          </p>
        </label>
      </div>

      {/* Existing file (edit mode) */}
      {existingFileUrl && existingFileName && files.length === 0 && (
        <div className="mt-2 flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-200">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <a href={existingFileUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate">{existingFileName}</a>
          </div>
          {onRemoveExisting && (
            <button type="button" onClick={onRemoveExisting}
              className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0" disabled={disabled}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {files.map((file, index) => (
            <div key={index}
              className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                <span className="text-xs text-gray-500 flex-shrink-0">({formatSize(file.size)})</span>
              </div>
              <button type="button" onClick={() => handleRemove(index)}
                className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0" disabled={disabled}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;

