import { Routes, Route, Navigate } from 'react-router-dom';
import { SimpleAuthProvider, useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import SubmitPage from '@/pages/SubmitPage';
import SubmissionsListPage from '@/pages/SubmissionsListPage';
import SubmissionDetailPage from '@/pages/SubmissionDetailPage';

function AppRoutes() {
  const { isAuthenticated, role } = useSimpleAuth();

  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        path="/submit"
        element={
          <ProtectedRoute allowedRoles={['sales_manager']}>
            <Layout>
              <SubmitPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/submissions"
        element={
          <ProtectedRoute allowedRoles={['product_support']}>
            <Layout>
              <SubmissionsListPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/submissions/:id"
        element={
          <ProtectedRoute allowedRoles={['product_support']}>
            <Layout>
              <SubmissionDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            role === 'sales_manager' ? (
              <Navigate to="/submit" replace />
            ) : (
              <Navigate to="/submissions" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <SimpleAuthProvider>
      <AppRoutes />
    </SimpleAuthProvider>
  );
}

export default App;
