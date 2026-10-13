import React from 'react';
import ReactDOM from 'react-dom/client';
import MithilaViewer from './components/MithilaViewer.jsx';

ReactDOM.createRoot(document.getElementById('model-root')).render(
  <React.StrictMode>
    <MithilaViewer
      modelPath={`${import.meta.env.BASE_URL}models/project-mithila-skeleton.stl`}
    />
  </React.StrictMode>,
);
