import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Layout from './Layout'
import Careers from './Careers'
import Players from './Players'
import PlayerProfile from './PlayerProfile'
import Clubs from './Clubs'
import ClubProfile from './ClubProfile'
import Transfers from './Transfers'
import Timeline from './Timeline'
import CareerProfile from './CareerProfile'
import { EmptyState } from './components/ui'

function NotFound() {
  return (
    <EmptyState icon="sports" title="Offside! Page not found">
      <Link to="/" className="font-semibold text-flood underline">Back to kick-off</Link>
    </EmptyState>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Careers />} />
          <Route path="careers" element={<Careers />} />
          <Route path="players" element={<Players />} />
          <Route path="players/:id" element={<PlayerProfile />} />
          <Route path="clubs" element={<Clubs />} />
          <Route path="clubs/:id" element={<ClubProfile />} />
          <Route path="transfers" element={<Transfers />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="career" element={<CareerProfile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
