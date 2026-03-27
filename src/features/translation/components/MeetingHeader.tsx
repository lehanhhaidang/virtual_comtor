'use client';

import { ArrowLeft, Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const CONNECTION_STATUS_COLORS = {
  disconnected: 'text-muted-foreground',
  connecting: 'text-yellow-500',
  connected: 'text-vietnamese',
  error: 'text-destructive',
} as const;

interface MeetingHeaderProps {
  title: string;
  connectionState: ConnectionState;
  statusLabel: string;
  onBack: () => void;
  controls: React.ReactNode;
}

export function MeetingHeader({ title, connectionState, statusLabel, onBack, controls }: MeetingHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 rounded-lg">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          <span className={`flex items-center gap-1 text-xs ${CONNECTION_STATUS_COLORS[connectionState]}`}>
            {connectionState === 'connected'    && <Wifi className="h-3 w-3" />}
            {connectionState === 'error'        && <AlertCircle className="h-3 w-3" />}
            {connectionState === 'connecting'   && <Loader2 className="h-3 w-3 animate-spin" />}
            {connectionState === 'disconnected' && <WifiOff className="h-3 w-3" />}
            {statusLabel}
          </span>
        </div>
      </div>

      {controls}
    </div>
  );
}
