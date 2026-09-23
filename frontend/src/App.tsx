import { Routes, Route } from 'react-router-dom'
import HeroPage from './pages/HeroPage'
import PlanPage from './pages/PlanPage'
import ResultPage from './pages/ResultPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HeroPage />} />
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  )
}
