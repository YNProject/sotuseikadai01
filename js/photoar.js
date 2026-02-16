window.onload = () => {

const scene = document.querySelector('a-scene');
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const shotBtn = document.getElementById('shotBtn');
const startScreen = document.getElementById('start-screen');
const mainUI = document.getElementById('main-ui');

let selectedImgUrl = null;
let canPlace = false;
let appStarted = false;

// ----------------
// start screen
// ----------------
startScreen.addEventListener('click', () => {
    startScreen.style.opacity = '0';
    setTimeout(() => {
        startScreen.style.display = 'none';
        mainUI.style.display = 'flex';
        appStarted = true;
    }, 400);
});

// ----------------
// image select
// ----------------
fileInput.addEventListener('change', e => {

const file = e.target.files[0];
if (!file) return;

const reader = new FileReader();

reader.onload = ev => {

const img = new Image();

img.onload = () => {

let w = img.width;
let h = img.height;
const max = 1024;

if (w > h && w > max) {
    h *= max / w;
    w = max;
} else if (h > max) {
    w *= max / h;
    h = max;
}

const c = document.createElement('canvas');
c.width = w;
c.height = h;
c.getContext('2d').drawImage(img,0,0,w,h);

selectedImgUrl = c.toDataURL('image/jpeg',0.9);
canPlace = true;

fileLabel.innerText = "✅ 画面をタップ！";
fileLabel.style.background="#2e7d32";
};

img.src = ev.target.result;
};

reader.readAsDataURL(file);
});

// ----------------
// place photo
// ----------------
function addPhoto(e){

if(!appStarted || e.target.closest('.ui-container')) return;
if(!selectedImgUrl || !canPlace) return;

const cam = document.getElementById('myCamera').object3D;

const pos = new THREE.Vector3();
const dir = new THREE.Vector3();

cam.getWorldPosition(pos);
cam.getWorldDirection(dir);

const plane = document.createElement('a-plane');
plane.setAttribute('material','shader:flat;side:double;transparent:true');

const dist = 1.2;

plane.setAttribute('position',{
x: pos.x - dir.x * dist,
y: pos.y - dir.y * dist,
z: pos.z - dir.z * dist
});

scene.appendChild(plane);

new THREE.TextureLoader().load(selectedImgUrl, tex => {

const mesh = plane.getObject3D('mesh');
mesh.material.map = tex;
mesh.material.needsUpdate = true;

const a = tex.image.width / tex.image.height;
const size = 0.25;

if(a>=1){
plane.setAttribute('width',size);
plane.setAttribute('height',size/a);
}else{
plane.setAttribute('height',size);
plane.setAttribute('width',size*a);
}

// face camera once
const cp = new THREE.Vector3();
cam.getWorldPosition(cp);
plane.object3D.lookAt(cp);

});

canPlace=false;
fileLabel.innerText="① 写真を選ぶ";
fileLabel.style.background="rgba(0,0,0,.8)";
}

window.addEventListener('mousedown',addPhoto);
window.addEventListener('touchstart',addPhoto);

// ----------------
// capture (NO distortion)
// ----------------
shotBtn.addEventListener('click', async () => {
    try {
        const video = document.querySelector('video');
        const sceneEl = document.querySelector('a-scene');
        
        // A-Frameの描画用Canvasを直接取得
        const glCanvas = sceneEl.canvas; 

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        
        // 保存用Canvas（カメラの解像度）
        const canvas = document.createElement('canvas');
        canvas.width = vw;
        canvas.height = vh;
        const ctx = canvas.getContext('2d');

        // 1. カメラ映像を描画
        ctx.drawImage(video, 0, 0, vw, vh);

        // 2. ARレイヤー（glCanvas）を計算して重ねる
        // 画面の比率を取得
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const screenAspect = screenW / screenH;
        const videoAspect = vw / vh;

        let drawW, drawH, dx, dy;

        if (videoAspect > screenAspect) {
            // ビデオの方が横長（左右に余白ができるパターン）
            drawH = vh;
            drawW = vh * screenAspect;
            dx = (vw - drawW) / 2;
            dy = 0;
        } else {
            // ビデオの方が縦長（上下に余白ができるパターン）
            drawW = vw;
            drawH = vw / screenAspect;
            dx = 0;
            dy = (vh - drawH) / 2;
        }

        // ARのCanvasを、計算した「見えている範囲」に合わせて描画
        ctx.drawImage(glCanvas, dx, dy, drawW, drawH);

        // --- 以下、保存・共有処理 ---
        const url = canvas.toDataURL('image/png');

        // フラッシュ演出
        const f = document.createElement('div');
        f.style.cssText = 'position:fixed;inset:0;background:white;z-index:9999;pointer-events:none;';
        document.body.appendChild(f);
        setTimeout(() => {
            f.style.transition = 'opacity 0.4s';
            f.style.opacity = '0';
            setTimeout(() => f.remove(), 400);
        }, 50);

        if (navigator.share) {
            const blob = await (await fetch(url)).blob();
            const file = new File([blob], `ar-${Date.now()}.png`, { type: 'image/png' });
            await navigator.share({ files: [file] }).catch(() => {});
        } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = `ar-${Date.now()}.png`;
            a.click();
        }

    } catch (e) {
        console.error("Capture Error:", e);
    }
});
};
