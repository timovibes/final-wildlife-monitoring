import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

const OfflineIndicator = ({ isOnline, isPending }) => {
  if (isOnline && !isPending) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {!isOnline && (
        <div className="bg-rust text-bone px-4 py-2 text-center flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest">
          <WifiOff className="h-4 w-4" />
          <span>You are currently offline. Data will sync when connection is restored.</span>
        </div>
      )}
      
      {isOnline && isPending && (
        <div className="bg-ochre text-bush px-4 py-2 text-center flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest font-semibold">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing offline data...</span>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;