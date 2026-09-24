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
  /**
   * PENTING — konvensi dimensi:
   * widthMm  = lebar FISIK kertas (arah melintang / cross-feed), mis. 78mm
   * heightMm = panjang FISIK label (arah feed), mis. 100mm
   *
   * TSPL SIZE harus selalu sesuai dimensi fisik kertas,
   * bukan dimensi visual label. Jika gambar sumber landscape
   * (lebar > tinggi) tapi kertas portrait (tinggi > lebar),
   * gambar dirotasi 90° otomatis di canvas agar secara visual
   * tetap landscape tanpa melebihi batas cetak kertas.
   */

  // Standard thermal print resolution: 203 DPI ≈ 8 dots per mm
  // widthMm/heightMm harus sesuai dimensi FISIK kertas
  const physDotsW = Math.round(widthMm * 8);   // dots searah lebar kertas
  const physDotsH = Math.round(heightMm * 8);  // dots searah panjang feed
  const xOffset = options.xOffsetDots ?? 0;
  const yOffset = options.yOffsetDots ?? 0;
  const dir = options.direction ?? 0;
  const gap = options.gapMm ?? 2;

  // Deteksi apakah perlu rotasi:
  // Sumber landscape (lebar > tinggi) tapi kertas portrait (tinggi > lebar) → putar 90°
  // atau user memaksa rotate90 = true
  const srcIsLandscape = sourceCanvas.width > sourceCanvas.height;
  const paperIsPortrait = physDotsH > physDotsW;
  const autoRotate = (srcIsLandscape && paperIsPortrait) || (options.rotate90 ?? false);

  // Canvas offscreen selalu sesuai dimensi FISIK kertas
  const offscreen = document.createElement("canvas");
  offscreen.width = physDotsW;
  offscreen.height = physDotsH;
  const ctx = offscreen.getContext("2d");
  if (!ctx) throw new Error("Gagal menginisialisasi canvas bitmap printer.");

  // Latar belakang putih
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, physDotsW, physDotsH);

  /**
   * CATATAN KOORDINAT PRINTER:
   * Tidak semua printer TSPL memiliki x=0 di sisi kiri fisik kertas.
   * Pada Grozziie TP876Plus, x=0 berada di sisi KANAN fisik kertas.
   * Oleh karena itu kita TIDAK boleh memberikan margin hanya di satu sisi.
   * Solusi: center konten di tengah persis (physDotsW/2) dengan margin
   * SIMETRIS di kedua sisi, sehingga apapun orientasi x-axis printer,
   * konten tetap berada di tengah kertas.
   */

  // Margin simetris 6% di kiri-kanan, 2% di atas-bawah
  const marginW = Math.round(physDotsW * 0.06); // ~4.7mm pada 78mm kertas
  const marginH = Math.round(physDotsH * 0.02);
  const printW = physDotsW - marginW * 2;  // area cetak aktif (horizontal)
  const printH = physDotsH - marginH * 2;  // area cetak aktif (vertikal)

  if (autoRotate) {
    // Gambar dirotasi 90° CW — sumbu landscape-x menjadi sumbu canvas-y dan sebaliknya.
    // Setelah rotasi: src.width → arah H canvas, src.height → arah W canvas
    const scale = Math.min(printW / sourceCanvas.height, printH / sourceCanvas.width);
    const drawW = sourceCanvas.width * scale;
    const drawH = sourceCanvas.height * scale;

    // Center tepat di tengah canvas — xOffset untuk kalibrasi manual
    const cx = physDotsW / 2 + xOffset;
    const cy = physDotsH / 2 + yOffset;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(sourceCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  } else {
    // Tanpa rotasi — center konten secara simetris
    const scale = Math.min(printW / sourceCanvas.width, printH / sourceCanvas.height);
    const drawW = sourceCanvas.width * scale;
    const drawH = sourceCanvas.height * scale;
    const posX = Math.round((physDotsW - drawW) / 2) + xOffset;
    const posY = Math.round((physDotsH - drawH) / 2) + yOffset;

    ctx.drawImage(sourceCanvas, posX, posY, drawW, drawH);
  }

  const imgData = ctx.getImageData(0, 0, physDotsW, physDotsH);
  const pixels = imgData.data;

  // In TSPL, byteWidth is the number of bytes per horizontal line: ceil(width / 8)
  const byteWidth = Math.ceil(physDotsW / 8);
  const bitmapBuffer = new Uint8Array(byteWidth * physDotsH);

  for (let y = 0; y < physDotsH; y++) {
    for (let x = 0; x < physDotsW; x++) {
      const idx = (y * physDotsW + x) * 4;
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

  // Build TSPL command — SIZE pakai dimensi FISIK kertas agar tidak terpotong
  const encoder = new TextEncoder();
  const header = encoder.encode(
    `SIZE ${widthMm} mm,${heightMm} mm\r\n` +
    `GAP ${gap} mm,0 mm\r\n` +
    `DIRECTION ${dir}\r\n` +
    `REFERENCE 0,0\r\n` +
    `CLS\r\n` +
    `BITMAP 0,0,${byteWidth},${physDotsH},0,`
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
 * Cetak pola diagnostik untuk menentukan area cetak aktual printer.
 * Hasilnya: baris berulang bertanda kolom (setiap blok = 8 dots = 1mm).
 * Baca nomor kolom pertama & terakhir yang tercetak untuk mengetahui offset printhead.
 */
export function buildTestPatternBytes(
  widthMm: number,
  heightMm: number,
  direction: 0 | 1 = 0,
  gapMm: number = 2
): Uint8Array {
  const dotsW = Math.round(widthMm * 8);
  const dotsH = Math.round(heightMm * 8);
  const byteWidth = Math.ceil(dotsW / 8);

  const canvas = document.createElement("canvas");
  canvas.width = dotsW;
  canvas.height = dotsH;
  const ctx = canvas.getContext("2d")!;

  // Latar putih
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dotsW, dotsH);

  // Border luar hitam 4 dots
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, dotsW, 4);          // top
  ctx.fillRect(0, dotsH - 4, dotsW, 4); // bottom
  ctx.fillRect(0, 0, 4, dotsH);         // left
  ctx.fillRect(dotsW - 4, 0, 4, dotsH); // right

  // Kolom vertikal tiap 8 dots (= 1mm), dengan nomor mm
  ctx.fillStyle = "#000000";
  ctx.font = "bold 18px monospace";
  ctx.textBaseline = "top";
  for (let mm = 0; mm < widthMm; mm++) {
    const x = mm * 8;
    // Garis tipis tiap mm
    if (mm % 5 === 0) {
      // Garis tebal tiap 5mm
      ctx.fillRect(x, 4, 2, 20);
      // Tulis nomor
      const label = `${mm}`;
      ctx.fillText(label, x + 2, 22);
    } else {
      ctx.fillRect(x, 4, 1, 12);
    }
  }

  // Blok solid 8x8 di pojok kiri atas dan kanan atas (untuk identifikasi arah x)
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 8, 30);    // sudut kiri atas = mm ke-0
  ctx.fillRect(dotsW - 8, 0, 8, 30); // sudut kanan atas = mm terakhir

  // Teks label pojok untuk identifikasi
  ctx.font = "bold 14px monospace";
  ctx.fillText("x=0", 10, dotsH - 25);
  ctx.fillText(`x=${widthMm}`, dotsW - 60, dotsH - 25);

  // Diagonal dari pojok kiri atas ke kanan bawah (untuk deteksi mirror)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(8, 35);
  ctx.lineTo(dotsW - 8, dotsH - 35);
  ctx.stroke();

  // Extract bitmap dari canvas
  const imgData = ctx.getImageData(0, 0, dotsW, dotsH);
  const pixels = imgData.data;
  const bitmapBuffer = new Uint8Array(byteWidth * dotsH);

  for (let y = 0; y < dotsH; y++) {
    for (let x = 0; x < dotsW; x++) {
      const idx = (y * dotsW + x) * 4;
      const lum = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
      if (pixels[idx + 3] > 50 && lum < 190) {
        const byteIdx = y * byteWidth + Math.floor(x / 8);
        bitmapBuffer[byteIdx] |= 1 << (7 - (x % 8));
      }
    }
  }

  const encoder = new TextEncoder();
  const header = encoder.encode(
    `SIZE ${widthMm} mm,${heightMm} mm\r\n` +
    `GAP ${gapMm} mm,0 mm\r\n` +
    `DIRECTION ${direction}\r\n` +
    `REFERENCE 0,0\r\n` +
    `CLS\r\n` +
    `BITMAP 0,0,${byteWidth},${dotsH},0,`
  );
  const footer = encoder.encode(`\r\nPRINT 1,1\r\n`);

  const combined = new Uint8Array(header.length + bitmapBuffer.length + footer.length);
  combined.set(header, 0);
  combined.set(bitmapBuffer, header.length);
  combined.set(footer, header.length + bitmapBuffer.length);
  return combined;
}

/**
 * Kirim pola diagnostik ke printer Bluetooth
 */
export async function printTestPatternViaBle(
  widthMm: number,
  heightMm: number,
  direction: 0 | 1 = 0,
  onStatusUpdate?: (status: string) => void
): Promise<void> {
  onStatusUpdate?.("Menghubungkan ke printer...");
  const conn = await connectBluetoothPrinter();
  onStatusUpdate?.("Membangun pola test...");
  const bytes = buildTestPatternBytes(widthMm, heightMm, direction);
  onStatusUpdate?.("Mengirim pola test ke printer...");
  await sendChunkedData(conn.characteristic, bytes, 120);
  onStatusUpdate?.("Test pattern terkirim!");
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
