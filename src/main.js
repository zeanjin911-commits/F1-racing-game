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

    // Simple F1 car model (body + wheels)
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 3.2), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    body.position.y = 0.35 / 2 + 0.05;
    car.add(body);

    function makeWheel() {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        w.rotation.z = Math.PI / 2;
        w.castShadow = true;
        return w;
    }
    const fl = makeWheel(); fl.position.set(-0.8, 0.15, 1.05);
    const fr = fl.clone(); fr.position.set(0.8, 0.15, 1.05);
    const bl = fl.clone(); bl.position.set(-0.8, 0.15, -1.05);
    const br = fl.clone(); br.position.set(0.8, 0.15, -1.05);
    car.add(fl, fr, bl, br);
    car.position.set(0, 0, trackRadiusZ - 2);
    car.castShadow = true;
    scene.add(car);

    // controls state
    const state = { speed: 0, maxSpeed: 120, accel: 80, brake: 200, steerAngle: 0, maxSteer: Math.PI/5, steeringSpeed: 2.5, heading: 0 };
    function kmhToUnitsPerSec(kmh){ return (kmh/3.6); }
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
        if (input.forward) state.speed += state.accel * dt; else if (input.backward) state.speed -= state.brake * dt; else state.speed -= Math.sign(state.speed)*40*dt;
        state.speed = Math.max(Math.min(state.speed, state.maxSpeed), -30);
        const steerDir = (input.left?1:0)-(input.right?1:0);
        state.steerAngle += steerDir * state.steeringSpeed * dt; state.steerAngle = Math.max(Math.min(state.steerAngle, state.maxSteer), -state.maxSteer);
        const velocity = kmhToUnitsPerSec(state.speed);
        state.heading += state.steerAngle * velocity * dt * 0.05;
        car.position.x += Math.sin(state.heading) * velocity * dt;
        car.position.z += Math.cos(state.heading) * velocity * dt;
        car.rotation.y = state.heading;
        if (input.reset){ car.position.set(0,0, trackRadiusZ - 2); state.speed=0; state.heading=0; state.steerAngle=0; lap=0; startTime=performance.now(); }
        const camOffset = new THREE.Vector3(0,4.5,8).applyAxisAngle(new THREE.Vector3(0,1,0), state.heading);
        camera.position.copy(car.position).add(camOffset);
        camera.lookAt(car.position.x, car.position.y+1, car.position.z);
        speedEl.innerText = Math.round(state.speed);
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