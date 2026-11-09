import * as THREE from './vendor/three.module.min.js';

const host = document.querySelector('#rideScene');
if (host && window.WebGLRenderingContext) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07172b, 0.0085);

  const camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.08, 420);
  camera.up.set(0, 1, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'coaster-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);
  host.classList.add('webgl-active');

  scene.add(new THREE.HemisphereLight(0x86ddff, 0x061328, 2.2));
  const key = new THREE.DirectionalLight(0xffd88a, 3.2);
  key.position.set(-18, 35, 10);
  scene.add(key);

  // Course plan: the rail is built from segments so climbs, drops and turns happen on purpose.
  // grade = rise per horizontal unit (+ climbs, - drops); turn = heading change in radians (+ left, - right).
  const COURSE = [
    { type: 'straight', length: 45 },
    { type: 'climb', length: 70, grade: 0.75 },
    { type: 'turn-left', length: 60, turn: 0.9 },
    { type: 'straight', length: 30 },
    { type: 'drop', length: 60, grade: -0.42 },
    { type: 'turn-right', length: 70, turn: -1.1 },
    { type: 'climb', length: 50, grade: 0.6 },
    { type: 'straight', length: 35 },
    { type: 'turn-left', length: 60, turn: 0.85 },
    { type: 'drop', length: 55, grade: -0.36 },
    { type: 'straight', length: 40 }
  ];
  const STEP = 2;
  const samples = [new THREE.Vector3(0, 0, 0)];
  let heading = 0;
  const cursor = new THREE.Vector3(0, 0, 0);
  for (const seg of COURSE) {
    const steps = Math.max(1, Math.round(seg.length / STEP));
    const grade = seg.grade || 0;
    const turnPerStep = (seg.turn || 0) / steps;
    const horizontal = STEP / Math.hypot(1, grade);
    for (let i = 0; i < steps; i++) {
      heading += turnPerStep;
      // heading 0 points down -z (away from the camera); increasing heading turns left.
      cursor.x += -Math.sin(heading) * horizontal;
      cursor.z += -Math.cos(heading) * horizontal;
      cursor.y += grade * horizontal;
      samples.push(cursor.clone());
    }
  }
  const curve = new THREE.CatmullRomCurve3(samples, false, 'centripetal');
  const curveLength = curve.getLength();
  const floorY = Math.min(...samples.map(p => p.y)) - 12;
  const track = new THREE.Group();
  scene.add(track);

  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x8ad9e4, metalness: 0.92, roughness: 0.18, emissive: 0x0b6378, emissiveIntensity: 0.55 });
  const sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x153d52, metalness: 0.72, roughness: 0.38 });
  const supportMaterial = new THREE.MeshStandardMaterial({ color: 0x315c70, metalness: 0.82, roughness: 0.3 });
  const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xffbd4f, emissive: 0xff7a15, emissiveIntensity: 2.1, roughness: 0.32 });

  const worldUp = new THREE.Vector3(0, 1, 0);
  function sideAt(tangent) {
    return new THREE.Vector3().crossVectors(tangent, worldUp).normalize();
  }

  function offsetCurve(distance) {
    const sidePoints = [];
    for (let i = 0; i <= 320; i++) {
      const t = i / 320;
      const p = curve.getPointAt(t);
      const side = sideAt(curve.getTangentAt(t).normalize());
      sidePoints.push(p.clone().addScaledVector(side, distance));
    }
    return new THREE.CatmullRomCurve3(sidePoints, false, 'centripetal');
  }
  [-1.15, 1.15].forEach(offset => {
    const geometry = new THREE.TubeGeometry(offsetCurve(offset), 640, 0.12, 8, false);
    track.add(new THREE.Mesh(geometry, railMaterial));
  });

  const sleeperGeometry = new THREE.BoxGeometry(3.25, 0.16, 0.34);
  const postGeometry = new THREE.CylinderGeometry(0.09, 0.13, 3.3, 7);
  const lanternGeometry = new THREE.SphereGeometry(0.34, 10, 8);
  const supportGeometry = new THREE.CylinderGeometry(0.17, 0.28, 1, 8);
  const SLEEPERS = 240;
  for (let i = 0; i < SLEEPERS; i++) {
    const t = i / SLEEPERS;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const sleeper = new THREE.Mesh(sleeperGeometry, sleeperMaterial);
    sleeper.position.copy(p).add(new THREE.Vector3(0, -0.16, 0));
    sleeper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangent);
    track.add(sleeper);
    if (i % 9 === 0) {
      const height = Math.max(2, p.y - floorY);
      const support = new THREE.Mesh(supportGeometry, supportMaterial);
      support.scale.y = height;
      support.position.set(p.x, p.y - height / 2 - .25, p.z);
      track.add(support);
    }
    if (i % 13 === 0) {
      const side = sideAt(tangent);
      [-1, 1].forEach(direction => {
        const post = new THREE.Mesh(postGeometry, sleeperMaterial);
        post.position.copy(p).addScaledVector(side, direction * 3.1).add(new THREE.Vector3(0, 1.4, 0));
        track.add(post);
        const lantern = new THREE.Mesh(lanternGeometry, goldMaterial);
        lantern.scale.set(0.72, 1, 0.72);
        lantern.position.copy(post.position).add(new THREE.Vector3(0, 1.45, 0));
        track.add(lantern);
        const light = new THREE.PointLight(0xff8c31, 7, 12, 2);
        light.position.copy(lantern.position);
        track.add(light);
      });
    }
  }

  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(360 * 3);
  for (let i = 0; i < 360; i++) {
    starPositions[i * 3] = (Math.random() - .5) * 260;
    starPositions[i * 3 + 1] = 18 + Math.random() * 75;
    starPositions[i * 3 + 2] = -Math.random() * 410;
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xbbeeff, size: .42, transparent: true, opacity: .75 })));

  const cloudGeometry = new THREE.BufferGeometry();
  const cloudPositions = new Float32Array(220 * 3);
  for (let i = 0; i < 220; i++) {
    cloudPositions[i * 3] = (Math.random() - .5) * 150;
    cloudPositions[i * 3 + 1] = -8 + Math.random() * 32;
    cloudPositions[i * 3 + 2] = -Math.random() * 500;
  }
  cloudGeometry.setAttribute('position', new THREE.BufferAttribute(cloudPositions, 3));
  scene.add(new THREE.Points(cloudGeometry, new THREE.PointsMaterial({ color: 0xd5f7ff, size: 1.3, transparent: true, opacity: .16, depthWrite: false })));

  const clock = new THREE.Clock();
  const LOOK_AHEAD = 14;          // world units ahead of the camera the view is aimed at
  const EYE_HEIGHT = 1.18;
  let progress = 0.006;
  let smoothedSpeed = 25;
  let smoothedPitch = 0;
  let smoothedBank = 0;
  const position = new THREE.Vector3();
  const look = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();

  function resize() {
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), .04);
    const gaugeSpeed = Number(document.querySelector('#speedGaugeValue')?.textContent || 24);
    const paused = host.classList.contains('paused');
    const downhill = host.classList.contains('downhill');
    const uphill = host.classList.contains('uphill');
    const modeMultiplier = paused ? 0 : uphill ? .34 : downhill ? 1.28 : .72;
    const targetSpeed = gaugeSpeed * modeMultiplier;
    smoothedSpeed += (targetSpeed - smoothedSpeed) * Math.min(1, delta * 3.2);
    progress += paused ? 0 : delta * Math.max(1.2, smoothedSpeed) / 1250;
    if (progress > .965) progress = .008;

    // Camera rides the rail. The view is aimed at a point on the same rail ahead, so the pitch
    // follows the real climb or drop under the train instead of a fixed guess.
    curve.getPointAt(progress, position);
    const aheadU = Math.min(.995, progress + LOOK_AHEAD / curveLength);
    curve.getPointAt(aheadU, aim);
    const shake = paused ? .015 : Math.min(.18, smoothedSpeed / 700);
    position.y += EYE_HEIGHT + Math.sin(performance.now() * .012) * shake;
    position.x += Math.sin(performance.now() * .018) * shake * .55;
    camera.position.copy(position);

    // Small mode nudge only: uphill lifts the view a little, downhill lowers it.
    const pitchTarget = paused ? .12 : uphill ? 3.4 : downhill ? -.55 : .2;
    smoothedPitch += (pitchTarget - smoothedPitch) * Math.min(1, delta * 2.15);
    look.copy(aim);
    look.y += smoothedPitch;
    forward.subVectors(look, camera.position).normalize();

    // Banking: measure how much the heading turns just ahead and lean into the turn.
    const here = curve.getTangentAt(progress);
    const soon = curve.getTangentAt(Math.min(.995, progress + 0.012));
    const turnRate = new THREE.Vector3().crossVectors(here, soon).y;
    const bankTarget = THREE.MathUtils.clamp(-turnRate * 5.5, -.5, .5);
    smoothedBank += (bankTarget - smoothedBank) * Math.min(1, delta * 2.4);

    // Build a level-horizon frame, then roll it by the bank angle (negative = lean left).
    right.crossVectors(forward, worldUp).normalize();
    up.crossVectors(right, forward).normalize();
    const roll = smoothedBank + Math.sin(progress * 52) * Math.min(.035, smoothedSpeed / 3800);
    camera.up.copy(up).multiplyScalar(Math.cos(roll)).addScaledVector(right, Math.sin(roll));
    camera.lookAt(look);
    camera.fov += ((62 + Math.min(25, smoothedSpeed * .14)) - camera.fov) * Math.min(1, delta * 4);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  new ResizeObserver(resize).observe(host);
  resize();
  animate();
}
