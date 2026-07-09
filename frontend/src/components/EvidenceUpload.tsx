import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { EvaluationEvidence } from '../services/employeeEvaluationService';
import { useUploadEvidence, useDeleteEvidence } from '../hooks/useEmployeeEvaluation';

// Mirror server-side validation
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_FILES_PER_DETAIL = 5;

interface EvidenceUploadProps {
  detailId: string;
  existingEvidence: EvaluationEvidence[];
  readOnly?: boolean;
  onChanged?: () => void;
}

const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  detailId,
  existingEvidence,
  readOnly = false,
  onChanged,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState('');

  const uploadEvidence = useUploadEvidence();
  const deleteEvidence = useDeleteEvidence();

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File "${file.name}" vượt quá giới hạn 5 MB`;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `File "${file.name}" không đúng định dạng cho phép (PDF, ảnh, Word, Excel)`;
    }
    return null;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setValidationError('');

    const remaining = MAX_FILES_PER_DETAIL - existingEvidence.length;
    if (remaining <= 0) {
      setValidationError(`Đã đạt giới hạn ${MAX_FILES_PER_DETAIL} file cho tiêu chí này`);
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);

    for (const file of toUpload) {
      const err = validateFile(file);
      if (err) {
        setValidationError(err);
        return;
      }
    }

    for (const file of toUpload) {
      await uploadEvidence.mutateAsync({ detailId, file });
    }
    onChanged?.();
  };

  const handleDelete = async (evidenceId: string) => {
    await deleteEvidence.mutateAsync({ evidenceId, detailId });
    onChanged?.();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!readOnly) handleFiles(e.dataTransfer.files);
  };

  const isUploading = uploadEvidence.isPending;
  const isDeleting = deleteEvidence.isPending;

  return (
    <div className="space-y-3">
      {/* Existing evidence list */}
      {existingEvidence.length > 0 && (
        <div className="space-y-1.5">
          {existingEvidence.map(ev => (
            <div key={ev.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="flex-1 truncate text-gray-700">{ev.fileName}</span>
              <span className="text-xs text-gray-400 shrink-0">{formatFileSize(ev.fileSize)}</span>
              {!readOnly && (
                <button
                  onClick={() => handleDelete(ev.id)}
                  disabled={isDeleting}
                  className="text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {validationError}
        </p>
      )}

      {/* Drop zone */}
      {!readOnly && existingEvidence.length < MAX_FILES_PER_DETAIL && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_MIME_TYPES.join(',')}
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Đang tải lên...</span>
            </div>
          ) : (
            <>
              <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-600">Kéo thả hoặc <span className="text-blue-600 font-medium">bấm để chọn file</span></p>
              <p className="text-xs text-gray-400 mt-0.5">
                PDF, ảnh (JPG/PNG), Word, Excel — tối đa 5 MB/file, {MAX_FILES_PER_DETAIL - existingEvidence.length} file còn lại
              </p>
            </>
          )}
        </div>
      )}

      {readOnly && existingEvidence.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">Chưa có bằng chứng nào.</p>
      )}
    </div>
  );
};

export default EvidenceUpload;
