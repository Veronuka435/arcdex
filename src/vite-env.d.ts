/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEX_ADDRESS: string;
  readonly VITE_USDC_ADDRESS: string;
  readonly VITE_WETH_ADDRESS: string;
  readonly VITE_DAI_ADDRESS: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeListener: (event: string, callback: (...args: any[]) => void) => void;
  };
}
