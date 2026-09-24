/**
 * Direct Web Bluetooth Print Utility for Thermal Label Printers (Grozziie, etc.)
 * Supports sending TSPL bitmap commands directly to BLE GATT characteristic.
 */

// Common Thermal Printer Service UUIDs (Grozziie, ESC/POS, TSPL, Zebra, Goojprt, Xprinter, etc.)
const PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // Common Serial / POS
  "0000ff00-0000-1000-8000-00805f9b34fb", // Custom POS / Label
  "0000fee7-0000-1000-8000-00805f9b34fb", // Tencent / Chinese Printer Protocol
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Transparent Serial
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Common BLE Label printer
  "0000ae30-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "00001800-0000-1000-8000-00805f9b34fb", // Generic Access
  "00001801-0000-1000-8000-00805f9b34fb", // Generic Attribute
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
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
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
 * Reset cached connection if connection lost or failed
 */
export function disconnectBluetoothPrinter(): void {
  try {
    if (cachedConnection?.device?.gatt?.connected) {
      cachedConnection.device.gatt.disconnect();
    }
  } catch {
    // Ignore error
  }
  cachedConnection = null;
}

/**
 * Connect to a nearby Bluetooth Thermal Printer with retry mechanism
 */
export async function connectBluetoothPrinter(): Promise<BleDeviceConnection> {
  if (!isWebBluetoothSupported()) {
    throw new Error("Browser ini tidak mendukung Web Bluetooth. Silakan gunakan Google Chrome di PC/Android.");
  }

  // If already connected and GATT server is still connected, reuse
  if (cachedConnection?.device?.gatt?.connected && cachedConnection.characteristic) {
    return cachedConnection;
  }

  // Reset any dead cache
  cachedConnection = null;

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

  // Listen for device disconnection to cleanly reset cache
  device.addEventListener("gattserverdisconnected", () => {
    cachedConnection = null;
  });

  // Attempt connect with retry (printers often need a retry if busy or waking up)
  let server: BluetoothRemoteGATTServer | null = null;
  let lastConnectErr: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (device.gatt.connected) {
        server = device.gatt;
        break;
      }
      server = await device.gatt.connect();
      if (server?.connected) break;
    } catch (err) {
      lastConnectErr = err;
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  if (!server || !server.connected) {
    const detail = lastConnectErr instanceof Error ? lastConnectErr.message : "Connection attempt failed";
    throw new Error(
      `Gagal terhubung ke printer Bluetooth (${detail}).\n` +
      "Langkah perbaikan:\n" +
      "1. Pastikan printer dalam kondisi ON & standby.\n" +
      "2. Pastikan printer TIDAK sedang terhubung ke aplikasi HP lain (Grozziie app/driver lain).\n" +
      "3. Matikan dan hidupkan kembali printer (restart), lalu coba klik tombol print lagi."
    );
  }

  // Discover primary service
  let primaryService: BluetoothRemoteGATTService | null = null;
  const services = await server.getPrimaryServices().catch(() => []);

  for (const s of services) {
    if (!s.uuid.includes("1800") && !s.uuid.includes("1801")) {
      primaryService = s;
      break;
    }
  }

  if (!primaryService && services.length > 0) {
    primaryService = services[0];
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
 * Convert a rendered canvas element to TSPL bitmap command bytes accurately scaled to 203 DPI (8 dots/mm)
 */
export function imageToTsplBytes(
  sourceCanvas: HTMLCanvasElement,
  widthMm: number,
  heightMm: number,
  options: {
    xOffsetDots?: number;
    yOffsetDots?: number;
    direction?: 0 | 1;
    gapMm?: number;
    rotate90?: boolean;
  } = {}
): Uint8Array {
  // Standard thermal print resolution: 203 DPI ≈ 8 dots per mm
  const targetDotsWidth = Math.round(widthMm * 8);
  const targetDotsHeight = Math.round(heightMm * 8);
  const xOffset = options.xOffsetDots ?? 0;
  const yOffset = options.yOffsetDots ?? 0;
  const dir = options.direction ?? 0;
  const gap = options.gapMm ?? 2;
  const shouldRotate = options.rotate90 ?? false;

  // Create an accurately sized offscreen canvas matched exactly to the physical print dots
  const offscreen = document.createElement("canvas");
  offscreen.width = targetDotsWidth;
  offscreen.height = targetDotsHeight;
  const ctx = offscreen.getContext("2d");
  if (!ctx) throw new Error("Gagal menginisialisasi canvas bitmap printer.");

  // Fill with pure white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetDotsWidth, targetDotsHeight);

  if (shouldRotate) {
    // Rotate 90 degrees clockwise to print landscape design across vertical 78x100mm feed
    ctx.save();
    ctx.translate(targetDotsWidth / 2 + xOffset, targetDotsHeight / 2 + yOffset);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(sourceCanvas, -targetDotsHeight / 2, -targetDotsWidth / 2, targetDotsHeight, targetDotsWidth);
    ctx.restore();
  } else {
    // Standard direct drawing
    ctx.drawImage(sourceCanvas, xOffset, yOffset, targetDotsWidth, targetDotsHeight);
  }

  const imgData = ctx.getImageData(0, 0, targetDotsWidth, targetDotsHeight);
  const pixels = imgData.data;

  // In TSPL, byteWidth is the number of bytes per horizontal line: ceil(width / 8)
  const byteWidth = Math.ceil(targetDotsWidth / 8);
  const bitmapBuffer = new Uint8Array(byteWidth * targetDotsHeight);

  for (let y = 0; y < targetDotsHeight; y++) {
    for (let x = 0; x < targetDotsWidth; x++) {
      const idx = (y * targetDotsWidth + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      // Threshold: luminance < 190 and opaque
      const isBlack = a > 50 && (r * 0.299 + g * 0.587 + b * 0.114) < 190;

      if (isBlack) {
        const byteIndex = y * byteWidth + Math.floor(x / 8);
        const bitOffset = 7 - (x % 8);
        bitmapBuffer[byteIndex] |= 1 << bitOffset;
      }
    }
  }

  // Build TSPL command header & footer with REFERENCE and SHIFT compensation
  const encoder = new TextEncoder();
  const header = encoder.encode(
    `SIZE ${widthMm} mm,${heightMm} mm\r\n` +
    `GAP ${gap} mm,0 mm\r\n` +
    `DIRECTION ${dir}\r\n` +
    `REFERENCE 0,0\r\n` +
    `CLS\r\n` +
    `BITMAP 0,0,${byteWidth},${targetDotsHeight},0,`
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
  onStatusUpdate?: (status: string) => void,
  options: {
    xOffsetDots?: number;
    yOffsetDots?: number;
    direction?: 0 | 1;
    gapMm?: number;
    rotate90?: boolean;
  } = {}
): Promise<void> {
  const { toCanvas } = await import("html-to-image");

  onStatusUpdate?.("Menghubungkan ke Printer Bluetooth...");
  const conn = await connectBluetoothPrinter();

  onStatusUpdate?.("Merender label stiker...");
  // Render DOM element with 2x scale for sharp vector/text extraction
  const renderedCanvas = await toCanvas(element, {
    quality: 1,
    pixelRatio: 2.0,
    backgroundColor: "#ffffff",
  });

  onStatusUpdate?.("Menyesuaikan ukuran & margin thermal...");
  const tsplBytes = imageToTsplBytes(renderedCanvas, widthMm, heightMm, options);

  onStatusUpdate?.("Mengirim data cetak ke printer...");
  await sendChunkedData(conn.characteristic, tsplBytes, 120);

  onStatusUpdate?.("Selesai mencetak!");
}
