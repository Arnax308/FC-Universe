import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout'
import Dashboard from './Dashboard'
import Players from './Players'
import PlayerProfile from './PlayerProfile'
import Clubs from './Clubs'
import Transfers from './Transfers'
import Timeline from './Timeline'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="careers" element={<Dashboard />} />
          <Route path="players" element={<Players />} />
          <Route path="players/:id" element={<PlayerProfile />} />
          <Route path="clubs" element={<Clubs />} />
          <Route path="transfers" element={<Transfers />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="*" element={<div className="p-8 text-on-surface">Screen not extracted yet.</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

