// Sky.js - Sun, moon, stars, sky color, fog
import * as THREE from 'three';

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.sunAngle = 0;
  }

  update(time) {
    // Day/night cycle based on world time fraction
    // time is in ms from performance.now(), but we use world.time for game time
    // This is called from render loop with performance.now()
  }

  updateFromWorldTime(worldTime) {
    // worldTime: 0-24000 (0=sunrise, 6000=noon, 12000=sunset, 18000=midnight)
    const fraction = worldTime / 24000;
    this.sunAngle = fraction * Math.PI * 2;

    // Calculate sky color based on time
    const dayColor = new THREE.Color(0x87CEEB);   // day: sky blue
    const sunsetColor = new THREE.Color(0xFF6B35); // sunset: orange
    const nightColor = new THREE.Color(0x0A0A2A);  // night: dark blue

    let skyColor;
    if (fraction < 0.25) {
      // Sunrise (0-6000)
      const t = fraction / 0.25;
      skyColor = nightColor.clone().lerp(dayColor, t);
    } else if (fraction < 0.5) {
      // Day (6000-12000)
      skyColor = dayColor;
    } else if (fraction < 0.54) {
      // Sunset (12000-13000)
      const t = (fraction - 0.5) / 0.04;
      skyColor = dayColor.clone().lerp(sunsetColor, t);
    } else if (fraction < 0.58) {
      // Dusk (13000-14000)
      const t = (fraction - 0.54) / 0.04;
      skyColor = sunsetColor.clone().lerp(nightColor, t);
    } else {
      // Night (14000-24000)
      skyColor = nightColor;
    }

    return skyColor;
  }
}
