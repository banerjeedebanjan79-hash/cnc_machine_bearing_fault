import { SensorData, MachineStatus } from '../types';

const API_URL = 'https://8km68pyduh.execute-api.ap-south-1.amazonaws.com/latest?device_id=esp32_01';

// Initial mock data to keep the graph full initially
let sensorHistory: SensorData[] = Array.from({ length: 20 }, (_, i) => ({
  timestamp: new Date(Date.now() - (20 - i) * 5000).toLocaleTimeString(),
  vibration: 20,
  temperature: 23,
  noise: 0,
  rpm: 1200,
}));

let currentHealth = 98.5; // Starting health
let healthRateHistory: number[] = [0.001, 0.002]; // Recent degradation rates for prediction

let currentStatus: MachineStatus = {
  health: currentHealth,
  maintenanceDate: 'Calculating...',
  speed: 1200,
  isRunning: true,
  alerts: [],
};

const calculateBearingHealth = (temp: number, vib: number, speed: number) => {
  // Now calculating health as an instantaneous Condition Score (0-100)
  // This score reflects the current state and won't drop if params are stable and safe.
  
  let score = 100;

  // Temperature impact: Baseline safe is 25°C. 
  // For every degree above 30°C, subtract 2.5 points.
  if (temp > 30) {
    score -= (temp - 30) * 2.5;
  }
  
  // Vibration impact: Baseline safe is 15µm.
  // Above 20µm, subtract 3 points per unit.
  if (vib > 20) {
    score -= (vib - 20) * 3;
  }
  
  // Speed impact: As per user, health drops if speed decreases below nominal.
  // Nominal speed assumed to be 1200 RPM based on previous context.
  if (speed < 1100) {
    score -= (1100 - speed) * 0.15;
  }

  // Ensure score stays within 0-100
  currentHealth = Math.min(100, Math.max(0, score));
  
  return currentHealth;
};

const predictMaintenanceDate = () => {
  // If health is perfect, maintenance is far. 
  // If health drops, the maintenance date moves closer proportionally.
  const daysRemaining = (currentHealth / 100) * 180; // 180 days max for 100% health
  
  if (daysRemaining < 7) return 'URGENT: 24-48 Hours';
  
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + Math.floor(daysRemaining));
  
  return targetDate.toLocaleDateString();
};

export const machineApi = {
  getSensorData: async (): Promise<SensorData[]> => {
    return [...sensorHistory];
  },

  fetchLatestData: async (): Promise<void> => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('API Response Error');
      
      const data = await response.json();
      
      const newData: SensorData = {
        timestamp: new Date().toLocaleTimeString(),
        temperature: data.temp,
        vibration: data.vibration,
        noise: 0,
        rpm: data.speed,
      };

      currentStatus.speed = data.speed;
      currentStatus.health = calculateBearingHealth(data.temp, data.vibration, data.speed);
      currentStatus.maintenanceDate = predictMaintenanceDate();
      
      sensorHistory = [...sensorHistory.slice(1), newData];
    } catch (error) {
      console.error('Failed to fetch sensor data:', error);
    }
  },

  getMachineStatus: async (): Promise<MachineStatus> => {
    return { ...currentStatus };
  },

  updateMachineSpeed: async (speed: number): Promise<void> => {
    currentStatus.speed = speed;
  },

  shutdownMachine: async (): Promise<void> => {
    currentStatus.isRunning = false;
    currentStatus.speed = 0;
  },

  updateDataFromJson: (newData: Partial<{ sensorData: SensorData; status: Partial<MachineStatus> }>) => {
    if (newData.sensorData) {
      sensorHistory = [...sensorHistory.slice(1), newData.sensorData];
    }
    if (newData.status) {
      currentStatus = { ...currentStatus, ...newData.status };
    }
  },
};

// Polling interval
setInterval(async () => {
  if (currentStatus.isRunning) {
    await machineApi.fetchLatestData();

    if (currentStatus.health < 30 && !currentStatus.alerts.includes('CRITICAL: Bearing Health < 30%')) {
      currentStatus.alerts.push('CRITICAL: Bearing Health < 30%');
    }
  }
}, 5000);
