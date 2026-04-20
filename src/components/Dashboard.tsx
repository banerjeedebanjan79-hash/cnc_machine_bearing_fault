import * as React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Activity, Thermometer, Zap, RotateCcw, 
  Power, Calendar, ShieldAlert, LogOut, Gauge, Wifi, WifiOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SensorData, MachineStatus, User } from '@/src/types';
import { machineApi } from '@/src/services/mockApi';
import { motion, AnimatePresence } from 'motion/react';

import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [sensorData, setSensorData] = React.useState<SensorData[]>([]);
  const [status, setStatus] = React.useState<MachineStatus | null>(null);
  const [isApiDown, setIsApiDown] = React.useState(false);
  const [showCriticalDialog, setShowCriticalDialog] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const currentStatus = await machineApi.getMachineStatus();
        setStatus(currentStatus);

        const data = await machineApi.getSensorData();
        setSensorData(data);
        setIsApiDown(false);

        // Show popup only once when crossing threshold
        if (currentStatus.health < 30 && !showCriticalDialog) {
          setShowCriticalDialog(true);
        }
      } catch (error) {
        console.error('UI polling error:', error);
        setIsApiDown(true);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [showCriticalDialog]);

  const handleShutdown = async () => {
    if (confirm('Are you sure you want to SHUTDOWN the machine?')) {
      await machineApi.shutdownMachine();
      // Optimistic update
      setStatus(prev => prev ? { ...prev, isRunning: false, speed: 0 } : null);
    }
  };

  const handleRestart = async () => {
    await machineApi.updateDataFromJson({ status: { isRunning: true, speed: 1200 } });
    setStatus(prev => prev ? { ...prev, isRunning: true, speed: 1200 } : null);
  };

  if (!status) return <div className="flex items-center justify-center h-screen">Initializing Emergency Systems...</div>;

  const isDangerous = status.health < 30;

  return (
    <div className="min-h-screen bg-background tech-grid flex flex-col">
      <Dialog open={showCriticalDialog} onOpenChange={setShowCriticalDialog}>
        <DialogContent className="sm:max-w-md border-destructive">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-6 h-6" /> EMERGENCY ALERT
            </DialogTitle>
            <DialogDescription className="font-bold">
              Bearing Health has dropped below 30%!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm">
            <p>The predictive maintenance algorithm has detected severe thermal and mechanical stress. Immediate intervention is required to avoid catastrophic machine failure.</p>
            <div className="mt-4 p-3 bg-muted rounded font-mono text-xs">
              <p>Current Node: esp32_01</p>
              <p>Health: {status.health.toFixed(2)}%</p>
              <p>Status: CRITICAL</p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="destructive" className="flex-1" onClick={handleShutdown}>
              Shut Down Machine
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowCriticalDialog(false)}>
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <Activity className="text-primary-foreground w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight">BearingPulse AI</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Terminal: CNC-04-B</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {isApiDown ? (
              <Badge variant="destructive" className="animate-pulse gap-1">
                <WifiOff className="w-3 h-3" /> Connection Lost
              </Badge>
            ) : (
              <Badge variant="outline" className="text-green-500 gap-1 border-green-500/30">
                <Wifi className="w-3 h-3" /> Connected
              </Badge>
            )}
            <div className="hidden md:flex items-center gap-4 text-xs">
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground uppercase">Operator</span>
                <span className="font-mono">{user.name}</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground uppercase">System Status</span>
                <Badge variant={status.isRunning ? "default" : "destructive"} className="h-4 text-[9px]">
                  {status.isRunning ? "OPERATIONAL" : "OFFLINE"}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-6 space-y-6">
        {/* Critical Alerts */}
        <AnimatePresence>
          {isDangerous && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert variant="destructive" className="border-2 animate-pulse">
                <ShieldAlert className="h-5 w-5" />
                <AlertTitle className="font-bold">DANGER: CRITICAL FAILURE RISK</AlertTitle>
                <AlertDescription>
                  Bearing health is critical ({status.health.toFixed(1)}%). Thermal stress detected on node esp32_01.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className={isDangerous ? "border-destructive/50 ring-2 ring-destructive/20" : ""}>
            <CardHeader className="pb-2">
              <CardDescription className="uppercase text-[10px] tracking-widest flex items-center gap-2">
                <Activity className="w-3 h-3" /> Bearing Health
              </CardDescription>
              <CardTitle className="text-3xl font-mono">
                {status.health.toFixed(2)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={status.health} className={`h-2 ${isDangerous ? "[&>div]:bg-destructive" : ""}`} />
              <p className="text-[10px] mt-2 text-muted-foreground italic uppercase">
                {status.health > 80 ? "Condition: Good" : status.health > 50 ? "Condition: Warning" : "Condition: Critical"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="uppercase text-[10px] tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Predicted Maintenance
              </CardDescription>
              <CardTitle className="text-2xl font-mono">
                {status.maintenanceDate}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[10px] text-muted-foreground">AI-Driven projection based on real-time stress telemetry.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="uppercase text-[10px] tracking-widest flex items-center gap-2">
                <Gauge className="w-3 h-3" /> Machine Speed
              </CardDescription>
              <CardTitle className="text-3xl font-mono">
                {Math.round(status.speed)} <span className="text-sm font-sans text-muted-foreground">RPM</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
               <Progress value={(status.speed / 3000) * 100} className="h-1 bg-muted" />
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Temperature Chart - The main focus of the API */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-orange-500" /> Temperature Monitor (API: esp32_01)
                  </CardTitle>
                  <CardDescription>Live telemetry from AWS Gateway Gateway</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-orange-500 border-orange-500/30">REAL-TIME</Badge>
              </div>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sensorData}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey="timestamp" hide />
                  <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontSize: '12px' }}
                    itemStyle={{ color: '#f97316' }}
                  />
                  <Area type="monotone" dataKey="temperature" stroke="#f97316" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Vibration Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-blue-500" /> Vibration Monitor (API)
              </CardTitle>
              <CardDescription>Live displacement telemetry (μm)</CardDescription>
            </CardHeader>
            <CardContent className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensorData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey="timestamp" hide />
                  <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontSize: '12px' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Line type="monotone" dataKey="vibration" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Controls Panel */}
        <Card className="bg-card/50 border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="w-5 h-5" /> Master Control Panel
            </CardTitle>
            <CardDescription>Safety overrides and power state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Machine Power State</p>
                <p className="text-xs text-muted-foreground italic">Current speed locked at 1200 RPM for safety.</p>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <Button 
                  variant={status.isRunning ? "destructive" : "default"} 
                  className="flex-1 md:w-48 h-12 font-bold uppercase tracking-widest shadow-lg"
                  onClick={handleShutdown}
                  disabled={!status.isRunning}
                >
                  <Power className="mr-2 w-5 h-5" /> Emergency Stop
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 md:w-48 h-12 font-bold uppercase tracking-widest"
                  disabled={status.isRunning}
                  onClick={handleRestart}
                >
                  <RotateCcw className="mr-2 w-5 h-5" /> System Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border p-4 bg-muted/10">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
          <div className="flex items-center gap-4">
            <span>Client ID: esp32_01</span>
            <span>Gateway: ap-south-1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isApiDown ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
            <span>Telemetry Stream: {isApiDown ? 'Inactive' : 'Active'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
