"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";

interface AgentLiveViewProps {
  sessionId: string;
  wsUrl?: string; // Optional, defaults to constructed URL
  initialStatus: string;
  onLog?: (log: string) => void;
}

export function AgentLiveView({ sessionId, wsUrl, initialStatus, onLog }: AgentLiveViewProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [containerName, setContainerName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Construct WS URL if not provided
  // Assumes backend is on port 3001 locally or uses env var
  // In production, this needs to be configurable
  const getWebSocketUrl = () => {
    if (wsUrl) return wsUrl;
    
    // Fallback logic for development
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    // Assume backend is on port 3001 for dev
    return `${protocol}//${host}:3001/ws`;
  };

  useEffect(() => {
    if (frame) {
        renderFrame(frame);
    }
  }, [frame]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const connect = () => {
    disconnect();
    setError(null);

    const url = getWebSocketUrl();
    console.log("Connecting to WebSocket:", url);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Subscribe to session
        ws.send(JSON.stringify({ type: "subscribe", sessionId }));
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("Failed to connect to agent stream");
        setIsConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // console.log('[AgentLiveView] Received message:', message.type); // Commented out to reduce noise

          if (message.type === 'frame') {
            setFrame(`data:image/jpeg;base64,${message.data}`);
          } else if (message.type === 'status') {
            setStatus(message.status);
            if (message.status === 'stream_closed') {
                console.log('[AgentLiveView] Stream closed by server');
            }
            if (message.status === "stopped" || message.status === "completed") {
                toast.info(`Agent ${message.status}`);
            }
          } else if (message.type === 'container_info') {
             if (message.name) {
                 setContainerName(message.name);
             }
          } else if (message.type === 'error') {
            console.error('[AgentLiveView] Server error:', message.error);
            toast.error(message.error);
          } else if (message.type === 'log' && onLog) {
            // console.log('[AgentLiveView] Log received');
            onLog(message.data);
          }
        } catch (e) {
          console.error("[AgentLiveView] Error parsing WebSocket message:", e);
        }
      };
    } catch (e) {
      console.error("Failed to create WebSocket:", e);
      setError("Failed to create WebSocket connection");
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  const renderFrame = (base64Data: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Resize canvas to match image dimensions if needed
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/jpeg;base64,${base64Data}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-600 hover:bg-green-700" : ""}>
            {isConnected ? "Live" : "Disconnected"}
          </Badge>
          {error && <Badge variant="destructive">{error}</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={connect} disabled={isConnected}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isConnected ? "hidden" : ""}`} />
          {isConnected ? "Connected" : "Reconnect"}
        </Button>
      </div>

      <Card className="overflow-hidden bg-muted/50 border-dashed relative min-h-[400px] flex items-center justify-center">
        {isConnected && !frame ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Waiting for video stream...</p>
            </div>
        ) : !isConnected && !frame ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <WifiOff className="h-8 w-8 opacity-50" />
                <p>Stream disconnected</p>
            </div>
        ) : null}
        
        <canvas 
            ref={canvasRef} 
            className="w-full h-auto object-contain max-h-[80vh]" 
            style={{ display: frame ? 'block' : 'none' }}
        />
      </Card>
      
      <div className="text-xs text-muted-foreground text-center">
        Status: <span className="font-medium">{status}</span> • Container: {containerName || 'Waiting...'} • Session ID: {sessionId}
      </div>
    </div>
  );
}
