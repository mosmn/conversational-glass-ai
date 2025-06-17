const puppeteer = require("puppeteer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Icon sizes needed for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Create HTML template with your logo styles
const createLogoHTML = (size) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            margin: 0;
            padding: 0;
            width: ${size}px;
            height: ${size}px;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }
        
        .logo-container {
            position: relative;
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .glass-bg {
            position: absolute;
            inset: 0;
            border-radius: ${size * 0.25}px;
            background: linear-gradient(135deg, 
                rgba(16, 185, 129, 0.15) 0%, 
                rgba(20, 184, 166, 0.1) 25%,
                rgba(6, 182, 212, 0.08) 50%,
                rgba(30, 41, 59, 0.4) 75%,
                rgba(15, 23, 42, 0.6) 100%
            );
            backdrop-filter: blur(12px);
            border: 1px solid rgba(100, 116, 139, 0.3);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        
        .inner-glow {
            position: absolute;
            inset: ${size * 0.04}px;
            border-radius: ${size * 0.2}px;
            background: linear-gradient(135deg, 
                rgba(16, 185, 129, 0.2) 0%, 
                rgba(20, 184, 166, 0.1) 50%,
                transparent 100%
            );
            opacity: 0.6;
        }
        
        .content {
            position: relative;
            z-index: 10;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .central-node {
            width: ${size * 0.08}px;
            height: ${size * 0.08}px;
            background: linear-gradient(45deg, #10b981, #14b8a6);
            border-radius: 50%;
            box-shadow: 0 0 ${size * 0.15}px rgba(16, 185, 129, 0.5);
            position: absolute;
        }
        
        .bubble {
            position: absolute;
            background: linear-gradient(135deg, rgba(6, 182, 212, 0.8), rgba(16, 185, 129, 0.6));
            border-radius: 50%;
            box-shadow: 0 0 ${size * 0.08}px rgba(16, 185, 129, 0.4);
        }
        
        .bubble-1 {
            width: ${size * 0.06}px;
            height: ${size * 0.06}px;
            left: ${size * 0.25}px;
            top: ${size * 0.28}px;
        }
        
        .bubble-2 {
            width: ${size * 0.04}px;
            height: ${size * 0.04}px;
            right: ${size * 0.25}px;
            top: ${size * 0.32}px;
        }
        
        .bubble-3 {
            width: ${size * 0.06}px;
            height: ${size * 0.06}px;
            left: ${size * 0.3}px;
            bottom: ${size * 0.25}px;
        }
        
        .bubble-4 {
            width: ${size * 0.04}px;
            height: ${size * 0.04}px;
            right: ${size * 0.28}px;
            bottom: ${size * 0.3}px;
        }
        
        .outer-glow {
            position: absolute;
            inset: -${size * 0.02}px;
            border-radius: ${size * 0.26}px;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.1));
            filter: blur(${size * 0.02}px);
            opacity: 0.6;
        }
    </style>
</head>
<body>
    <div class="logo-container">
        <div class="outer-glow"></div>
        <div class="glass-bg"></div>
        <div class="inner-glow"></div>
        <div class="content">
            <div class="central-node"></div>
            <div class="bubble bubble-1"></div>
            <div class="bubble bubble-2"></div>
            <div class="bubble bubble-3"></div>
            <div class="bubble bubble-4"></div>
        </div>
    </div>
</body>
</html>
`;

async function generateIcons() {
  console.log("🎨 Starting PWA icon generation...");

  // Ensure icons directory exists
  const iconsDir = path.join(process.cwd(), "public", "icons");
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    for (const size of ICON_SIZES) {
      console.log(`🔄 Generating ${size}x${size} icon...`);

      // Set viewport to exact icon size
      await page.setViewport({
        width: size,
        height: size,
        deviceScaleFactor: 2,
      });

      // Load HTML with logo
      const html = createLogoHTML(size);
      await page.setContent(html);

      // Wait for any potential animations to settle
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Take screenshot
      const screenshotBuffer = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: size, height: size },
        omitBackground: false,
      });

      // Process with Sharp for optimization
      const iconPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      await sharp(screenshotBuffer)
        .resize(size, size, {
          kernel: "lanczos3",
          fit: "contain",
          background: { r: 2, g: 6, b: 23, alpha: 1 }, // Dark background
        })
        .png({ quality: 100, compressionLevel: 6 })
        .toFile(iconPath);

      console.log(`✅ Generated: ${iconPath}`);
    }

    // Generate additional icons for shortcuts
    console.log("🔄 Generating shortcut icons...");

    // New Chat icon (simple plus on glass background)
    const newChatHTML = `
        <!DOCTYPE html>
        <html>
        <head><style>
            body { margin: 0; padding: 0; width: 96px; height: 96px; background: transparent; display: flex; align-items: center; justify-content: center; }
            .icon { width: 96px; height: 96px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(15, 23, 42, 0.8)); border-radius: 24px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(100, 116, 139, 0.3); }
            .plus { width: 32px; height: 32px; position: relative; }
            .plus::before, .plus::after { content: ''; position: absolute; background: #10b981; }
            .plus::before { width: 32px; height: 4px; top: 14px; }
            .plus::after { height: 32px; width: 4px; left: 14px; }
        </style></head>
        <body><div class="icon"><div class="plus"></div></div></body>
        </html>`;

    await page.setContent(newChatHTML);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const newChatBuffer = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 96, height: 96 },
    });
    await sharp(newChatBuffer)
      .png()
      .toFile(path.join(iconsDir, "new-chat-icon.png"));

    // Settings icon (gear on glass background)
    const settingsHTML = `
        <!DOCTYPE html>
        <html>
        <head><style>
            body { margin: 0; padding: 0; width: 96px; height: 96px; background: transparent; display: flex; align-items: center; justify-content: center; }
            .icon { width: 96px; height: 96px; background: linear-gradient(135deg, rgba(100, 116, 139, 0.2), rgba(15, 23, 42, 0.8)); border-radius: 24px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(100, 116, 139, 0.3); }
            .gear { width: 24px; height: 24px; border: 3px solid #64748b; border-radius: 50%; position: relative; }
            .gear::before { content: ''; position: absolute; inset: 6px; border: 2px solid #64748b; border-radius: 50%; }
        </style></head>
        <body><div class="icon"><div class="gear"></div></div></body>
        </html>`;

    await page.setContent(settingsHTML);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const settingsBuffer = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 96, height: 96 },
    });
    await sharp(settingsBuffer)
      .png()
      .toFile(path.join(iconsDir, "settings-icon.png"));

    console.log("✅ Generated shortcut icons");
  } catch (error) {
    console.error("❌ Error generating icons:", error);
  } finally {
    await browser.close();
  }

  console.log("🎉 PWA icon generation complete!");
  console.log(`📁 Icons saved to: ${iconsDir}`);

  // List generated files
  const files = fs.readdirSync(iconsDir);
  console.log("📋 Generated files:");
  files.forEach((file) => console.log(`   - ${file}`));
}

// Run the generator
if (require.main === module) {
  generateIcons().catch(console.error);
}

module.exports = { generateIcons };
