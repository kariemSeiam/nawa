import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { bindGlobalActionTelemetry, postEvent } from './lib/telemetry'
import LandingPage from './pages/LandingPage'

const VisitorsLedger = lazy(() => import('./pages/VisitorsLedger'))

function TelemetryRoutes() {
  const location = useLocation()

  useEffect(() => {
    bindGlobalActionTelemetry()
  }, [])

  useEffect(() => {
    postEvent({
      action: 'route',
      path: `${location.pathname}${location.search}`,
      detail: { pathname: location.pathname, search: location.search },
    }).catch(() => {})
  }, [location.pathname, location.search])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/__nawa/ledger"
        element={
          <Suspense
            fallback={
              <div className="min-h-dvh bg-[#f5f3ed] px-4 py-10 text-center text-slate-600" dir="rtl">
                جاري فتح لوحة الزيارات…
              </div>
            }
          >
            <VisitorsLedger />
          </Suspense>
        }
      />
    </Routes>
  )
}

export default function App() {
  return <TelemetryRoutes />
}
