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
        const glCanvas = sceneEl.components.screenshot.getCanvas('perspective');

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        
        // 保存用キャンバスをカメラの解像度で作成
        const canvas = document.createElement('canvas');
        canvas.width = vw;
        canvas.height = vh;
        const ctx = canvas.getContext('2d');

        // 1. カメラ映像をそのまま描画
        ctx.drawImage(video, 0, 0, vw, vh);

        // 2. ARレイヤー（glCanvas）を「画面の見た目」に合わせて計算
        // glCanvasはブラウザの描画領域サイズ（CSSサイズ）で出力されるため、
        // 実際のビデオサイズ（vw, vh）との比率の差（歪み）を計算します。
        
        const screenAspect = window.innerWidth / window.innerHeight;
        const videoAspect = vw / vh;

        let drawW, drawH, offsetX, offsetY;

        // AR.jsが「object-fit: cover」のようにカメラを表示していることを前提に計算
        if (videoAspect > screenAspect) {
            // ビデオの方が横長（スマホ縦持ちでよくあるケース）
            drawH = vh;
            drawW = vh * screenAspect;
            offsetX = (vw - drawW) / 2;
            offsetY = 0;
        } else {
            // ビデオの方が縦長
            drawW = vw;
            drawH = vw / screenAspect;
            offsetX = 0;
            offsetY = (vh - drawH) / 2;
        }

        // AR側（glCanvas）全体を、計算した「見えている範囲」にぴったり重ねる
        // これにより、画面で見ている通りの比率に補正されます
        ctx.drawImage(glCanvas, offsetX, offsetY, drawW, drawH);

        // 3. 書き出し処理
        const url = canvas.toDataURL('image/png');
        
        // フラッシュ演出
        const f = document.createElement('div');
        f.style.cssText = 'position:fixed;inset:0;background:white;z-index:9999;pointer-events:none;opacity:1;';
        document.body.appendChild(f);
        setTimeout(() => {
            f.style.transition = 'opacity 0.4s';
            f.style.opacity = '0';
            setTimeout(() => f.remove(), 400);
        }, 50);

        // 保存・共有
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
