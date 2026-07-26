import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout'
import Careers from './Careers'
import Players from './Players'
import PlayerProfile from './PlayerProfile'
import Clubs from './Clubs'
import ClubProfile from './ClubProfile'
import Transfers from './Transfers'
import Timeline from './Timeline'
import CareerProfile from './CareerProfile'

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
          <Route path="*" element={<div className="p-8 text-on-surface">Screen not found.</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
