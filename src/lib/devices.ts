/**
 * Connected device integration layer.
 *
 * Sahara separates devices into three clearly different classes:
 *  - "bluetooth"      → really connectable from the browser via Web Bluetooth (BLE)
 *  - "manufacturer"   → Wi-Fi / cloud wearables that need the vendor's official API or SDK
 *  - "unsupported"    → paired with the phone/OS only; Sahara can show data in-app
 *
 * New device families can be added by extending DEVICE_TYPES / KNOWN_SERVICES
 * without touching the UI.
 */
import type { TranslationKey } from "./i18n";

export type DeviceType = "watch" | "band" | "earbuds" | "other";
export type Transport = "bluetooth" | "manufacturer" | "unsupported";
export type DeviceStatus = "connected" | "disconnected" | "connecting";

export type UserDevice = {
  id: string;
  name: string;
  device_type: DeviceType;
  transport: Transport;
  vendor: string | null;
  device_key: string | null;
  status: DeviceStatus;
  battery_level: number | null;
  supports_notifications: boolean;
  notifications_enabled: boolean;
  last_connected_at: string | null;
};

export const DEVICE_TYPES: { value: DeviceType; labelKey: TranslationKey }[] = [
  { value: "watch", labelKey: "devices.typeWatch" },
  { value: "band", labelKey: "devices.typeBand" },
  { value: "earbuds", labelKey: "devices.typeEarbuds" },
  { value: "other", labelKey: "devices.typeOther" },
];

/** Standard GATT services we can read from generic BLE health wearables. */
export const BATTERY_SERVICE = "battery_service";
export const BATTERY_LEVEL_CHARACTERISTIC = "battery_level";
export const OPTIONAL_SERVICES = [
  BATTERY_SERVICE,
  "device_information",
  "heart_rate",
  "human_interface_device",
  // Apple Notification Center Service — some watches expose notifications here.
  "7905f431-b5ce-4e99-a40f-4b1e122d00d0",
];

export type BluetoothSupport = "supported" | "unsupported" | "insecure";

export function bluetoothSupport(): BluetoothSupport {
  if (typeof navigator === "undefined") return "unsupported";
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";
  return "bluetooth" in navigator ? "supported" : "unsupported";
}

type BleDevice = {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect: () => Promise<any>;
    disconnect: () => void;
  };
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener?: (type: string, cb: () => void) => void;
};

/** Live BLE handles, keyed by our database device id. Not persisted. */
const liveDevices = new Map<string, BleDevice>();

export type PairedResult = {
  key: string;
  name: string;
  batteryLevel: number | null;
  supportsNotifications: boolean;
  raw: BleDevice;
};

export class DeviceError extends Error {
  code: "unsupported" | "insecure" | "denied" | "not_found" | "failed";
  constructor(code: DeviceError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/** Opens the browser's Bluetooth chooser and connects to the picked device. */
export async function requestBluetoothDevice(): Promise<PairedResult> {
  const support = bluetoothSupport();
  if (support === "insecure") throw new DeviceError("insecure", "Bluetooth needs a secure (https) connection.");
  if (support !== "supported") throw new DeviceError("unsupported", "Web Bluetooth is not available.");

  let device: BleDevice;
  try {
    device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: OPTIONAL_SERVICES,
    });
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "NotFoundError") throw new DeviceError("not_found", "No device selected.");
    if (name === "SecurityError" || name === "NotAllowedError") {
      throw new DeviceError("denied", "Bluetooth permission denied.");
    }
    throw new DeviceError("failed", (err as Error)?.message ?? "Bluetooth request failed.");
  }

  let batteryLevel: number | null = null;
  let supportsNotifications = false;
  try {
    const server = await device.gatt?.connect();
    if (server) {
      try {
        const service = await server.getPrimaryService(BATTERY_SERVICE);
        const characteristic = await service.getCharacteristic(BATTERY_LEVEL_CHARACTERISTIC);
        const value = await characteristic.readValue();
        batteryLevel = value.getUint8(0);
      } catch {
        // Battery service is optional on many wearables.
      }
      try {
        await server.getPrimaryService(OPTIONAL_SERVICES[3]);
        supportsNotifications = true;
      } catch {
        supportsNotifications = false;
      }
    }
  } catch (err) {
    throw new DeviceError("failed", (err as Error)?.message ?? "Could not connect to the device.");
  }

  return {
    key: device.id,
    name: device.name?.trim() || "Bluetooth device",
    batteryLevel,
    supportsNotifications,
    raw: device,
  };
}

export function trackDevice(recordId: string, device: BleDevice, onDisconnect: () => void) {
  liveDevices.set(recordId, device);
  const handler = () => {
    liveDevices.delete(recordId);
    onDisconnect();
  };
  device.addEventListener("gattserverdisconnected", handler);
}

export function isLive(recordId: string) {
  const device = liveDevices.get(recordId);
  return !!device?.gatt?.connected;
}

export async function disconnectDevice(recordId: string) {
  const device = liveDevices.get(recordId);
  try { device?.gatt?.disconnect(); } catch { /* already gone */ }
  liveDevices.delete(recordId);
}

/** Refreshes battery level for a live BLE device, if it exposes the service. */
export async function readBattery(recordId: string): Promise<number | null> {
  const device = liveDevices.get(recordId) as any;
  if (!device?.gatt?.connected) return null;
  try {
    const service = await device.gatt.getPrimaryService(BATTERY_SERVICE);
    const characteristic = await service.getCharacteristic(BATTERY_LEVEL_CHARACTERISTIC);
    const value = await characteristic.readValue();
    return value.getUint8(0);
  } catch {
    return null;
  }
}

export type SaharaNotification = {
  title: string;
  body: string;
};

/**
 * Delivers a Sahara notification to the best available destination.
 * Browsers cannot push arbitrary text to a generic BLE wearable, so we use the
 * OS notification channel (which mirrors to a paired watch/band on most
 * platforms) and fall back to in-app delivery.
 */
export async function deliverNotification(
  message: SaharaNotification,
  device: UserDevice | null,
  inApp: (message: SaharaNotification) => void,
): Promise<"device" | "system" | "in_app"> {
  const canForward =
    !!device && device.status === "connected" && device.supports_notifications && device.notifications_enabled;

  if (canForward && typeof window !== "undefined" && "Notification" in window) {
    try {
      const permission =
        Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission === "granted") {
        new Notification(message.title, { body: message.body });
        return "device";
      }
    } catch {
      // fall through to in-app
    }
  }

  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(message.title, { body: message.body });
      inApp(message);
      return "system";
    } catch { /* fall through */ }
  }

  inApp(message);
  return "in_app";
}
