import React from 'react';
import { Radio } from 'lucide-react';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import IoTDataViewer from './IoTDataViewer';

const IoTMonitor = () => {
  const user = authService.getCurrentUser();

  return (
    <div className="min-h-screen bg-bush text-bone font-body">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold flex items-center gap-3">
            <Radio className="h-6 w-6 text-ochre" />
            IoT Monitor
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-bone/50">
            Live sensor data and field simulation
          </p>
        </div>

        <IoTDataViewer />
      </div>
    </div>
  );
};

export default IoTMonitor;