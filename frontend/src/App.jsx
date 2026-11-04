import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');

  async function refreshDocuments() {
    setIsLoading(true);
    setListError('');

    try {
      setDocuments(await listDocuments());
    } catch (error) {
      setListError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadDocuments() {
      try {
        const result = await listDocuments();
        if (isCurrent) setDocuments(result);
      } catch (error) {
        if (isCurrent) setListError(error.message);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadDocuments();
    return () => {
      isCurrent = false;
    };
  }, []);

  function handleUploaded(uploadedDocument) {
    setDocuments((currentDocuments) => [
      uploadedDocument,
      ...currentDocuments.filter((document) => document.id !== uploadedDocument.id),
    ]);
    setListError('');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">DMS <span>/</span> DOCUMENTOS</span>
        </a>
        <span className="environment-label"><span /> ARQUIVOS LOCAIS</span>
      </header>

      <main className="page-content" id="inicio">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">BIBLIOTECA PESSOAL</p>
            <h1 id="page-title">Documentos</h1>
            <p className="page-subtitle">Seus arquivos, em um só lugar.</p>
          </div>
          <div className="document-count" aria-live="polite">
            <span className="count-number">{documents.length.toString().padStart(2, '0')}</span>
            <span className="count-label">{documents.length === 1 ? 'documento' : 'documentos'}</span>
          </div>
        </section>

        <div className="workspace">
          <section className="upload-section" aria-labelledby="upload-title">
            <div className="section-heading">
              <span className="section-index">01</span>
              <div>
                <h2 id="upload-title">Adicionar arquivo</h2>
                <p>Envie um documento para sua biblioteca.</p>
              </div>
            </div>
            <UploadComponent onUploaded={handleUploaded} />
          </section>

          <section className="documents-section" aria-labelledby="documents-title">
            <div className="section-heading list-heading">
              <span className="section-index">02</span>
              <div>
                <h2 id="documents-title">Sua biblioteca</h2>
                <p>Arquivos enviados recentemente.</p>
              </div>
              <button
                className="text-button refresh-button"
                type="button"
                onClick={refreshDocuments}
                disabled={isLoading}
              >
                {isLoading ? 'Atualizando...' : 'Atualizar lista'}
              </button>
            </div>
            <DocumentList
              documents={documents}
              isLoading={isLoading}
              error={listError}
              onRetry={refreshDocuments}
            />
          </section>
        </div>
      </main>
      <footer className="page-footer">
        <span>DOCUMENT MANAGEMENT SYSTEM</span>
        <span>ARMAZENAMENTO LOCAL</span>
      </footer>
    </div>
  );
}