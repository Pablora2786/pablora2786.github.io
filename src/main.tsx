import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { registerSlushWallet } from '@mysten/slush-wallet';
import '@mysten/dapp-kit/dist/index.css';
import './index.css';
import App from './App';
import { NETWORK, RPC_URL, SITE_NAME } from './lib/constants';

try {
  registerSlushWallet(SITE_NAME, {
    origin: typeof window !== 'undefined' ? window.location.origin : undefined,
  });
} catch {
  /* already registered / unsupported env */
}

const queryClient = new QueryClient();
const client = new SuiJsonRpcClient({ url: RPC_URL, network: NETWORK });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={{ mainnet: client }} defaultNetwork="mainnet">
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </StrictMode>,
);
