/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CoinPhysicsState, MetalFinish, Player } from '../types/game';
import {
  COIN_RADIUS,
  COIN_THICKNESS,
  LINE_HALF_WIDTH,
  LINE_Z,
  START_Z,
} from '../physics/coinPhysics';
import {
  createCoinFaceTexture,
  createCoinRimTexture,
  createDirtGroundTexture,
  createGrassTexture,
  createBarkTexture,
  createStartLineTexture,
  createTargetLineTexture,
  METAL_PALETTES,
} from './textures';
import { BoyCharacter, BoyConfig } from './BoyCharacter';

export type CameraViewMode =
  | 'LINE_AIM'
  | 'LINE_FOLLOW'
  | 'LINE_OVERVIEW'
  | 'LINE_BOYS_INSPECT'
  | 'AIR_TOSS';

const BOY_SKIN_TONES = ['#f5d0b5', '#eed4bd', '#dfb896', '#e8be99', '#f3ceb2'];
const BOY_HAIR_COLORS = ['#3f2715', '#1e140d', '#7d4d2b', '#b38148', '#2d1b10'];

export class FantaSceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private animationFrameId: number = 0;
  private isDestroyed: boolean = false;

  // Camera targets
  private targetCameraPos = new THREE.Vector3(0, 2.0, START_Z - 2.2);
  private targetCameraLookAt = new THREE.Vector3(0, 0.6, 0.0);
  private currentCameraLookAt = new THREE.Vector3(0, 0.6, 0.0);

  // Mesh registries
  private coinMeshes: Map<number, THREE.Group> = new Map();
  private trajectoryLine: THREE.Line | null = null;
  private aimArrow: THREE.Group | null = null;
  private distanceLabels: THREE.Group[] = [];

  // 3D Boys
  public boys: BoyCharacter[] = [];
  private activeBoyIndex: number = 0;

  // Material caches
  private coinMaterialsCache: Map<string, THREE.Material[]> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    // Scene & Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbbe3ca);
    this.scene.fog = new THREE.Fog(0xbbe3ca, 26, 65);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Camera
    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    this.camera.position.set(0, 2.0, START_Z - 2.2);
    this.currentCameraLookAt.set(0, 0.6, 0.0);
    this.camera.lookAt(this.currentCameraLookAt);

    this.setupLighting();
    this.setupEnvironment();
    this.setupAimHelpers();

    window.addEventListener('resize', this.handleResize);
    this.startLoop();
  }

  // Initialize or update 3D Boy models based on active players list
  public initBoys(players: Player[]) {
    // Clear existing boys
    for (const b of this.boys) {
      this.scene.remove(b.group);
      b.dispose();
    }
    this.boys = [];

    const pantsColors = ['#1e3a8a', '#374151', '#1f2937', '#155e75', '#334155', '#475569'];

    players.forEach((p, idx) => {
      const config: BoyConfig = {
        id: p.id,
        name: p.name,
        shirtColor: p.color,
        pantsColor: pantsColors[idx % pantsColors.length],
        hasCap: idx % 2 === 0,
        capColor: p.color,
        skinColor: BOY_SKIN_TONES[idx % BOY_SKIN_TONES.length],
        hairColor: BOY_HAIR_COLORS[idx % BOY_HAIR_COLORS.length],
      };

      const boy = new BoyCharacter(config);
      this.boys.push(boy);
      this.scene.add(boy.group);
    });

    this.positionBoysForThrow(0);
  }

  // Position boys during line throw phase
  public positionBoysForThrow(activeIdx: number) {
    this.activeBoyIndex = activeIdx;

    this.boys.forEach((boy, idx) => {
      if (idx === activeIdx) {
        boy.setPosition(0, 0, START_Z - 0.35);
        boy.setRotationY(0); // faces line (Z = 0)
        boy.showCoinsInHand(1);
      } else {
        // Stand along the grassy dirt edge watching
        const side = idx % 2 === 0 ? 1 : -1;
        const row = Math.floor(idx / 2);
        const posX = side * (1.9 + row * 0.65);
        const posZ = START_Z - 0.8 - row * 0.6;
        boy.setPosition(posX, 0, posZ);
        const lookAngle = Math.atan2(-posX, -posZ);
        boy.setRotationY(lookAngle);
        boy.hideCoinsInHand();
      }
    });
  }

  // Trigger boy throwing animation
  public playThrowAnimation(boyIdx: number, onRelease: () => void) {
    const boy = this.boys[boyIdx];
    if (boy) {
      boy.animateThrow(onRelease);
    } else {
      onRelease();
    }
  }

  // Boys walk up to the 3m line to see results, and winning boy gathers coins from floor!
  public boysGatherAroundLine(
    players: Player[],
    winnerIdx: number,
    onCoinsGrabbed: () => void,
    onDone: () => void
  ) {
    this.setCameraMode('LINE_BOYS_INSPECT');

    this.boys.forEach((boy, idx) => {
      if (idx === winnerIdx) {
        boy.moveTo(0, 0.7);
      } else {
        const side = idx > winnerIdx ? 1 : -1;
        const offset = Math.abs(idx - winnerIdx);
        boy.moveTo(side * (0.85 + offset * 0.6), 1.0 + (idx % 2) * 0.3);
      }
    });

    setTimeout(() => {
      const winnerBoy = this.boys[winnerIdx];
      if (winnerBoy) {
        winnerBoy.setRotationY(Math.PI);
        winnerBoy.animatePickUpCoins(
          () => {
            onCoinsGrabbed();
          },
          () => {
            onDone();
          }
        );
      } else {
        onCoinsGrabbed();
        onDone();
      }
    }, 1100);
  }

  // Winner tosses the 5 coins high in the air
  public playAirTossAnimation(winnerIdx: number, onRelease: () => void) {
    const winnerBoy = this.boys[winnerIdx];
    if (winnerBoy) {
      winnerBoy.setPosition(0, 0, 0.4);
      winnerBoy.setRotationY(0);
      winnerBoy.showCoinsInHand(5);
      winnerBoy.animateAirToss(onRelease);
    } else {
      onRelease();
    }
  }

  private setupLighting() {
    // Warm Sun Directional Light (Summer afternoon sun)
    const sunLight = new THREE.DirectionalLight(0xfff5dd, 2.6);
    sunLight.position.set(14, 24, -12);
    sunLight.castShadow = !this.isSoftwareGl;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 60;
      sunLight.shadow.camera.left = -14;
      sunLight.shadow.camera.right = 14;
      sunLight.shadow.camera.top = 20;
      sunLight.shadow.camera.bottom = -20;
      sunLight.shadow.bias = -0.0004;
      sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(sunLight);

    // Natural Sky & Grass Meadow Hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xd9f3ff, 0x4d7c38, 1.1);
    hemiLight.position.set(0, 25, 0);
    this.scene.add(hemiLight);

    // Front soft fill light for boys' faces
    const faceFillLight = new THREE.DirectionalLight(0xffeedd, 0.75);
    faceFillLight.position.set(0, 4, -14);
    this.scene.add(faceFillLight);

    // Subtle Rim backlight
    const rimLight = new THREE.DirectionalLight(0xbbe4ff, 0.5);
    rimLight.position.set(-12, 12, 16);
    this.scene.add(rimLight);
  }

  private setupEnvironment() {
    // 1. Central Packed Dirt / Soil Lane where coins are thrown
    const dirtGeo = new THREE.PlaneGeometry(6.6, 38, 1, 1);
    const dirtTex = createDirtGroundTexture();
    const dirtMat = new THREE.MeshStandardMaterial({
      map: dirtTex,
      roughness: 0.94,
      metalness: 0.05,
    });
    const dirtPlane = new THREE.Mesh(dirtGeo, dirtMat);
    dirtPlane.rotation.x = -Math.PI / 2;
    dirtPlane.position.set(0, 0, -2.5);
    dirtPlane.receiveShadow = !this.isSoftwareGl;
    this.scene.add(dirtPlane);

    // 2. Lush Green Grass Lawns on Left and Right sides
    const grassTex = createGrassTexture();
    const grassMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.88,
      metalness: 0.02,
    });

    // Left Grass
    const leftGrassGeo = new THREE.PlaneGeometry(20, 42, 1, 1);
    const leftGrass = new THREE.Mesh(leftGrassGeo, grassMat);
    leftGrass.rotation.x = -Math.PI / 2;
    leftGrass.position.set(-13.3, 0.004, -2.5);
    leftGrass.receiveShadow = !this.isSoftwareGl;
    this.scene.add(leftGrass);

    // Right Grass
    const rightGrassGeo = new THREE.PlaneGeometry(20, 42, 1, 1);
    const rightGrass = new THREE.Mesh(rightGrassGeo, grassMat);
    rightGrass.rotation.x = -Math.PI / 2;
    rightGrass.position.set(13.3, 0.004, -2.5);
    rightGrass.receiveShadow = !this.isSoftwareGl;
    this.scene.add(rightGrass);

    // Back Meadow Grass behind target area
    const backGrassGeo = new THREE.PlaneGeometry(46, 20, 1, 1);
    const backGrass = new THREE.Mesh(backGrassGeo, grassMat);
    backGrass.rotation.x = -Math.PI / 2;
    backGrass.position.set(0, 0.002, 24);
    backGrass.receiveShadow = !this.isSoftwareGl;
    this.scene.add(backGrass);

    // 3. Volumetric 3D Grass Tufts along the seam between dirt and grass
    this.buildGrassTufts();

    // 4. Target Chalk Line scratched in the dirt (3.0 meters wide)
    const targetLineGeo = new THREE.PlaneGeometry(LINE_HALF_WIDTH * 2 + 0.4, 0.38);
    const targetLineTex = createTargetLineTexture();
    const targetLineMat = new THREE.MeshStandardMaterial({
      map: targetLineTex,
      transparent: true,
      roughness: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const targetLineMesh = new THREE.Mesh(targetLineGeo, targetLineMat);
    targetLineMesh.rotation.x = -Math.PI / 2;
    targetLineMesh.position.set(0, 0.006, LINE_Z);
    this.scene.add(targetLineMesh);

    // Wooden pegged stakes at edges of the 3-meter line
    for (const side of [-1, 1]) {
      const stakeGroup = new THREE.Group();
      stakeGroup.position.set(side * LINE_HALF_WIDTH, 0, LINE_Z);

      // Wooden stake driven in the dirt
      const stakeGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.45, 8);
      const stakeMat = new THREE.MeshStandardMaterial({ color: 0x785331, roughness: 0.8 });
      const stake = new THREE.Mesh(stakeGeo, stakeMat);
      stake.position.y = 0.22;
      stake.castShadow = !this.isSoftwareGl;
      stakeGroup.add(stake);

      // Bright cloth ribbon tied to the stake
      const ribbonGeo = new THREE.BoxGeometry(0.18, 0.08, 0.01);
      const ribbonMat = new THREE.MeshStandardMaterial({
        color: side > 0 ? 0xef4444 : 0x3b82f6,
        roughness: 0.5,
      });
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbon.position.set(side > 0 ? 0.09 : -0.09, 0.38, 0);
      stakeGroup.add(ribbon);

      this.scene.add(stakeGroup);
    }

    // Start Throwing Line in dirt (at -9.8m)
    const startLineGeo = new THREE.PlaneGeometry(4.2, 0.35);
    const startLineTex = createStartLineTexture();
    const startLineMat = new THREE.MeshStandardMaterial({
      map: startLineTex,
      transparent: true,
      roughness: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const startLine = new THREE.Mesh(startLineGeo, startLineMat);
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(0, 0.005, START_Z);
    this.scene.add(startLine);

    // 5. Trees, Bushes & Country Wooden Fence
    this.buildNaturalGreenery();
  }

  // 3D Grass Tufts along the dirt path borders
  private buildGrassTufts() {
    const tuftMatA = new THREE.MeshStandardMaterial({ color: 0x3a8733, roughness: 0.8 });
    const tuftMatB = new THREE.MeshStandardMaterial({ color: 0x519e48, roughness: 0.8 });

    const bladeGeo = new THREE.ConeGeometry(0.035, 0.28, 4);

    for (const side of [-1, 1]) {
      const baseX = side * 3.32;
      for (let z = -14; z <= 12; z += 1.2) {
        const tuftGroup = new THREE.Group();
        tuftGroup.position.set(baseX + (Math.random() - 0.5) * 0.4, 0, z + (Math.random() - 0.5) * 0.4);

        const bladeCount = 5 + Math.floor(Math.random() * 4);
        for (let b = 0; b < bladeCount; b++) {
          const blade = new THREE.Mesh(bladeGeo, Math.random() > 0.5 ? tuftMatA : tuftMatB);
          const angle = Math.random() * Math.PI * 2;
          const tilt = 0.2 + Math.random() * 0.4;
          blade.position.set(Math.cos(angle) * 0.06, 0.14, Math.sin(angle) * 0.06);
          blade.rotation.x = Math.sin(angle) * tilt;
          blade.rotation.z = Math.cos(angle) * tilt;
          blade.scale.set(1, 0.8 + Math.random() * 0.5, 1);
          tuftGroup.add(blade);
        }
        this.scene.add(tuftGroup);
      }
    }
  }

  // Build Procedural Trees, Shrubs, Wooden Fencing
  private buildNaturalGreenery() {
    // Trees on LEFT side (X < -3.5m)
    const leftTreePositions = [
      { x: -5.6, z: -11.5, scale: 1.15, type: 'oak' },
      { x: -7.8, z: -7.0, scale: 1.35, type: 'birch' },
      { x: -5.4, z: -2.0, scale: 1.2, type: 'oak' },
      { x: -7.6, z: 3.5, scale: 1.4, type: 'linden' },
      { x: -5.8, z: 8.5, scale: 1.25, type: 'oak' },
    ];

    // Trees on RIGHT side (X > 3.5m)
    const rightTreePositions = [
      { x: 5.6, z: -11.0, scale: 1.2, type: 'linden' },
      { x: 7.8, z: -6.5, scale: 1.3, type: 'oak' },
      { x: 5.5, z: -1.5, scale: 1.15, type: 'birch' },
      { x: 7.5, z: 4.0, scale: 1.45, type: 'oak' },
      { x: 5.8, z: 9.0, scale: 1.25, type: 'linden' },
    ];

    // Background Trees (Z > 9m)
    const backTreePositions = [
      { x: -3.5, z: 12.5, scale: 1.4, type: 'oak' },
      { x: 0.0, z: 14.0, scale: 1.5, type: 'linden' },
      { x: 3.5, z: 13.0, scale: 1.35, type: 'oak' },
      { x: -7.0, z: 14.5, scale: 1.5, type: 'birch' },
      { x: 7.0, z: 14.0, scale: 1.5, type: 'linden' },
    ];

    [...leftTreePositions, ...rightTreePositions, ...backTreePositions].forEach((cfg) => {
      this.createProceduralTree(cfg.x, cfg.z, cfg.scale);
    });

    // Fluffy Green Bushes on the grass lawn
    const bushPositions = [
      { x: -4.4, z: -9.0, rad: 0.9 },
      { x: -4.6, z: -4.5, rad: 1.1 },
      { x: -4.3, z: 1.0, rad: 0.85 },
      { x: -4.5, z: 6.0, rad: 1.0 },
      { x: 4.4, z: -8.5, rad: 0.95 },
      { x: 4.5, z: -4.0, rad: 1.05 },
      { x: 4.3, z: 1.5, rad: 0.8 },
      { x: 4.6, z: 6.5, rad: 1.1 },
      { x: -1.8, z: 10.5, rad: 1.2 },
      { x: 1.8, z: 11.0, rad: 1.15 },
    ];

    bushPositions.forEach((b) => {
      this.createProceduralBush(b.x, b.z, b.rad);
    });

    // Rustic wooden post-and-rail fence along back and side boundaries
    this.buildRusticFence();

    // Wooden park bench resting under the shade of a side tree
    const benchGroup = new THREE.Group();
    benchGroup.position.set(-4.5, 0, -4.0);
    benchGroup.rotation.y = Math.PI / 2;

    const legMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d5b36, roughness: 0.7 });

    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.55), legMat);
    lLeg.position.set(-0.7, 0.24, 0);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.55), legMat);
    rLeg.position.set(0.7, 0.24, 0);
    benchGroup.add(lLeg, rLeg);

    for (let p = 0; p < 3; p++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.04, 0.16), woodMat);
      plank.position.set(0, 0.49, -0.16 + p * 0.17);
      plank.castShadow = !this.isSoftwareGl;
      benchGroup.add(plank);
    }
    this.scene.add(benchGroup);
  }

  // Composite 3–12 part procedural tree
  private createProceduralTree(x: number, z: number, scale: number = 1.0) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    // Textured bark trunk
    const barkTex = createBarkTexture();
    const trunkMat = new THREE.MeshStandardMaterial({
      map: barkTex,
      roughness: 0.92,
      color: 0x5a3d28,
    });

    const trunkHeight = 2.8 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, trunkHeight, 10);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = !this.isSoftwareGl;
    treeGroup.add(trunk);

    // Flared root base
    const rootGeo = new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, 0.3 * scale, 8);
    const roots = new THREE.Mesh(rootGeo, trunkMat);
    roots.position.y = (0.3 * scale) / 2;
    treeGroup.add(roots);

    // Lateral branches
    const branchGeo = new THREE.CylinderGeometry(0.08 * scale, 0.11 * scale, 1.2 * scale, 8);
    const branchA = new THREE.Mesh(branchGeo, trunkMat);
    branchA.position.set(0.35 * scale, trunkHeight * 0.75, 0);
    branchA.rotation.z = -0.7;
    const branchB = new THREE.Mesh(branchGeo, trunkMat);
    branchB.position.set(-0.35 * scale, trunkHeight * 0.85, 0.1 * scale);
    branchB.rotation.z = 0.65;
    treeGroup.add(branchA, branchB);

    // Multi-tier lush foliage crowns (4 spheres with varied green shades)
    const leafColors = [0x2f6b32, 0x3d823f, 0x479449, 0x275929];
    const crownOffsets = [
      { x: 0, y: trunkHeight + 0.6 * scale, z: 0, r: 1.45 * scale, c: leafColors[0] },
      { x: 0.45 * scale, y: trunkHeight + 0.4 * scale, z: 0.3 * scale, r: 1.15 * scale, c: leafColors[1] },
      { x: -0.45 * scale, y: trunkHeight + 0.5 * scale, z: -0.25 * scale, r: 1.2 * scale, c: leafColors[2] },
      { x: 0.1 * scale, y: trunkHeight + 1.25 * scale, z: 0.1 * scale, r: 1.05 * scale, c: leafColors[3] },
    ];

    crownOffsets.forEach((cr) => {
      const crownMat = new THREE.MeshStandardMaterial({
        color: cr.c,
        roughness: 0.85,
      });
      const crownMesh = new THREE.Mesh(new THREE.SphereGeometry(cr.r, 12, 10), crownMat);
      crownMesh.position.set(cr.x, cr.y, cr.z);
      crownMesh.castShadow = !this.isSoftwareGl;
      treeGroup.add(crownMesh);
    });

    this.scene.add(treeGroup);
  }

  // Procedural bush clump
  private createProceduralBush(x: number, z: number, radius: number = 0.9) {
    const bushGroup = new THREE.Group();
    bushGroup.position.set(x, 0, z);

    const bushMatA = new THREE.MeshStandardMaterial({ color: 0x367c33, roughness: 0.88 });
    const bushMatB = new THREE.MeshStandardMaterial({ color: 0x489445, roughness: 0.88 });

    const c1 = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), bushMatA);
    c1.position.set(0, radius * 0.7, 0);
    c1.castShadow = !this.isSoftwareGl;

    const c2 = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.75, 8, 6), bushMatB);
    c2.position.set(radius * 0.4, radius * 0.55, radius * 0.2);

    const c3 = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.7, 8, 6), bushMatA);
    c3.position.set(-radius * 0.35, radius * 0.5, -radius * 0.2);

    bushGroup.add(c1, c2, c3);
    this.scene.add(bushGroup);
  }

  // Rustic wooden rail fence
  private buildRusticFence() {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x6d4c31, roughness: 0.85 });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.1, 8);
    const railGeo = new THREE.BoxGeometry(2.8, 0.08, 0.05);

    // Back fence at Z = 10.0m
    for (let x = -10; x <= 10; x += 2.6) {
      const post = new THREE.Mesh(postGeo, fenceMat);
      post.position.set(x, 0.55, 10.0);
      post.castShadow = !this.isSoftwareGl;
      this.scene.add(post);

      if (x < 10) {
        const topRail = new THREE.Mesh(railGeo, fenceMat);
        topRail.position.set(x + 1.3, 0.85, 10.0);
        const midRail = new THREE.Mesh(railGeo, fenceMat);
        midRail.position.set(x + 1.3, 0.5, 10.0);
        this.scene.add(topRail, midRail);
      }
    }
  }

  private setupAimHelpers() {
    // Trajectory arc line
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 30; i++) points.push(new THREE.Vector3());
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xffd700,
      dashSize: 0.25,
      gapSize: 0.15,
      linewidth: 2,
    });
    this.trajectoryLine = new THREE.Line(lineGeo, lineMat);
    this.trajectoryLine.computeLineDistances();
    this.scene.add(this.trajectoryLine);

    // Aim direction arrow on ground
    this.aimArrow = new THREE.Group();
    const arrowShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.8, 12),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.4 })
    );
    arrowShaft.rotation.x = Math.PI / 2;
    arrowShaft.position.z = 0.9;

    const arrowHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.5 })
    );
    arrowHead.rotation.x = Math.PI / 2;
    arrowHead.position.z = 1.95;

    this.aimArrow.add(arrowShaft, arrowHead);
    this.aimArrow.position.set(0, 0.02, START_Z);
    this.scene.add(this.aimArrow);
  }

  // Get or create 3-material coin array [rim, heads, tails]
  private getCoinMaterials(metal: MetalFinish): THREE.Material[] {
    if (this.coinMaterialsCache.has(metal)) {
      return this.coinMaterialsCache.get(metal)!;
    }

    const palette = METAL_PALETTES[metal];
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const headsTex = createCoinFaceTexture(metal, 'HEADS', maxAniso);
    const tailsTex = createCoinFaceTexture(metal, 'TAILS', maxAniso);
    const rimTex = createCoinRimTexture(metal);

    const rimMat = new THREE.MeshStandardMaterial({
      map: rimTex,
      metalness: palette.metalness,
      roughness: palette.roughness,
    });

    const headsMat = new THREE.MeshStandardMaterial({
      map: headsTex,
      metalness: palette.metalness,
      roughness: palette.roughness,
    });

    const tailsMat = new THREE.MeshStandardMaterial({
      map: tailsTex,
      metalness: palette.metalness,
      roughness: palette.roughness,
    });

    const mats = [rimMat, headsMat, tailsMat];
    this.coinMaterialsCache.set(metal, mats);
    return mats;
  }

  // Create 3D coin group
  private createCoinMesh(coin: CoinPhysicsState): THREE.Group {
    const group = new THREE.Group();

    const coinGeo = new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, 40);
    const mats = this.getCoinMaterials(coin.metal);
    const coinMesh = new THREE.Mesh(coinGeo, mats);
    coinMesh.castShadow = !this.isSoftwareGl;
    coinMesh.receiveShadow = !this.isSoftwareGl;
    group.add(coinMesh);

    // Soft grounded contact shadow
    const shadowGeo = new THREE.PlaneGeometry(COIN_RADIUS * 2.4, COIN_RADIUS * 2.4);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -COIN_THICKNESS / 2 + 0.002;
    group.add(shadowMesh);

    group.position.set(coin.x, coin.y, coin.z);
    this.scene.add(group);
    this.coinMeshes.set(coin.id, group);
    return group;
  }

  // Update Aim line preview matching new gravity (15.2) and speed
  public updateAimPreview(aimAngleRad: number, powerRatio: number, pitchAngleRad: number = 0.28) {
    if (this.aimArrow) {
      this.aimArrow.rotation.y = -aimAngleRad;
      const arrowLength = 1.0 + powerRatio * 1.5;
      this.aimArrow.scale.set(1, 1, arrowLength / 2.0);
    }

    if (this.trajectoryLine) {
      const speed = 8.5 + powerRatio * 8.0;
      const vH = speed * Math.cos(pitchAngleRad);
      const vy = speed * Math.sin(pitchAngleRad);
      const vx = Math.sin(aimAngleRad) * vH;
      const vz = Math.cos(aimAngleRad) * vH;

      const pos = this.trajectoryLine.geometry.attributes.position as THREE.BufferAttribute;
      let currX = 0;
      let currY = 1.15;
      let currZ = START_Z;
      let currVy = vy;
      const simDt = 0.032;

      for (let i = 0; i <= 30; i++) {
        pos.setXYZ(i, currX, Math.max(0.02, currY), currZ);
        currX += vx * simDt;
        currZ += vz * simDt;
        currY += currVy * simDt;
        currVy -= 15.2 * simDt;
        if (currY < 0.02 && i > 5) {
          currVy = 0;
          currY = 0.02;
        }
      }
      pos.needsUpdate = true;
      this.trajectoryLine.computeLineDistances();
      this.trajectoryLine.visible = true;
    }
  }

  public setAimHelpersVisible(visible: boolean) {
    if (this.aimArrow) this.aimArrow.visible = visible;
    if (this.trajectoryLine) this.trajectoryLine.visible = visible;
  }

  // Synchronize physics coins with 3D scene
  public syncCoins(coins: CoinPhysicsState[]) {
    const currentIds = new Set(coins.map((c) => c.id));
    for (const [id, mesh] of this.coinMeshes.entries()) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.coinMeshes.delete(id);
      }
    }

    for (const coin of coins) {
      let mesh = this.coinMeshes.get(coin.id);
      if (!mesh) {
        mesh = this.createCoinMesh(coin);
      }

      mesh.position.set(coin.x, coin.y, coin.z);
      mesh.rotation.set(coin.rotX, coin.rotY, coin.rotZ);

      const shadow = mesh.children[1] as THREE.Mesh;
      if (shadow && shadow.material) {
        const distFromGround = coin.y - COIN_THICKNESS / 2;
        const shadowMat = shadow.material as THREE.MeshBasicMaterial;
        if (distFromGround > 2.0) {
          shadow.visible = false;
        } else {
          shadow.visible = true;
          shadowMat.opacity = Math.max(0, 0.7 - distFromGround * 0.35);
          const shadowScale = 1 + distFromGround * 0.6;
          shadow.scale.set(shadowScale, shadowScale, 1);
        }
      }
    }
  }

  // Clear all coins
  public clearCoins() {
    for (const mesh of this.coinMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.coinMeshes.clear();
    this.clearDistanceLabels();
  }

  public clearDistanceLabels() {
    for (const lbl of this.distanceLabels) {
      this.scene.remove(lbl);
    }
    this.distanceLabels = [];
  }

  // Show floating 3D distance badge and chalk dotted line to the 3m mark
  public showDistanceMarker(
    coin: CoinPhysicsState,
    rank: number,
    playerName: string,
    colorHex: string
  ) {
    const group = new THREE.Group();
    group.position.set(coin.x, 0.05, coin.z);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.roundRect(4, 4, 248, 120, 16);
    ctx.fill();

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 6;
    ctx.roundRect(4, 4, 248, 120, 16);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${rank}. ${playerName}`, 128, 42);

    const distCm = ((coin.distanceToLine || 0) * 100).toFixed(1);
    ctx.fillStyle = '#fde047';
    ctx.font = '900 34px sans-serif';
    ctx.fillText(`${distCm} cm`, 128, 88);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.2, 0.6, 1);
    sprite.position.y = 0.5;
    group.add(sprite);

    // Dotted chalk line connecting coin to target line
    const targetZ = LINE_Z;
    const targetX = Math.min(Math.max(coin.x, -LINE_HALF_WIDTH), LINE_HALF_WIDTH);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(targetX - coin.x, 0, targetZ - coin.z),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.1,
      gapSize: 0.05,
    });
    const connector = new THREE.Line(lineGeo, lineMat);
    connector.computeLineDistances();
    group.add(connector);

    this.scene.add(group);
    this.distanceLabels.push(group);
  }

  // Camera transitions
  public setCameraMode(mode: CameraViewMode, focusObject?: CoinPhysicsState) {
    switch (mode) {
      case 'LINE_AIM':
        // Over-the-shoulder view showing boy's back, head, arm holding coin and the line ahead
        this.targetCameraPos.set(0.2, 1.85, START_Z - 1.8);
        this.targetCameraLookAt.set(0, 0.7, 0.0);
        break;
      case 'LINE_FOLLOW':
        if (focusObject) {
          this.targetCameraPos.set(focusObject.x * 0.4, 1.6, focusObject.z - 2.8);
          this.targetCameraLookAt.set(focusObject.x, 0.2, focusObject.z + 2.0);
        }
        break;
      case 'LINE_OVERVIEW':
        this.targetCameraPos.set(0, 3.6, -4.2);
        this.targetCameraLookAt.set(0, 0.0, 0.2);
        break;
      case 'LINE_BOYS_INSPECT':
        // Front cinematic camera showing the boys' faces as they walk up and inspect the line!
        this.targetCameraPos.set(0.0, 1.25, -1.8);
        this.targetCameraLookAt.set(0.0, 0.95, 0.8);
        break;
      case 'AIR_TOSS':
        // Low upward view showing the winning boy tossing the coins into the sky
        this.targetCameraPos.set(0, 0.85, -1.8);
        this.targetCameraLookAt.set(0, 1.6, 0.4);
        break;
    }
  }

  private handleResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private startLoop() {
    let lastTime = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.isDestroyed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.animationFrameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          this.animationFrameId = window.setTimeout(cb, 80);
        }
      };
      this.animationFrameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.isDestroyed) return;

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Update 3D boys walking / animations
      for (const boy of this.boys) {
        boy.update(delta);
      }

      // Smooth camera interpolation
      const dampFactor = 1 - Math.exp(-5.5 * delta);
      this.camera.position.lerp(this.targetCameraPos, dampFactor);
      this.currentCameraLookAt.lerp(this.targetCameraLookAt, dampFactor);
      this.camera.lookAt(this.currentCameraLookAt);

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.animationFrameId = requestAnimationFrame(tick);
    }
  }

  public dispose() {
    this.isDestroyed = true;
    window.removeEventListener('resize', this.handleResize);
    cancelAnimationFrame(this.animationFrameId);
    clearTimeout(this.animationFrameId);

    for (const b of this.boys) {
      this.scene.remove(b.group);
      b.dispose();
    }
    this.boys = [];

    this.clearCoins();
    this.clearDistanceLabels();

    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
