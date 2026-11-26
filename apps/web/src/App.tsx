import { Route, Routes } from 'react-router';

import { SiteLayout } from './layouts/SiteLayout';

import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { RunDetailsPage } from './pages/RunDetailsPage';
import { RunOverlayEditorPage } from './pages/RunOverlayEditorPage';
import { RunOverlayPreviewPage } from './pages/RunOverlayPreviewPage';
import { PublicObsOverlayPage } from './pages/PublicObsOverlayPage';
import { NotFoundPage } from './pages/NotFoundPage';

import ComponentGalleryPage from './pages/ComponentGalleryPage';

export default function App() {
  return (
    <Routes>
      <Route path="obs/:token" element={<PublicObsOverlayPage />} />

      <Route path="app/runs/:id/overlays/:overlayId/preview" element={<RunOverlayPreviewPage />} />

      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="app" element={<DashboardPage />} />
        <Route path="app/runs/:id" element={<RunDetailsPage />} />

        <Route path="app/runs/:id/overlays" element={<RunOverlayEditorPage />} />

        {import.meta.env.DEV && <Route path="dev/components" element={<ComponentGalleryPage />} />}

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
