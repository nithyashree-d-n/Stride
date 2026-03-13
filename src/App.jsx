// src/App.jsx
import React from 'react';
import { useAdaptiveUI } from './hooks/useAdaptiveUI';
import { Profiler } from './components/Profiler';
import { Dashboard } from './components/Dashboard';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/bootstrap-custom.css';
import './styles/themes.css';

function App() {
  const uiState = useAdaptiveUI();

  if (uiState.comfortTags.length === 0) {
    return (
      <Profiler 
        selectedChoices={uiState.selectedChoices}
        toggleChoice={uiState.toggleChoice}
        onConfirm={uiState.applySelections}
      />
    );
  }

  return <Dashboard uiState={uiState} />;
}

export default App;
