import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

const OfflineIndicator = ({ isOnline, isPending }) => {
  if (isOnline && !isPending) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center flex items-center justify-center space-x-2">
          <WifiOff className="h-5 w-5" />
          <span className="font-medium">You are currently offline. Data will sync when connection is restored.</span>
        </div>
      )}
      
      {isOnline && isPending && (
        <div className="bg-blue-500 text-white px-4 py-2 text-center flex items-center justify-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="font-medium">Syncing offline data...</span>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;