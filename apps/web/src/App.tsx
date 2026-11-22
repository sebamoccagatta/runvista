import { Route, Routes } from 'react-router';

import { SiteLayout } from './layouts/SiteLayout';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { RunDetailsPage } from './pages/RunDetailsPage';
import { NotFoundPage } from './pages/NotFoundPage';

import ComponentGalleryPage from './pages/ComponentGalleryPage';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="app" element={<DashboardPage />} />
        <Route path="app/runs/:id" element={<RunDetailsPage />} />

        {import.meta.env.DEV && <Route path="dev/components" element={<ComponentGalleryPage />} />}

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
