/**
 * Direct Web Bluetooth Print Utility for Thermal Label Printers (Grozziie, etc.)
 * Supports sending TSPL bitmap commands directly to BLE GATT characteristic.
 */

// Common Thermal Printer Service UUIDs
const PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // Common Serial / POS
  "0000ff00-0000-1000-8000-00805f9b34fb", // Custom POS / Label
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Transparent Serial
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Common BLE Label printer
  "0000fee7-0000-1000-8000-00805f9b34fb", // Tencent / Chinese Printer Protocol
  "0000ae30-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
];

export interface BleDeviceConnection {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

// Minimal type polyfills for Web Bluetooth in TypeScript
interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothRemoteGATTService {
  uuid: string;
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTCharacteristic {
  uuid: string;
  properties: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
}

let cachedConnection: BleDeviceConnection | null = null;

/**
 * Check if the current browser supports Web Bluetooth API
 */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/**
 * Connect to a nearby Bluetooth Thermal Printer
 */
export async function connectBluetoothPrinter(): Promise<BleDeviceConnection> {
  if (!isWebBluetoothSupported()) {
    throw new Error("Browser ini tidak mendukung Web Bluetooth. Silakan gunakan Google Chrome di PC/Android.");
  }

  // If already connected and GATT server is still connected, reuse
  if (cachedConnection?.device?.gatt?.connected && cachedConnection.characteristic) {
    return cachedConnection;
  }

  const nav = navigator as unknown as {
    bluetooth: {
      requestDevice(options: { acceptAllDevices?: boolean; optionalServices?: string[] }): Promise<BluetoothDevice>;
    };
  };

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICES,
  });

  if (!device.gatt) {
    throw new Error("GATT server tidak ditemukan pada perangkat Bluetooth ini.");
  }

  const server = await device.gatt.connect();

  // Discover primary service
  let primaryService: BluetoothRemoteGATTService | null = null;
  const services = await server.getPrimaryServices().catch(() => []);

  for (const s of services) {
    primaryService = s;
    break;
  }

  if (!primaryService) {
    // Fallback: try querying specific known services
    for (const uuid of PRINTER_SERVICES) {
      try {
        primaryService = await server.getPrimaryService(uuid);
        if (primaryService) break;
      } catch {
        // Continue searching
      }
    }
  }

  if (!primaryService) {
    throw new Error("Layanan cetak Bluetooth tidak terdeteksi pada printer ini.");
  }

  // Discover writable characteristic
  const characteristics = await primaryService.getCharacteristics();
  let writeChar: BluetoothRemoteGATTCharacteristic | null = null;

  for (const char of characteristics) {
    if (char.properties.write || char.properties.writeWithoutResponse) {
      writeChar = char;
      break;
    }
  }

  if (!writeChar) {
    throw new Error("Port tulis (Write Characteristic) tidak ditemukan pada printer.");
  }

  cachedConnection = { device, characteristic: writeChar };
  return cachedConnection;
}

/**
 * Send chunked byte packets to Bluetooth characteristic to avoid MTU buffer overflow
 */
async function sendChunkedData(
  characteristic: BluetoothRemoteGATTCharacteristic,
  data: Uint8Array,
  chunkSize = 100
): Promise<void> {
  let offset = 0;
  while (offset < data.length) {
    const chunk = data.slice(offset, offset + chunkSize);
    if (characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    offset += chunkSize;
    // Small micro-delay for BLE buffer
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

/**
 * Convert an HTML Image element to TSPL bitmap command bytes
 */
export function imageToTsplBytes(
  canvas: HTMLCanvasElement,
  widthMm: number,
  heightMm: number
): Uint8Array {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal menginisialisasi canvas.");

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  // Each byte holds 8 horizontal monochrome pixels (1 = black, 0 = white in TSPL bitmap)
  const byteWidth = Math.ceil(width / 8);
  const bitmapBuffer = new Uint8Array(byteWidth * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Convert to luminance
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      // Threshold: darker than 180 is considered black dot
      const isBlack = a > 50 && (r * 0.299 + g * 0.587 + b * 0.114) < 185;

      if (isBlack) {
        const byteIndex = y * byteWidth + Math.floor(x / 8);
        const bitOffset = 7 - (x % 8);
        bitmapBuffer[byteIndex] |= 1 << bitOffset;
      }
    }
  }

  // Build TSPL command header & footer
  const encoder = new TextEncoder();
  const header = encoder.encode(
    `SIZE ${widthMm} mm,${heightMm} mm\r\n` +
    `GAP 2 mm,0 mm\r\n` +
    `DIRECTION 0\r\n` +
    `CLS\r\n` +
    `BITMAP 0,0,${byteWidth},${height},0,`
  );
  const footer = encoder.encode(`\r\nPRINT 1,1\r\n`);

  // Concatenate header + bitmap data + footer
  const totalLength = header.length + bitmapBuffer.length + footer.length;
  const combined = new Uint8Array(totalLength);
  combined.set(header, 0);
  combined.set(bitmapBuffer, header.length);
  combined.set(footer, header.length + bitmapBuffer.length);

  return combined;
}

/**
 * Print a DOM element directly to the thermal printer via Bluetooth
 */
export async function directPrintElementViaBle(
  element: HTMLElement,
  widthMm: number,
  heightMm: number,
  onStatusUpdate?: (status: string) => void
): Promise<void> {
  const { toCanvas } = await import("html-to-image");

  onStatusUpdate?.("Menghubungkan ke Printer Bluetooth...");
  const conn = await connectBluetoothPrinter();

  onStatusUpdate?.("Merender label stiker...");
  const canvas = await toCanvas(element, {
    quality: 1,
    pixelRatio: 2.5, // 203 DPI thermal resolution approximation
    backgroundColor: "#ffffff",
  });

  onStatusUpdate?.("Mengirim data cetak ke printer...");
  const tsplBytes = imageToTsplBytes(canvas, widthMm, heightMm);
  await sendChunkedData(conn.characteristic, tsplBytes, 100);

  onStatusUpdate?.("Selesai mencetak!");
}
