// F1-like driving game (UMD) - uses global THREE
if (typeof THREE === 'undefined') {
    console.error('THREE is not loaded.');
    document.body.innerHTML = '<div style="color:#fff;background:#111;padding:20px;display:flex;height:100vh;align-items:center;justify-content:center;">Three.js is not loaded. Open index.html via a web server or check your connection.</div>';
} else {
    // Scene + camera + renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 6, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemi.position.set(0, 50, 0);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    dir.castShadow = true;
    scene.add(dir);

    // Ground
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2b8c3e });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Simple race track - built from an ellipse geometry (ring)
    const trackRadiusX = 30;
    const trackRadiusZ = 18;
    const trackCurve = new THREE.EllipseCurve(0, 0, trackRadiusX, trackRadiusZ, 0, 2 * Math.PI, false, 0);
    const trackPoints = trackCurve.getPoints(128);

    // build track as tube-like by extruding along path (approximate using Lathe geometry workaround)
    const trackShape = new THREE.Shape();
    trackShape.moveTo(trackPoints[0].x + 2, trackPoints[0].y);
    for (let i = 1; i < trackPoints.length; i++) trackShape.lineTo(trackPoints[i].x + 2, trackPoints[i].y);
    trackShape.closePath();

    const trackGeometry = new THREE.ExtrudeGeometry(trackShape, { depth: 0.1, bevelEnabled: false });
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const trackMesh = new THREE.Mesh(trackGeometry, trackMat);
    trackMesh.rotation.x = -Math.PI / 2;
    trackMesh.position.y = 0.01;
    trackMesh.receiveShadow = true;
    scene.add(trackMesh);

    // kerbs
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
    for (let i = 0; i < trackPoints.length; i += 12) {
        const p = trackPoints[i];
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.6), borderMat);
        kerb.position.set(p.x, 0.11, p.y);
        kerb.rotation.y = Math.atan2(p.y, p.x);
        scene.add(kerb);
    }

    // SLEEK F1-style procedural car model
    const car = new THREE.Group();

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.25, roughness: 0.35 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.05, roughness: 0.6 });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.05, roughness: 0.7 });

    // Long tapered nose
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.6, 2.6, 12), bodyMat);
    nose.rotation.x = Math.PI / 2;
    nose.scale.set(1, 1, 1);
    nose.position.set(0, 0.08 + 0.05, 2.5);
    car.add(nose);

    // Nose tip - small cone for smoother look
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 12), bodyMat);
    tip.rotation.x = Math.PI;
    tip.position.set(0, 0.05 + 0.05, 3.6);
    tip.scale.set(0.8, 1, 0.8);
    car.add(tip);

    // Sidepods (thin boxes) for F1 silhouette
    const leftPod = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 1.2), bodyMat);
    leftPod.position.set(-0.95, 0.12 + 0.05, 0.25);
    leftPod.rotation.y = 0.05;
    const rightPod = leftPod.clone(); rightPod.position.x = 0.95; rightPod.rotation.y = -0.05;
    car.add(leftPod, rightPod);

    // Engine cover / tapered rear
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 1.6, 12), bodyMat);
    engine.rotation.x = Math.PI / 2;
    engine.scale.set(1, 1, 0.7);
    engine.position.set(0, 0.2 + 0.05, -0.4);
    car.add(engine);

    // Cockpit (dark canopy)
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.26, 0.9), new THREE.MeshStandardMaterial({ color: 0x0e0e0e }));
    canopy.position.set(0, 0.28 + 0.05, 0.6);
    canopy.scale.set(1, 0.6, 1);
    car.add(canopy);

    // Front and rear wings (multi-element suggestion simplified)
    const fwMain = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.12), carbonMat);
    fwMain.position.set(0, 0.04, 3.05);
    const fwFlap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.08), blackMat);
    fwFlap.position.set(0, 0.02, 3.25);
    car.add(fwMain, fwFlap);

    const rwMain = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.12), carbonMat);
    rwMain.position.set(0, 0.36, -1.6);
    car.add(rwMain);

    // Wheel factory (slightly more hub detail)
    function makeWheel() {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.32, 18), blackMat);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        tire.receiveShadow = true;
        // small hub
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0x666666 }));
        hub.rotation.z = Math.PI / 2; hub.position.set(0, 0, 0);
        const wheel = new THREE.Group(); wheel.add(tire); wheel.add(hub);
        return wheel;
    }

    // Create wheels and pivots so front wheels can visually steer
    const flWheel = makeWheel(); const frWheel = makeWheel(); const blWheel = makeWheel(); const brWheel = makeWheel();
    const flPivot = new THREE.Object3D(); const frPivot = new THREE.Object3D();
    flPivot.position.set(-0.95, 0.15, 1.1); frPivot.position.set(0.95, 0.15, 1.1);
    blWheel.position.set(-0.95, 0.15, -1.05); brWheel.position.set(0.95, 0.15, -1.05);
    flWheel.position.set(0,0,0); frWheel.position.set(0,0,0);
    flPivot.add(flWheel); frPivot.add(frWheel);
    car.add(flPivot, frPivot, blWheel, brWheel);

    // small front suspension struts (visual only)
    function makeStrut() { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.5,8), carbonMat); s.rotation.x = Math.PI/2; return s; }
    const lStrut = makeStrut(); lStrut.position.set(-0.6, 0.12, 1.0); lStrut.rotation.z = 0.35; const rStrut = lStrut.clone(); rStrut.position.x = 0.6; rStrut.rotation.z = -0.35;
    car.add(lStrut, rStrut);

    car.position.set(0, 0, trackRadiusZ - 2);
    car.castShadow = true;
    scene.add(car);

    // vehicle state using SI units: speed in m/s
    const state = {
        speed: 0,                    // m/s
        maxSpeed: 220/3.6,           // m/s (220 km/h)
        engineAccel: 12.0,           // m/s^2 (approximate effective accel)
        brakeDecel: 30.0,            // m/s^2 strong braking
        rollingDrag: 0.5,            // m/s^2 approx constant rolling resistance
        aeroDrag: 0.045,             // quadratic drag coefficient (tuned)
        steerAngle: 0,
        maxSteer: Math.PI/8,         // ~22.5 degrees max steer
        steeringSpeed: 3.5,          // how fast driver turns the wheel
        heading: 0,
        wheelbase: 2.2,              // distance between axles (approx)
        maxReverse: 25/3.6           // m/s (25 km/h reverse)
    };
    function mpsToKmh(v){ return v * 3.6; }
    const input = { forward:false, backward:false, left:false, right:false, reset:false };
    window.addEventListener('keydown', (e)=>{
        if (e.key==='w'||e.key==='W') input.forward=true;
        if (e.key==='s'||e.key==='S') input.backward=true;
        if (e.key==='a'||e.key==='A') input.left=true;
        if (e.key==='d'||e.key==='D') input.right=true;
        if (e.key==='r'||e.key==='R') input.reset=true;
    });
    window.addEventListener('keyup', (e)=>{
        if (e.key==='w'||e.key==='W') input.forward=false;
        if (e.key==='s'||e.key==='S') input.backward=false;
        if (e.key==='a'||e.key==='A') input.left=false;
        if (e.key==='d'||e.key==='D') input.right=false;
        if (e.key==='r'||e.key==='R') input.reset=false;
    });

    // UI
    const speedEl = document.getElementById('speed');
    const lapEl = document.getElementById('lap');
    const timeEl = document.getElementById('time');

    // lap detection
    let lap = 0; let startAngle = Math.atan2(car.position.z, car.position.x); let startTime = performance.now();
    let last = performance.now();

    function normalizeAngle(a){ while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2; return a; }

    function update(){
        const now = performance.now(); const dt = (now-last)/1000; last = now;
        // longitudinal: engine/brake + rolling + aero drag
        if (input.forward) {
            state.speed += state.engineAccel * dt;
        } else if (input.backward) {
            // strong braking
            state.speed -= state.brakeDecel * dt;
        } else {
            // natural rolling resistance
            const sign = Math.sign(state.speed) || 1;
            state.speed -= sign * state.rollingDrag * dt;
        }
        // aerodynamic (quadratic) drag
        const drag = state.aeroDrag * state.speed * Math.abs(state.speed);
        state.speed -= drag * dt;
        // clamp speeds
        state.speed = Math.min(state.speed, state.maxSpeed);
        state.speed = Math.max(state.speed, -state.maxReverse);

        // steering input (driver wheel angle)
        const steerDir = (input.left?1:0) - (input.right?1:0);
        state.steerAngle += steerDir * state.steeringSpeed * dt;
        state.steerAngle = Math.max(Math.min(state.steerAngle, state.maxSteer), -state.maxSteer);

        // bicycle model for heading change: yaw rate = v / L * tan(steerAngle)
        const velocity = state.speed; // m/s
        const yawRate = (velocity / state.wheelbase) * Math.tan(state.steerAngle || 0);
        state.heading += yawRate * dt;
        // integrate position
        car.position.x += Math.sin(state.heading) * velocity * dt;
        car.position.z += Math.cos(state.heading) * velocity * dt;
        car.rotation.y = state.heading;
        if (input.reset){ car.position.set(0,0, trackRadiusZ - 2); state.speed=0; state.heading=0; state.steerAngle=0; lap=0; startTime=performance.now(); }
    // wheel visuals: spin based on travel distance and visually steer front pivots if present
        const travel = Math.abs(velocity) * dt; // units moved this frame
        const wheelRadius = 0.28;
        const spin = travel / wheelRadius; // approximate radians rotated this frame
        try {
            // rear wheels (blWheel/brWheel) rotate around X
            blWheel.rotation.x += spin * (state.speed >= 0 ? -1 : 1);
            brWheel.rotation.x += spin * (state.speed >= 0 ? -1 : 1);
            // front wheels rotate and steer via pivot
            flWheel.rotation.x += spin * (state.speed >= 0 ? -1 : 1);
            frWheel.rotation.x += spin * (state.speed >= 0 ? -1 : 1);
            flPivot.rotation.y = state.steerAngle;
            frPivot.rotation.y = state.steerAngle;
        } catch (e) {
            // fallback: model may not have wheel objects (older state) - ignore
        }

    // camera: place behind the car with smoothing
    // desired offset in car-local space: slightly lower and behind
    const desiredOffset = new THREE.Vector3(0, 2.2, -6).applyAxisAngle(new THREE.Vector3(0,1,0), state.heading);
    const desiredPos = new THREE.Vector3().copy(car.position).add(desiredOffset);
    // smooth camera movement
    camera.position.lerp(desiredPos, 0.12);
    // look slightly above the car's body
    const lookAt = new THREE.Vector3(car.position.x, car.position.y + 0.9, car.position.z);
    camera.lookAt(lookAt);

        // show absolute (positive) speed in the UI
        speedEl.innerText = Math.round(Math.abs(state.speed));
        const elapsed = (performance.now()-startTime)/1000; timeEl.innerText = elapsed.toFixed(2); lapEl.innerText = lap;
        const angle = Math.atan2(car.position.z, car.position.x); const delta = normalizeAngle(angle - startAngle);
        const distToStart = car.position.distanceTo(new THREE.Vector3(0,0, trackRadiusZ - 2));
        if (distToStart < 5 && Math.abs(delta) < 0.5 && kmhToUnitsPerSec(state.speed) > 1) { lap += 1; startTime = performance.now(); }
    }

    function checkOffTrack(){ const x = car.position.x, z = car.position.z; const value = (x*x)/(trackRadiusX*trackRadiusX)+(z*z)/(trackRadiusZ*trackRadiusZ); if (value>1.1){ state.speed -= Math.sign(state.speed)*200*(Math.sqrt(value)-1)*0.016; } }

    function loop(){ update(); checkOffTrack(); renderer.render(scene, camera); requestAnimationFrame(loop); }
    loop();

    window.addEventListener('resize', ()=>{ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

    console.log('F1 web game (UMD) loaded');
}