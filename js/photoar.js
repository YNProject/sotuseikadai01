// 要素の取得
const startScreen = document.getElementById('start-screen');
const mainUI = document.getElementById('main-ui');
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const shotBtn = document.getElementById('shotBtn');
const scene = document.querySelector('a-scene');

let selectedImgUrl = null;
let canPlace = false;
let appStarted = false;

// スタート画面タップ
startScreen.addEventListener('click', () => {
    startScreen.style.opacity = '0';
    setTimeout(() => {
        startScreen.style.display = 'none';
        mainUI.style.display = 'flex';
        appStarted = true;
    }, 500);
});

// 写真選択
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const maxSide = 1024;
                let w = img.width, h = img.height;
                if (w > h) { if (w > maxSide) { h *= maxSide / w; w = maxSide; } }
                else { if (h > maxSide) { w *= maxSide / h; h = maxSide; } }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                selectedImgUrl = canvas.toDataURL('image/jpeg', 0.8);
                canPlace = true;
                fileLabel.innerText = "✅ 画面をタップ！";
                fileLabel.style.background = "#2e7d32";
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 配置
const addPhotoToSpace = (e) => {
    if (!appStarted || e.target.closest('.ui-container')) return;
    if (!selectedImgUrl || !canPlace) return;

    const cameraObj = document.getElementById('myCamera').object3D;
    const pos = new THREE.Vector3();
    const dir = new THREE.Vector3();
    cameraObj.getWorldPosition(pos);
    cameraObj.getWorldDirection(dir);

    const plane = document.createElement('a-plane');
    plane.setAttribute('material', 'side: double; shader: flat; transparent: true;');
    const dist = 1.2;
    plane.setAttribute('position', {
        x: pos.x + dir.x * -dist,
        y: pos.y + dir.y * -dist,
        z: pos.z + dir.z * -dist
    });
    plane.setAttribute('look-at', '#myCamera');

    const loader = new THREE.TextureLoader();
    loader.load(selectedImgUrl, (tex) => {
        const aspect = tex.image.width / tex.image.height;
        plane.setAttribute('width', 0.2 * aspect); // サイズ0.2
        plane.setAttribute('height', 0.2);
        plane.getObject3D('mesh').material.map = tex;
    });

    scene.appendChild(plane);
    canPlace = false;
    fileLabel.innerText = "① 写真を選ぶ";
    fileLabel.style.background = "rgba(0,0,0,0.8)";
};

window.addEventListener('mousedown', addPhotoToSpace);
window.addEventListener('touchstart', addPhotoToSpace);

// 撮影
shotBtn.addEventListener('click', async () => {
    try {
        const video = document.querySelector('video');
        const sceneCanvas = scene.components.screenshot.getCanvas('perspective');
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = video.videoWidth;
        finalCanvas.height = video.videoHeight;
        const ctx = finalCanvas.getContext("2d");

        ctx.drawImage(video, 0, 0, finalCanvas.width, finalCanvas.height);
        
        const vAspect = video.videoWidth / video.videoHeight;
        const cAspect = sceneCanvas.width / sceneCanvas.height;
        let drawW, drawH, offsetX, offsetY;
        if (cAspect > vAspect) {
            drawH = finalCanvas.height; drawW = finalCanvas.height * cAspect;
            offsetX = (finalCanvas.width - drawW) / 2; offsetY = 0;
        } else {
            drawW = finalCanvas.width; drawH = finalCanvas.width / cAspect;
            offsetX = 0; offsetY = (finalCanvas.height - drawH) / 2;
        }
        ctx.drawImage(sceneCanvas, offsetX, offsetY, drawW, drawH);

        const dataURL = finalCanvas.toDataURL('image/png');
        
        // 演出
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:white;z-index:100000;pointer-events:none;';
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.transition='opacity 0.4s'; flash.style.opacity='0'; setTimeout(()=>flash.remove(),400); }, 50);

        if (navigator.share) {
            const blob = await (await fetch(dataURL)).blob();
            const file = new File([blob], `ar-photo.png`, { type: 'image/png' });
            await navigator.share({ files: [file] }).catch(()=>{});
        } else {
            const link = document.createElement('a');
            link.download = `ar-photo.png`; link.href = dataURL; link.click();
        }
    } catch (err) { console.error(err); }
});