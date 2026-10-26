import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ImageProvider } from './contexts/ImageContext';
import { AppLayout } from './layouts/AppLayout';

import { OverviewPage } from './pages/OverviewPage';
import { InspectorPage } from './pages/InspectorPage';
import { EnhancementLabPage } from './pages/EnhancementLabPage';
import { FilteringPlaygroundPage } from './pages/FilteringPlaygroundPage';
import { RestorationLabPage } from './pages/RestorationLabPage';
import { AlgorithmArenaPage } from './pages/AlgorithmArenaPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProcessingGuidePage } from './pages/ProcessingGuidePage';

export function App() {
  return (
    <ThemeProvider>
      <ImageProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/inspector" element={<InspectorPage />} />
              <Route path="/enhancement" element={<EnhancementLabPage />} />
              <Route path="/filtering" element={<FilteringPlaygroundPage />} />
              <Route path="/restoration" element={<RestorationLabPage />} />
              <Route path="/arena" element={<AlgorithmArenaPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/guide" element={<ProcessingGuidePage />} />
              <Route path="/about" element={<Navigate to="/guide" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ImageProvider>
    </ThemeProvider>
  );
}

export default App;
