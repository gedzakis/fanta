/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { MetalFinish } from '../types/game';

interface MetalPalette {
  base: string;
  light: string;
  dark: string;
  relief: string;
  shadow: string;
  roughness: number;
  metalness: number;
}

export const METAL_PALETTES: Record<MetalFinish, MetalPalette> = {
  gold: {
    base: '#d4af37',
    light: '#ffe57f',
    dark: '#8c6b16',
    relief: '#fff2a8',
    shadow: '#59440c',
    roughness: 0.22,
    metalness: 0.95,
  },
  silver: {
    base: '#c0c5cc',
    light: '#f2f4f8',
    dark: '#7e838b',
    relief: '#ffffff',
    shadow: '#494d52',
    roughness: 0.25,
    metalness: 0.92,
  },
  bronze: {
    base: '#a5682a',
    light: '#d99757',
    dark: '#61390f',
    relief: '#ebb278',
    shadow: '#381e05',
    roughness: 0.32,
    metalness: 0.88,
  },
  brass: {
    base: '#c99e32',
    light: '#edd46d',
    dark: '#785b14',
    relief: '#fae896',
    shadow: '#4a370b',
    roughness: 0.28,
    metalness: 0.9,
  },
  copper: {
    base: '#b85433',
    light: '#e88664',
    dark: '#6e2b14',
    relief: '#f2a688',
    shadow: '#421606',
    roughness: 0.3,
    metalness: 0.9,
  },
  steel: {
    base: '#758296',
    light: '#b0becc',
    dark: '#454f5c',
    relief: '#d8e2eb',
    shadow: '#292f38',
    roughness: 0.35,
    metalness: 0.85,
  },
};

export function createCoinFaceTexture(
  metal: MetalFinish,
  face: 'HEADS' | 'TAILS',
  anisotropy: number = 8
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const palette = METAL_PALETTES[metal];

  const cx = 256;
  const cy = 256;
  const radius = 246;

  // Background radial brushed metallic gradient
  const grad = ctx.createRadialGradient(cx - 50, cy - 50, 20, cx, cy, radius);
  grad.addColorStop(0, palette.light);
  grad.addColorStop(0.4, palette.base);
  grad.addColorStop(0.85, palette.dark);
  grad.addColorStop(1, palette.shadow);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle circular lathe/brush rings
  ctx.lineWidth = 1;
  for (let r = 30; r < radius - 15; r += 6) {
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Beaded outer rim
  const beadCount = 64;
  const beadRadius = radius - 16;
  for (let i = 0; i < beadCount; i++) {
    const angle = (i / beadCount) * Math.PI * 2;
    const bx = cx + Math.cos(angle) * beadRadius;
    const by = cy + Math.sin(angle) * beadRadius;

    ctx.fillStyle = palette.shadow;
    ctx.beginPath();
    ctx.arc(bx + 1, by + 1, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.relief;
    ctx.beginPath();
    ctx.arc(bx, by, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Inner ring
  ctx.strokeStyle = palette.relief;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 32, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = palette.shadow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 34, 0, Math.PI * 2);
  ctx.stroke();

  if (face === 'HEADS') {
    // HEADS (GLAVA)
    // Curved text top: "FANTA • BACANIK"
    ctx.save();
    ctx.fillStyle = palette.relief;
    ctx.shadowColor = palette.shadow;
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.font = 'bold 22px "Cinzel", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = '★ FANTA • BACANIK ★';
    const arcRadius = radius - 55;
    const startAngle = -Math.PI * 0.75;
    const endAngle = -Math.PI * 0.25;
    const angleStep = (endAngle - startAngle) / (text.length - 1);

    for (let i = 0; i < text.length; i++) {
      const charAngle = startAngle + i * angleStep;
      ctx.save();
      ctx.translate(cx + Math.cos(charAngle) * arcRadius, cy + Math.sin(charAngle) * arcRadius);
      ctx.rotate(charAngle + Math.PI / 2);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // Central Emblem: Majestic Double-Headed Crowned Eagle / Royal Crest
    ctx.save();
    ctx.translate(cx, cy - 8);

    // Embossed shadow
    ctx.fillStyle = palette.shadow;
    drawEagleShield(ctx, 2, 2, palette.shadow);

    // Embossed relief
    ctx.fillStyle = palette.relief;
    drawEagleShield(ctx, 0, 0, palette.relief);
    ctx.restore();

    // Bottom banner with "GLAVA"
    ctx.save();
    ctx.fillStyle = palette.shadow;
    ctx.font = '900 32px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GLAVA', cx + 2, cy + 152);
    ctx.fillStyle = palette.relief;
    ctx.fillText('GLAVA', cx, cy + 150);

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = palette.relief;
    ctx.fillText('1984', cx, cy + 180);
    ctx.restore();

  } else {
    // TAILS (PISMO)
    // Large prominent numeral "100" in center
    ctx.save();
    ctx.shadowColor = palette.shadow;
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    ctx.font = '900 105px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = palette.shadow;
    ctx.fillText('100', cx + 2, cy - 18);
    ctx.fillStyle = palette.relief;
    ctx.fillText('100', cx, cy - 20);

    // Laurel branches / wreath curve on sides
    drawLaurelWreath(ctx, cx, cy - 10, radius - 75, palette);

    // Bottom banner: "PISMO"
    ctx.font = '900 34px "Trebuchet MS", sans-serif';
    ctx.fillStyle = palette.shadow;
    ctx.fillText('PISMO', cx + 2, cy + 82);
    ctx.fillStyle = palette.relief;
    ctx.fillText('PISMO', cx, cy + 80);

    // Top text: "NARODNA IGRA"
    ctx.font = 'bold 20px "Cinzel", "Times New Roman", serif';
    ctx.fillText('• DINARA •', cx, cy + 125);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

// Procedural rim pattern for coin edge (coin ridges / reeding)
export function createCoinRimTexture(metal: MetalFinish): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const palette = METAL_PALETTES[metal];

  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Vertical reeding grooves
  const stripeWidth = 4;
  for (let x = 0; x < canvas.width; x += stripeWidth * 2) {
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(x, 0, stripeWidth, canvas.height);
    ctx.fillStyle = palette.relief;
    ctx.fillRect(x + stripeWidth, 0, stripeWidth, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

function drawEagleShield(ctx: CanvasRenderingContext2D, ox: number, oy: number, color: string) {
  ctx.fillStyle = color;
  // Crown at top
  ctx.beginPath();
  ctx.moveTo(ox - 30, oy - 70);
  ctx.lineTo(ox - 36, oy - 90);
  ctx.lineTo(ox - 15, oy - 78);
  ctx.lineTo(ox, oy - 95);
  ctx.lineTo(ox + 15, oy - 78);
  ctx.lineTo(ox + 36, oy - 90);
  ctx.lineTo(ox + 30, oy - 70);
  ctx.closePath();
  ctx.fill();

  // Double heads
  ctx.beginPath();
  // Left head & beak
  ctx.arc(ox - 22, oy - 55, 14, 0, Math.PI * 2);
  ctx.arc(ox + 22, oy - 55, 14, 0, Math.PI * 2);
  ctx.fill();

  // Beaks
  ctx.beginPath();
  ctx.moveTo(ox - 32, oy - 57);
  ctx.lineTo(ox - 48, oy - 53);
  ctx.lineTo(ox - 32, oy - 48);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(ox + 32, oy - 57);
  ctx.lineTo(ox + 48, oy - 53);
  ctx.lineTo(ox + 32, oy - 48);
  ctx.closePath();
  ctx.fill();

  // Wings spread
  ctx.beginPath();
  ctx.moveTo(ox, oy - 45);
  ctx.quadraticCurveTo(ox - 65, oy - 55, ox - 90, oy - 25);
  ctx.quadraticCurveTo(ox - 70, oy + 5, ox - 35, oy + 25);
  ctx.lineTo(ox, oy + 10);
  ctx.lineTo(ox + 35, oy + 25);
  ctx.quadraticCurveTo(ox + 70, oy + 5, ox + 90, oy - 25);
  ctx.quadraticCurveTo(ox + 65, oy - 55, ox, oy - 45);
  ctx.fill();

  // Central Shield
  ctx.beginPath();
  ctx.moveTo(ox - 24, oy - 25);
  ctx.lineTo(ox + 24, oy - 25);
  ctx.lineTo(ox + 24, oy + 15);
  ctx.quadraticCurveTo(ox + 20, oy + 42, ox, oy + 55);
  ctx.quadraticCurveTo(ox - 20, oy + 42, ox - 24, oy + 15);
  ctx.closePath();
  ctx.fill();

  // Cross in shield (in negative tone if drawn)
  ctx.strokeStyle = color === '#fff2a8' || color === '#ffffff' ? '#59440c' : '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ox, oy - 15);
  ctx.lineTo(ox, oy + 35);
  ctx.moveTo(ox - 14, oy);
  ctx.lineTo(ox + 14, oy);
  ctx.stroke();
}

function drawLaurelWreath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  palette: MetalPalette
) {
  // Left branch & Right branch
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const angle = Math.PI * 0.5 + side * (0.35 + i * 0.14);
      const lx = cx + Math.cos(angle) * radius;
      const ly = cy + Math.sin(angle) * (radius * 0.9);

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle + (side > 0 ? -0.8 : 0.8));

      // Leaf pair
      ctx.fillStyle = palette.shadow;
      ctx.beginPath();
      ctx.ellipse(1, 1, 14, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.relief;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

// Packed dry earth / dirt soil ground texture
export function createDirtGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Warm rich earth/soil base
  ctx.fillStyle = '#6b4f35';
  ctx.fillRect(0, 0, 1024, 1024);

  // Irregular organic patches of lighter dry dirt and darker damp soil
  for (let i = 0; i < 40; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const rad = 80 + Math.random() * 160;
    const grad = ctx.createRadialGradient(px, py, 10, px, py, rad);
    const isDark = Math.random() > 0.45;
    grad.addColorStop(0, isDark ? 'rgba(74, 53, 34, 0.45)' : 'rgba(148, 114, 82, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine soil grains and pebbles
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random();
    if (r < 0.08) {
      // Small pebble
      ctx.fillStyle = Math.random() > 0.5 ? '#9e9488' : '#45382c';
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + Math.random() * 3, 1.5 + Math.random() * 2, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Soil grain speckle
      ctx.fillStyle = r > 0.5 ? 'rgba(210, 175, 135, 0.25)' : 'rgba(38, 26, 16, 0.35)';
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  // Fine dry ground micro-cracks
  ctx.strokeStyle = 'rgba(45, 30, 18, 0.35)';
  ctx.lineWidth = 1.2;
  for (let c = 0; c < 12; c++) {
    let px = Math.random() * 1024;
    let py = Math.random() * 1024;
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let seg = 0; seg < 5; seg++) {
      px += (Math.random() - 0.5) * 45;
      py += (Math.random() - 0.5) * 45;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Lush Green Lawn / Meadow Grass Texture
export function createGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep meadow green base
  ctx.fillStyle = '#2f632d';
  ctx.fillRect(0, 0, 1024, 1024);

  // Soft patches of lighter clover green and deep forest green
  for (let i = 0; i < 35; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const rad = 70 + Math.random() * 140;
    const grad = ctx.createRadialGradient(px, py, 10, px, py, rad);
    const isBright = Math.random() > 0.4;
    grad.addColorStop(0, isBright ? 'rgba(84, 158, 62, 0.55)' : 'rgba(28, 66, 26, 0.5)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dense grass blades noise
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const h = 3 + Math.random() * 5;
    ctx.strokeStyle = Math.random() > 0.4 ? 'rgba(110, 190, 75, 0.35)' : 'rgba(22, 54, 20, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 2, y - h);
    ctx.stroke();
  }

  // Little yellow/white meadow flowers (daisies/buttercups)
  for (let f = 0; f < 75; f++) {
    const fx = Math.random() * 1024;
    const fy = Math.random() * 1024;
    ctx.fillStyle = Math.random() > 0.5 ? '#fef08a' : '#ffffff';
    ctx.beginPath();
    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Bark texture for tree trunks
export function createBarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4a3320';
  ctx.fillRect(0, 0, 256, 512);

  // Vertical bark ridges
  for (let x = 0; x < 256; x += 4) {
    const shade = Math.random() > 0.5 ? 'rgba(40, 26, 14, 0.5)' : 'rgba(110, 85, 60, 0.4)';
    ctx.fillStyle = shade;
    ctx.fillRect(x, 0, 3 + Math.random() * 2, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 3-meter Target Line Scratched in Earth & marked with white chalk
export function createTargetLineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Darker groove furrow in dirt
  ctx.fillStyle = 'rgba(38, 24, 12, 0.6)';
  ctx.fillRect(40, 48, 944, 32);

  // White chalk/lime powder line poured into the furrow
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255, 255, 245, 0)');
  grad.addColorStop(0.25, 'rgba(255, 255, 240, 0.8)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)');
  grad.addColorStop(0.75, 'rgba(255, 255, 240, 0.8)');
  grad.addColorStop(1, 'rgba(255, 255, 245, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(40, 42, 944, 44);

  // Rough chalk dust grains spilling on the dirt
  for (let i = 0; i < 500; i++) {
    const x = 36 + Math.random() * 952;
    const y = 32 + Math.random() * 64;
    ctx.fillStyle = `rgba(255, 255, 250, ${Math.random() * 0.5 + 0.2})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Text in center: "CRTA U ZEMLJI (3.0 m)"
  ctx.fillStyle = '#26180c';
  ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('━━━  C R T A   U   Z E M L J I   ( 3.0 m )  ━━━', 512, 64);

  // Meter distance ticks
  ctx.fillStyle = '#3a2614';
  ctx.fillRect(512, 42, 3, 14); // 0m center
  ctx.fillRect(256, 46, 2, 10);
  ctx.fillRect(768, 46, 2, 10);
  ctx.fillRect(60, 44, 3, 12);
  ctx.fillRect(964, 44, 3, 12);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Start line in dirt
export function createStartLineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255, 235, 140, 0)');
  grad.addColorStop(0.25, 'rgba(255, 235, 140, 0.7)');
  grad.addColorStop(0.5, 'rgba(255, 240, 160, 0.95)');
  grad.addColorStop(0.75, 'rgba(255, 235, 140, 0.7)');
  grad.addColorStop(1, 'rgba(255, 235, 140, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(70, 48, 884, 32);

  ctx.fillStyle = '#26180c';
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('◄  STARTNA LINIJA (10m)  ►', 512, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

