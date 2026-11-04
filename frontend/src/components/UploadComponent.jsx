import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';
import { formatFileSize } from '../utils/formatFileSize.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export default function UploadComponent({ onUploaded }) {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function selectFile(file) {
    setError('');
    setSuccess('');

    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setError('O arquivo deve ter no máximo 10 MB.');
      return;
    }

    setSelectedFile(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFile) {
      setError('Selecione um arquivo para enviar.');
      return;
    }

    setIsUploading(true);
    try {
      const uploadedDocument = await uploadDocument(selectedFile);
      onUploaded(uploadedDocument);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setSuccess('Documento enviado com sucesso.');
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label
        className={`upload-dropzone${isDragging ? ' is-dragging' : ''}`}
        htmlFor="document-file"
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <span className="upload-symbol" aria-hidden="true">+</span>
        <span className="dropzone-title">Solte seu arquivo aqui</span>
        <span className="dropzone-subtitle">ou escolha no dispositivo</span>
        <input
          ref={inputRef}
          id="document-file"
          className="visually-hidden"
          type="file"
          onChange={(event) => {
            selectFile(event.target.files[0]);
            event.target.value = '';
          }}
          disabled={isUploading}
        />
      </label>

      <p className="upload-limit">Tamanho máximo: 10 MB</p>

      {selectedFile && (
        <div className="selected-file" aria-live="polite">
          <span className="file-type-mark" aria-hidden="true">DOC</span>
          <span className="selected-file-info">
            <span className="selected-file-name">{selectedFile.name}</span>
            <span className="selected-file-size">{formatFileSize(selectedFile.size)}</span>
          </span>
          <button
            className="remove-file-button"
            type="button"
            aria-label="Remover arquivo selecionado"
            title="Remover arquivo"
            onClick={() => {
              setSelectedFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            disabled={isUploading}
          >
            ×
          </button>
        </div>
      )}

      <button className="primary-button upload-submit" type="submit" disabled={isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>

      {error && <p className="status-message error-message" role="alert">{error}</p>}
      {success && <p className="status-message success-message" role="status">{success}</p>}
    </form>
  );
}