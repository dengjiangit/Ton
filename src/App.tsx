import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import { Header } from './components/Header'
import { Home } from './pages/Home'
import { CreateRedPacket } from './pages/CreateRedPacket'
import { ClaimRedPacket } from './pages/ClaimRedPacket'
import { MyRedPackets } from './pages/MyRedPackets'
import { MyCreatedRedPackets } from './pages/MyCreatedRedPackets'
import { MyCreatedCrowdfunding } from './pages/MyCreatedCrowdfunding'
import { CrowdfundingDetails } from './pages/CrowdfundingDetails'
import { MyClaimedRedPackets } from './pages/MyClaimedRedPackets'
import { MyClaimedCrowdfunding } from './pages/MyClaimedCrowdfunding'
import { RedPacketDetails } from './pages/RedPacketDetails'
import { Launchpad } from './pages/Launchpad'
import { ClaimLaunchpad } from './pages/ClaimLaunchpad'
import { WalletTest } from './pages/WalletTest'

function App() {
  return (
    <Box minHeight="100vh">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateRedPacket />} />
        <Route path="/claim" element={<ClaimRedPacket />} />
        <Route path="/launchpad" element={<Launchpad />} />
        <Route path="/claim-launchpad" element={<ClaimLaunchpad />} />
        <Route path="/my-redpackets" element={<MyRedPackets />} />
        <Route path="/my-created-redpackets" element={<MyCreatedRedPackets />} />
        <Route path="/my-created-crowdfunding" element={<MyCreatedCrowdfunding />} />
        <Route path="/crowdfunding-details" element={<CrowdfundingDetails />} />
        <Route path="/my-claimed-redpackets" element={<MyClaimedRedPackets />} />
        <Route path="/my-claimed-crowdfunding" element={<MyClaimedCrowdfunding />} />
        <Route path="/redpacket-details" element={<RedPacketDetails />} />
        <Route path="/wallet-test" element={<WalletTest />} />
      </Routes>
    </Box>
  )
}

export default App 