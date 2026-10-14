import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect, useState } from 'react';
import MithilaViewer from './components/MithilaViewer.jsx';

function MithilaApp() {
  const [viewMode, setViewMode] = useState('overview');

  useEffect(() => {
    const handleViewChange = (event) => setViewMode(event.detail);
    window.addEventListener('mithila-view-change', handleViewChange);
    return () => window.removeEventListener('mithila-view-change', handleViewChange);
  }, []);

  return (
    <MithilaViewer
      modelPath={`${import.meta.env.BASE_URL}models/project-mithila-skeleton.stl`}
      viewMode={viewMode}
      onViewChange={(mode) =>
        window.dispatchEvent(new CustomEvent('mithila-view-select', { detail: mode }))
      }
    />
  );
}

ReactDOM.createRoot(document.getElementById('model-root')).render(
  <React.StrictMode>
    <MithilaApp />
  </React.StrictMode>,
);
