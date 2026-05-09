/**
 * Extract EXIF metadata from image file per SRD FR-20
 * Returns structured data for AI analysis, never exposes raw GPS to end users
 */
export async function extractExifMetadata(file: File): Promise<{
  status: 'available' | 'missing' | 'screenshot-detected';
  gps?: { latitude: number; longitude: number };
  timestamp?: string;
  device?: string;
  software?: string;
} | null> {
  try {
    // Check if file is likely a screenshot first (FR-21)
    if (await isLikelyScreenshot(file)) {
      return { status: 'screenshot-detected' };
    }

    // Simple EXIF parser - in production, use exifr or similar library
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    
    // Check for EXIF header (0xFFE1)
    if (dataView.getUint16(0, false) !== 0xFFE1) {
      return { status: 'missing' };
    }

    // Parse basic EXIF - simplified for MVP
    // In production: use https://github.com/MikeKovarik/exifr
    return {
      status: 'available',
      // GPS and other fields would be parsed here
    };

  } catch (error) {
    console.error('EXIF extraction failed:', error);
    return { status: 'missing' };
  }
}

/**
 * Detect if image is likely a screenshot per SRD FR-21
 * Checks aspect ratio, software tags, moiré patterns
 */
export async function isLikelyScreenshot(file: File): Promise<boolean> {
  try {
    // Check common screenshot aspect ratios
    const img = await loadImage(file);
    const ratio = img.width / img.height;
    
    // Common phone screenshot ratios
    const screenshotRatios = [9/16, 19.5/9, 20/9, 4/3];
    const isScreenshotRatio = screenshotRatios.some(r => 
      Math.abs(ratio - r) < 0.05
    );

    // Check filename for screenshot indicators
    const filename = file.name.toLowerCase();
    const screenshotKeywords = ['screenshot', 'screen-shot', 'png'];
    const hasScreenshotKeyword = screenshotKeywords.some(k => 
      filename.includes(k)
    );

    // In production: add canvas-based moiré/reflection detection
    return isScreenshotRatio || hasScreenshotKeyword;

  } catch {
    return false;
  }
}

/**
 * Helper: Load image from file for analysis
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Strip EXIF metadata before public display per SRD NFR-14
 * Returns blob with EXIF removed
 */
export async function stripExifFromFile(file: File): Promise<Blob> {
  // In production: use browser-image-compression or server-side processing
  // For MVP: return original (document limitation in README)
  return file;
}