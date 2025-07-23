import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'
import { theme } from './theme'
import { AppWalletProvider } from './providers/WalletProvider'
import App from './App'
import './polyfill'
// AppKit钱包连接功能现在由Header组件统一管理

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <AppWalletProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppWalletProvider>
    </ChakraProvider>
  </React.StrictMode>,
) 