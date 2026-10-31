(function () {
  var canvas = document.getElementById('sky');
  var panel = document.getElementById('panel');
  var root = document.documentElement;
  var HERO_RATIO = 275 / 502;

  var targets = [
    { id: 't-linkedin' },
    { id: 't-x' },
    { id: 't-portfolio' },
    { id: 't-github' }
  ];
  targets.forEach(function (target) { target.el = document.getElementById(target.id); });

  function place() {
    var w = innerWidth;
    var h = innerHeight;
    var compact = h < 480;
    root.classList.toggle('compact', compact);
    var wide = w >= 900 && w > h;
    // "Desktop site" on a phone is a huge portrait viewport: lay out as a phone, then scale up.
    var scale = w >= 900 && !wide ? w / 430 : 1;
    root.classList.toggle('scaled', scale > 1);
    root.style.setProperty('--z', scale);
    var pageW = w / scale;
    var top = wide ? 40 : 54;
    var size;
    var centreX;

    if (compact) {
      size = h - 24;
      top = 12;
      centreX = w * 0.2;
    } else {
      var panelTop = panel.getBoundingClientRect().top / scale + scrollY;
      var heroW;
      var cardW;
      var leftX;
      var step;
      var firstY;
      if (wide) {
        size = h - top - 24;
        heroW = size * HERO_RATIO;
        centreX = Math.min(w * 0.64, w - heroW / 2);
        cardW = 240;
        leftX = w * 0.12;
        step = 72;
        firstY = panelTop - step * targets.length - 8;
      } else {
        size = Math.min(Math.max(panelTop - top - 8, 120), pageW * 0.8 / HERO_RATIO);
        heroW = size * HERO_RATIO;
        // The bright right palm sits inset in the image, so he can hug the screen edge.
        centreX = pageW - heroW * 0.44;
        cardW = Math.min(112, pageW * 0.31);
        leftX = 8;
        step = Math.max(size * 0.1, 54);
        firstY = top;
      }
      targets.forEach(function (target, index) {
        target.el.style.width = cardW + 'px';
        target.el.style.left = leftX + 'px';
        target.el.style.top = firstY + step * index + 'px';
      });
    }
    return { size: size * scale, centreX: centreX * scale, centreY: (top + size / 2) * scale };
  }
  var altEl = document.getElementById('alt');
  var machEl = document.getElementById('mach');
  var zoneEl = document.getElementById('zone');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    root.classList.add('no-webgl');
    place();
    addEventListener('resize', place);
    return;
  }

  var pixelRatio = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);

  var scene = new THREE.Scene();
  var CAMERA_Z = 9;
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
  camera.position.set(0, 0, CAMERA_Z);

  function canvasTexture(size, draw) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    var texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  var glowTexture = canvasTexture(128, function (g, s) {
    var r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.2, 'rgba(255,255,255,.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });

  var cloudTexture = canvasTexture(256, function (g, s) {
    for (var i = 0; i < 38; i++) {
      var a = Math.random() * Math.PI * 2;
      var d = Math.random() * s * 0.3;
      var x = s / 2 + Math.cos(a) * d * 1.25;
      var y = s / 2 + Math.sin(a) * d * 0.5;
      var rad = s * (0.08 + Math.random() * 0.13);
      var r = g.createRadialGradient(x, y, 0, x, y, rad);
      r.addColorStop(0, 'rgba(255,255,255,.13)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, s, s);
    }
  });

  // Sky
  var skyStops = {
    low: { top: [0.004, 0.008, 0.035], mid: [0.015, 0.03, 0.09], bottom: [0.13, 0.06, 0.04] },
    high: { top: [0, 0, 0.012], mid: [0.004, 0.008, 0.04], bottom: [0.03, 0.03, 0.1] }
  };
  var skyMaterial = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Vector3() },
      uMid: { value: new THREE.Vector3() },
      uBottom: { value: new THREE.Vector3() }
    },
    vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: [
      'varying float vY; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom;',
      'void main(){',
      '  vec3 c = mix(uBottom, uMid, smoothstep(0.0, 0.3, vY));',
      '  gl_FragColor = vec4(mix(c, uTop, smoothstep(0.3, 0.8, vY)), 1.0);',
      '}'
    ].join('\n')
  });
  var sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMaterial);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  var starGeometry = new THREE.BufferGeometry();
  var starPositions = new Float32Array(1800);
  for (var s = 0; s < 1800; s += 3) {
    starPositions[s] = (Math.random() - 0.5) * 60;
    starPositions[s + 1] = (Math.random() - 0.5) * 36;
    starPositions[s + 2] = -30;
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  var starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false });
  var stars = new THREE.Points(starGeometry, starMaterial);
  stars.renderOrder = -9;
  scene.add(stars);

  // Thruster smoke he has just left behind, falling away as he climbs.
  var deck = new THREE.Group();
  var deckClouds = [];
  for (var d = 0; d < 30; d++) {
    var puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTexture, transparent: true, depthWrite: false, color: 0x7a4426, toneMapped: false }));
    var row = d % 3;
    var width = 5 + Math.random() * 7;
    puff.position.set((Math.random() - 0.5) * 26, -row * 0.5 + Math.random() * 0.25, -2 - row * 2.2);
    puff.scale.set(width, width * 0.42, 1);
    puff.userData.drift = (0.03 + Math.random() * 0.07) * (d % 2 ? 1 : -1);
    deck.add(puff);
    deckClouds.push(puff);
  }
  scene.add(deck);

  var STREAKS = 18;
  var streakPositions = new Float32Array(STREAKS * 6);
  for (var i = 0; i < STREAKS; i++) {
    placeStreak(i, (Math.random() - 0.5) * 18);
  }
  function placeStreak(index, y) {
    var x = (Math.random() - 0.5) * 12;
    var z = -3 - Math.random() * 7;
    var length = 0.3 + Math.random() * 0.8;
    streakPositions.set([x, y, z, x, y + length, z], index * 6);
  }
  var streakGeometry = new THREE.BufferGeometry();
  streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
  var streaks = new THREE.LineSegments(streakGeometry, new THREE.LineBasicMaterial({
    color: 0xffd9b0, transparent: true, opacity: 0.12, depthWrite: false
  }));
  streaks.frustumCulled = false;
  scene.add(streaks);

  function glow(size, opacity, color) {
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture, transparent: true, opacity: opacity, depthWrite: false, depthTest: false, color: color,
      blending: THREE.AdditiveBlending, toneMapped: false
    }));
    sprite.scale.set(size, size, 1);
    return sprite;
  }

  // The hero image, in its own pixel coordinates so anchors can be read straight off it.
  var IMAGE_W = 275;
  var IMAGE_H = 502;
  var HERO_H = 4.4;
  var HERO_W = HERO_H * IMAGE_W / IMAGE_H;

  function at(x, y) {
    return new THREE.Vector3((x / IMAGE_W - 0.5) * HERO_W, (0.5 - y / IMAGE_H) * HERO_H, 0);
  }

  var hero = new THREE.Group();
  var figureMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  var figure = new THREE.Mesh(new THREE.PlaneGeometry(HERO_W, HERO_H), figureMaterial);
  figure.renderOrder = 2;
  hero.add(figure);

  var reactorGlow = glow(0.85, 0.5, 0x4fc3ff);
  reactorGlow.position.copy(at(143, 96));
  reactorGlow.renderOrder = 3;
  var eyeGlow = glow(0.5, 0.4, 0x7fd6ff);
  eyeGlow.position.copy(at(145, 35));
  eyeGlow.renderOrder = 3;
  hero.add(reactorGlow, eyeGlow);
  scene.add(hero);

  var jets = [];
  var jetGeometry = new THREE.PlaneGeometry(1, 1);
  jetGeometry.translate(0, -0.5, 0);
  var jetFragment = [
    'varying vec2 vUv; uniform float uPower;',
    'void main(){',
    '  float along = vUv.y;',
    '  float x = abs(vUv.x - 0.5) * 2.0;',
    '  float taper = mix(0.1, 1.0, pow(along, 1.2)) * smoothstep(1.0, 0.97, along) + 0.04;',
    '  float core = exp(-pow(x / (taper * 0.12), 2.0));',
    '  float halo = exp(-pow(x / (taper * 0.42), 2.0)) * 0.34;',
    '  float fade = pow(along, 0.9);',
    '  vec3 color = mix(vec3(1.0, 0.36, 0.05), vec3(1.0, 0.95, 0.78), core);',
    '  gl_FragColor = vec4(color * (core + halo) * fade * uPower, 1.0);',
    '}'
  ].join('\n');

  function jet(origin, width, length, seed) {
    var material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uPower: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: jetFragment
    });
    var beam = new THREE.Mesh(jetGeometry, material);
    beam.position.copy(origin);
    beam.scale.set(width, length, 1);
    beam.frustumCulled = false;
    beam.renderOrder = 1;
    var spark = glow(width * 0.75, 0.8, 0xffa04a);
    spark.position.copy(origin);
    spark.renderOrder = 3;
    hero.add(beam, spark);
    jets.push({ material: material, spark: spark, seed: seed });
  }

  jet(at(60, 244), 1.5, 13, 1.3);
  jet(at(226, 242), 1.5, 13, 4.1);
  jet(at(131, 460), 1.25, 14, 2.2);
  jet(at(160, 460), 1.25, 14, 7.5);

  var layout = { x: 0, y: 0, scale: 1, deckY: -3 };

  function fit() {
    var w = innerWidth;
    var h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    var box = place();
    var visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * CAMERA_Z;
    var worldPerPixel = visibleH / h;
    layout.scale = box.size * worldPerPixel / HERO_H;
    layout.x = (box.centreX - w / 2) * worldPerPixel;
    layout.y = (h / 2 - box.centreY) * worldPerPixel;
    layout.deckY = -visibleH / 2 - 0.45;
  }

  var pointer = { x: 0, y: 0 };
  addEventListener('pointermove', function (e) {
    pointer.x = e.clientX / innerWidth - 0.5;
    pointer.y = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  function formatFeet(feet) {
    return Math.round(feet).toLocaleString('en-US') + ' FT';
  }

  var CLIMB_SECONDS = 42;
  var START_ALT = 12000;
  var SPACE_ALT = 328084;
  var lastTelemetry = -1;

  function updateTelemetry(t, climb) {
    if (t - lastTelemetry < 0.1) return;
    lastTelemetry = t;
    var alt = START_ALT + (SPACE_ALT - START_ALT) * climb * climb;
    altEl.textContent = formatFeet(alt);
    machEl.textContent = 'MACH ' + (0.9 + climb * 4.2 + Math.sin(t * 2) * 0.04).toFixed(1);
    zoneEl.textContent = alt < 40000 ? 'Troposphere' : alt < 160000 ? 'Stratosphere' : alt < SPACE_ALT ? 'Mesosphere' : 'Space';
  }

  function easeOut(x) {
    return 1 - Math.pow(1 - x, 3.2);
  }

  var lowStop = new THREE.Vector3();
  var highStop = new THREE.Vector3();

  function blendStop(uniform, name, amount) {
    uniform.value.copy(lowStop.fromArray(skyStops.low[name])).lerp(highStop.fromArray(skyStops.high[name]), amount);
  }

  var clock = new THREE.Clock();
  var elapsed = 0;

  function draw(dt) {
    elapsed += dt;
    var t = elapsed;
    var climb = Math.min(t / CLIMB_SECONDS, 1);
    var launch = reduce ? 1 : Math.min(t / 1.6, 1);
    var haze = Math.max(1 - climb * 1.3, 0);
    var speed = 1 + (1 - easeOut(launch)) * 5;

    blendStop(skyMaterial.uniforms.uTop, 'top', climb);
    blendStop(skyMaterial.uniforms.uMid, 'mid', climb);
    blendStop(skyMaterial.uniforms.uBottom, 'bottom', climb);
    starMaterial.opacity = 0.55 + climb * 0.45;
    stars.position.y = -t * 0.04;

    deck.position.y = layout.deckY - climb * climb * 4 + (1 - easeOut(launch)) * 7;
    deckClouds.forEach(function (puff) {
      puff.position.x += puff.userData.drift * dt;
      puff.material.opacity = haze * 0.38;
    });

    for (var i = 0; i < STREAKS; i++) {
      var offset = i * 6;
      var fall = 14 * speed * dt;
      streakPositions[offset + 1] -= fall;
      streakPositions[offset + 4] -= fall;
      if (streakPositions[offset + 4] < -9) placeStreak(i, 9);
    }
    streakGeometry.attributes.position.needsUpdate = true;

    hero.scale.setScalar(layout.scale);
    hero.position.set(
      layout.x + Math.sin(t * 0.7) * 0.03 + pointer.x * 0.12,
      layout.y + (1 - easeOut(launch)) * -9 + Math.sin(t * 1.4) * 0.05,
      0
    );
    hero.rotation.y = Math.sin(t * 0.4) * 0.05 + pointer.x * 0.12;
    hero.rotation.z = Math.sin(t * 0.6) * 0.012;

    jets.forEach(function (jet) {
      var pulse = 1 + Math.sin(t * 31 + jet.seed) * 0.07 + Math.sin(t * 53 + jet.seed * 3) * 0.05;
      jet.material.uniforms.uPower.value = pulse * (1 + (1 - launch) * 0.6);
      jet.spark.material.opacity = 0.7 * pulse;
    });
    reactorGlow.material.opacity = 0.42 + Math.sin(t * 3) * 0.14;
    eyeGlow.material.opacity = 0.34 + Math.sin(t * 2.2) * 0.1;

    camera.position.x = launch < 1 ? (1 - launch) * Math.sin(t * 90) * 0.08 : 0;
    camera.position.y = launch < 1 ? (1 - launch) * Math.cos(t * 77) * 0.06 : 0;

    updateTelemetry(t, climb);
    renderer.render(scene, camera);
  }

  // 30fps is what iPhone Low Power Mode gives us and it still looks fine, so only react below that.
  var SMOOTH_FPS = 24;
  var UNUSABLE_FPS = 13;
  var SAMPLE_SECONDS = 1.2;
  var SETTLE_SECONDS = 0.8;
  var startRatio = pixelRatio;
  var tiers = [
    { ratio: startRatio },
    { ratio: Math.min(startRatio, 1.5) },
    { ratio: Math.min(startRatio, 1) },
    { ratio: Math.min(startRatio, 0.75), lite: true }
  ];
  var tier = 0;
  var stopped = false;
  var sample = { start: 0, frames: 0, last: 0 };
  root.dataset.quality = tier;

  function restartSample(now) {
    sample.start = now;
    sample.frames = 0;
    sample.last = now;
  }

  function stepDown() {
    tier++;
    root.dataset.quality = tier;
    pixelRatio = tiers[tier].ratio;
    renderer.setPixelRatio(pixelRatio);
    if (tiers[tier].lite) {
      deck.visible = false;
      streaks.visible = false;
    }
    fit();
  }

  function goStill() {
    stopped = true;
    root.dataset.quality = 'still';
    root.classList.add('no-webgl');
  }

  function watchSpeed(now) {
    var gap = (now - sample.last) / 1000;
    sample.last = now;
    // A long gap is the tab being hidden or a one-off hitch, not a slow phone.
    if (gap > 0.4) {
      restartSample(now);
      return;
    }
    sample.frames++;
    var seconds = (now - sample.start) / 1000;
    if (elapsed < SETTLE_SECONDS || seconds < SAMPLE_SECONDS) return;
    var fps = sample.frames / seconds;
    restartSample(now);
    if (fps >= SMOOTH_FPS) return;
    if (tier < tiers.length - 1) {
      stepDown();
    } else if (fps < UNUSABLE_FPS) {
      goStill();
    }
  }

  function loop() {
    if (stopped) return;
    var dt = Math.min(clock.getDelta(), 0.05);
    watchSpeed(performance.now());
    if (stopped) return;
    draw(dt);
    requestAnimationFrame(loop);
  }

  canvas.addEventListener('webglcontextlost', goStill);
  document.addEventListener('visibilitychange', function () {
    restartSample(performance.now());
  });

  addEventListener('resize', function () {
    fit();
    if (reduce) draw(0);
  });

  if (document.fonts) {
    document.fonts.ready.then(fit);
  }

  fit();

  new THREE.TextureLoader().load(window.HERO_IMAGE, function (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    figureMaterial.map = texture;
    figureMaterial.needsUpdate = true;
    clock.start();
    if (reduce) {
      elapsed = 8;
      draw(0);
    } else {
      restartSample(performance.now());
      requestAnimationFrame(loop);
    }
  }, undefined, goStill);
})();
