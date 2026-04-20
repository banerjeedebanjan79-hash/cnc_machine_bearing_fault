export interface SensorData {
  timestamp: string;
  vibration: number;
  temperature: number;
  noise: number;
  rpm: number;
}

export interface MachineStatus {
  health: number;
  maintenanceDate: string;
  speed: number;
  isRunning: boolean;
  alerts: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
}
