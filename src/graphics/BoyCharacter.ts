/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface BoyConfig {
  id: string;
  name: string;
  shirtColor: string;
  pantsColor: string;
  capColor?: string;
  hasCap: boolean;
  skinColor: string;
  hairColor: string;
}

export class BoyCharacter {
  public group: THREE.Group;
  public config: BoyConfig;

  // Body parts for animation
  private head: THREE.Group;
  private torso: THREE.Mesh;
  private rightArm: THREE.Group;
  private leftArm: THREE.Group;
  private rightHand: THREE.Mesh;
  private rightLeg: THREE.Group;
  private leftLeg: THREE.Group;
  private coinInHand: THREE.Group | null = null;

  // Animation states
  private walkTime: number = 0;
  public isWalking: boolean = false;
  public isCrouching: boolean = false;
  private targetPosition = new THREE.Vector3();
  private isDestroyed: boolean = false;

  constructor(config: BoyConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.name = `boy-${config.name}`;

    const skinMat = new THREE.MeshStandardMaterial({
      color: config.skinColor,
      roughness: 0.6,
      metalness: 0.05,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: config.shirtColor,
      roughness: 0.7,
      metalness: 0.05,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: config.pantsColor,
      roughness: 0.8,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.5,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: config.hairColor,
      roughness: 0.9,
    });

    // --- LEGS ---
    // Right leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.12, 0.45, 0);
    const legGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.45, 10);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rightLegMesh.position.y = -0.225;
    this.rightLeg.add(rightLegMesh);

    const shoeGeo = new THREE.BoxGeometry(0.11, 0.08, 0.18);
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.42, 0.04);
    this.rightLeg.add(rightShoe);
    this.group.add(this.rightLeg);

    // Left leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.12, 0.45, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
    leftLegMesh.position.y = -0.225;
    this.leftLeg.add(leftLegMesh);

    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.42, 0.04);
    this.leftLeg.add(leftShoe);
    this.group.add(this.leftLeg);

    // --- TORSO / SHIRT ---
    const torsoGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.52, 12);
    this.torso = new THREE.Mesh(torsoGeo, shirtMat);
    this.torso.position.set(0, 0.71, 0);
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Collar
    const collarGeo = new THREE.TorusGeometry(0.11, 0.025, 8, 16);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.97, 0);
    this.group.add(collar);

    // --- HEAD WITH DETAILED BOY FACE ---
    this.head = new THREE.Group();
    this.head.position.set(0, 1.14, 0);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.065, 0.07, 0.12, 10);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = -0.11;
    this.head.add(neck);

    // Head base sphere
    const headGeo = new THREE.SphereGeometry(0.17, 16, 14);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // EYES (Beonjače + Zenice)
    const eyeWhiteGeo = new THREE.SphereGeometry(0.038, 10, 8);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const pupilGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111827 });

    // Right Eye
    const rightEye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    rightEye.position.set(0.065, 0.03, 0.145);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.068, 0.03, 0.172);
    this.head.add(rightEye, rightPupil);

    // Left Eye
    const leftEye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    leftEye.position.set(-0.065, 0.03, 0.145);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.068, 0.03, 0.172);
    this.head.add(leftEye, leftPupil);

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(0.045, 0.012, 0.015);
    const rightBrow = new THREE.Mesh(browGeo, hairMat);
    rightBrow.position.set(0.065, 0.08, 0.155);
    rightBrow.rotation.z = -0.1;
    const leftBrow = new THREE.Mesh(browGeo, hairMat);
    leftBrow.position.set(-0.065, 0.08, 0.155);
    leftBrow.rotation.z = 0.1;
    this.head.add(rightBrow, leftBrow);

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.022, 0.045, 8);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 0.0, 0.18);
    nose.rotation.x = Math.PI / 2;
    this.head.add(nose);

    // Cheerful Smile / Mouth
    const smileGeo = new THREE.TorusGeometry(0.035, 0.009, 6, 12, Math.PI);
    const smileMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });
    const smile = new THREE.Mesh(smileGeo, smileMat);
    smile.rotation.x = Math.PI;
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.055, 0.165);
    this.head.add(smile);

    // Rosy Cheeks
    const cheekGeo = new THREE.CircleGeometry(0.025, 8);
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.6 });
    const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
    rightCheek.position.set(0.1, -0.02, 0.15);
    rightCheek.rotation.y = 0.4;
    const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
    leftCheek.position.set(-0.1, -0.02, 0.15);
    leftCheek.rotation.y = -0.4;
    this.head.add(rightCheek, leftCheek);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.scale.set(0.4, 0.9, 0.6);
    rightEar.position.set(0.175, 0.01, 0);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.scale.set(0.4, 0.9, 0.6);
    leftEar.position.set(-0.175, 0.01, 0);
    this.head.add(rightEar, leftEar);

    // Hair or Baseball Cap
    if (config.hasCap) {
      const capMat = new THREE.MeshStandardMaterial({
        color: config.capColor || 0xd97706,
        roughness: 0.6,
      });
      // Cap dome
      const capDomeGeo = new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const capDome = new THREE.Mesh(capDomeGeo, capMat);
      capDome.position.y = 0.05;
      this.head.add(capDome);

      // Cap visor / brim
      const visorGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.02, 16, 1, false, -Math.PI * 0.35, Math.PI * 0.7);
      const visor = new THREE.Mesh(visorGeo, capMat);
      visor.position.set(0, 0.06, 0.05);
      visor.rotation.x = -0.15;
      this.head.add(visor);
    } else {
      // Fluffy boy hair
      const hairGeo = new THREE.SphereGeometry(0.185, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const hairMesh = new THREE.Mesh(hairGeo, hairMat);
      hairMesh.position.y = 0.05;
      this.head.add(hairMesh);

      // Hair bangs in front
      const tuftGeo = new THREE.ConeGeometry(0.04, 0.08, 6);
      for (let i = -2; i <= 2; i++) {
        const tuft = new THREE.Mesh(tuftGeo, hairMat);
        tuft.position.set(i * 0.035, 0.12, 0.15);
        tuft.rotation.x = 0.6;
        tuft.rotation.z = -i * 0.15;
        this.head.add(tuft);
      }
    }

    this.group.add(this.head);

    // --- ARMS ---
    // Right Arm (Throwing & Grabbing arm)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.24, 0.88, 0);

    const armGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.36, 10);
    const rightArmMesh = new THREE.Mesh(armGeo, shirtMat);
    rightArmMesh.position.y = -0.18;
    this.rightArm.add(rightArmMesh);

    // Right Hand
    const handGeo = new THREE.SphereGeometry(0.05, 10, 8);
    this.rightHand = new THREE.Mesh(handGeo, skinMat);
    this.rightHand.position.set(0, -0.38, 0.02);
    this.rightArm.add(this.rightHand);
    this.group.add(this.rightArm);

    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.24, 0.88, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, shirtMat);
    leftArmMesh.position.y = -0.18;
    this.leftArm.add(leftArmMesh);

    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(0, -0.38, 0.02);
    this.leftArm.add(leftHand);
    this.group.add(this.leftArm);

    // Cast shadows for all children
    this.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.targetPosition.copy(this.group.position);
  }

  // Attach visual coins in right hand
  public showCoinsInHand(count: number = 5) {
    if (this.coinInHand) {
      this.rightHand.remove(this.coinInHand);
    }

    this.coinInHand = new THREE.Group();
    const miniCoinGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 12);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.25,
    });

    for (let i = 0; i < Math.min(count, 5); i++) {
      const c = new THREE.Mesh(miniCoinGeo, goldMat);
      c.position.set((i - 2) * 0.015, i * 0.014 + 0.04, 0.02);
      c.rotation.x = Math.PI / 2;
      this.coinInHand.add(c);
    }

    this.rightHand.add(this.coinInHand);
  }

  public hideCoinsInHand() {
    if (this.coinInHand) {
      this.rightHand.remove(this.coinInHand);
      this.coinInHand = null;
    }
  }

  // Animation: boy wind-up and throw coin towards line
  public animateThrow(onRelease: () => void) {
    const startTime = performance.now();
    const duration = 480; // ms (fast and energetic!)

    const step = (now: number) => {
      if (this.isDestroyed) return;
      const progress = Math.min((now - startTime) / duration, 1.0);

      if (progress < 0.4) {
        // Wind-up: pull arm back and up
        const t = progress / 0.4;
        this.rightArm.rotation.x = -1.2 * t;
        this.torso.rotation.y = -0.3 * t;
        this.head.rotation.x = -0.15 * t;
      } else if (progress < 0.7) {
        // Power swing forward
        const t = (progress - 0.4) / 0.3;
        this.rightArm.rotation.x = -1.2 + 2.2 * t;
        this.torso.rotation.y = -0.3 + 0.5 * t;
        this.head.rotation.x = 0.1 * t;

        if (t >= 0.5 && this.coinInHand) {
          this.hideCoinsInHand();
          onRelease();
        }
      } else {
        // Follow-through and return to stance
        const t = (progress - 0.7) / 0.3;
        this.rightArm.rotation.x = 1.0 * (1 - t);
        this.torso.rotation.y = 0.2 * (1 - t);
        this.head.rotation.x = 0.1 * (1 - t);
      }

      if (progress < 1.0) {
        requestAnimationFrame(step);
      } else {
        this.rightArm.rotation.set(0, 0, 0);
        this.torso.rotation.set(0, 0, 0);
        this.head.rotation.set(0, 0, 0);
      }
    };

    requestAnimationFrame(step);
  }

  // Animation: Crouch down to grab coins from the floor, stand up proudly
  public animatePickUpCoins(onPickedUp: () => void, onDone: () => void) {
    const startTime = performance.now();
    const duration = 1200; // ms

    const step = (now: number) => {
      if (this.isDestroyed) return;
      const progress = Math.min((now - startTime) / duration, 1.0);

      if (progress < 0.4) {
        // Crouch down towards ground
        const t = progress / 0.4;
        this.group.position.y = -0.35 * t;
        this.torso.rotation.x = 0.8 * t;
        this.rightArm.rotation.x = 1.4 * t;
        this.leftArm.rotation.x = 0.4 * t;
        this.head.rotation.x = -0.4 * t;
      } else if (progress < 0.6) {
        // Grabbing coins at ground level
        if (!this.coinInHand) {
          this.showCoinsInHand(5);
          onPickedUp();
        }
      } else {
        // Stand back up proudly
        const t = (progress - 0.6) / 0.4;
        this.group.position.y = -0.35 * (1 - t);
        this.torso.rotation.x = 0.8 * (1 - t);
        this.rightArm.rotation.x = 1.4 * (1 - t);
        this.leftArm.rotation.x = 0.4 * (1 - t);
        this.head.rotation.x = -0.4 * (1 - t);
      }

      if (progress < 1.0) {
        requestAnimationFrame(step);
      } else {
        this.group.position.y = 0;
        this.torso.rotation.set(0, 0, 0);
        this.rightArm.rotation.set(0, 0, 0);
        this.leftArm.rotation.set(0, 0, 0);
        this.head.rotation.set(0, 0, 0);
        onDone();
      }
    };

    requestAnimationFrame(step);
  }

  // Animation: high upward toss of all coins in hand
  public animateAirToss(onRelease: () => void) {
    const startTime = performance.now();
    const duration = 450;

    const step = (now: number) => {
      if (this.isDestroyed) return;
      const progress = Math.min((now - startTime) / duration, 1.0);

      if (progress < 0.35) {
        // Dip slightly
        const t = progress / 0.35;
        this.group.position.y = -0.15 * t;
        this.rightArm.rotation.x = 0.6 * t;
        this.leftArm.rotation.x = 0.6 * t;
      } else if (progress < 0.7) {
        // Explosive upward launch
        const t = (progress - 0.35) / 0.35;
        this.group.position.y = -0.15 + 0.25 * t;
        this.rightArm.rotation.x = 0.6 - 2.4 * t; // arm points straight up!
        this.leftArm.rotation.x = 0.6 - 1.8 * t;
        this.head.rotation.x = -0.5 * t; // looks up at coins!

        if (t >= 0.5 && this.coinInHand) {
          this.hideCoinsInHand();
          onRelease();
        }
      } else {
        // Settle down while still watching the coins in sky
        const t = (progress - 0.7) / 0.3;
        this.group.position.y = 0.1 * (1 - t);
        this.rightArm.rotation.x = -1.8 + 1.2 * t;
        this.leftArm.rotation.x = -1.2 + 0.8 * t;
        this.head.rotation.x = -0.5; // keep looking up
      }

      if (progress < 1.0) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  // Smooth walking update towards target position
  public moveTo(x: number, z: number) {
    this.targetPosition.set(x, 0, z);
    this.isWalking = true;
  }

  public update(dt: number) {
    if (this.isWalking) {
      const dx = this.targetPosition.x - this.group.position.x;
      const dz = this.targetPosition.z - this.group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.08) {
        const moveSpeed = 3.6; // fast walking speed
        const stepDist = Math.min(dist, moveSpeed * dt);
        const angle = Math.atan2(dx, dz);

        this.group.rotation.y = angle;
        this.group.position.x += Math.sin(angle) * stepDist;
        this.group.position.z += Math.cos(angle) * stepDist;

        // Leg swing animation
        this.walkTime += dt * 14;
        const swing = Math.sin(this.walkTime) * 0.45;
        this.rightLeg.rotation.x = swing;
        this.leftLeg.rotation.x = -swing;
        this.rightArm.rotation.x = -swing * 0.7;
        this.leftArm.rotation.x = swing * 0.7;
      } else {
        this.group.position.copy(this.targetPosition);
        this.isWalking = false;
        this.rightLeg.rotation.x = 0;
        this.leftLeg.rotation.x = 0;
        this.rightArm.rotation.x = 0;
        this.leftArm.rotation.x = 0;
      }
    }
  }

  public setRotationY(angleRad: number) {
    this.group.rotation.y = angleRad;
  }

  public setPosition(x: number, y: number, z: number) {
    this.group.position.set(x, y, z);
    this.targetPosition.set(x, y, z);
  }

  public dispose() {
    this.isDestroyed = true;
  }
}
