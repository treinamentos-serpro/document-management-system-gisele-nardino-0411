import DownloadButton from './DownloadButton.jsx';
import { formatFileSize } from '../utils/formatFileSize.js';

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function DocumentList({ documents, isLoading, error, onRetry }) {
  if (isLoading) {
    return <p className="list-feedback" role="status">Carregando documentos...</p>;
  }

  if (error) {
    return (
      <div className="list-feedback list-error" role="alert">
        <p>{error}</p>
        <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-mark" aria-hidden="true">—</span>
        <p>Nenhum documento por aqui.</p>
      </div>
    );
  }

  return (
    <ul className="document-list" aria-label="Documentos enviados">
      {documents.map((document) => (
        <li className="document-row" key={document.id}>
          <span className="file-type-mark" aria-hidden="true">DOC</span>
          <div className="document-details">
            <p className="document-name" title={document.originalName}>{document.originalName}</p>
            <p className="document-meta">
              <span>{formatFileSize(document.size)}</span>
              <span className="meta-divider" aria-hidden="true">/</span>
              <time dateTime={document.uploadedAt}>{formatDate(document.uploadedAt)}</time>
            </p>
          </div>
          <DownloadButton document={document} />
        </li>
      ))}
    </ul>
  );
}