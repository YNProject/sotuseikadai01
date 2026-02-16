window.onload = () => {
    // 全ての要素を「画面が読み終わった後」に取得する
    const scene = document.querySelector('a-scene');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const shotBtn = document.getElementById('shotBtn');
    const startScreen = document.getElementById('start-screen');
    const mainUI = document.getElementById('main-ui');

    let selectedImgUrl = null;
    let canPlace = false;
    let appStarted = false;

    // --- スタート画面の処理 ---
    startScreen.addEventListener('click', () => {
        startScreen.style.opacity = '0';
        setTimeout(() => {
            startScreen.style.display = 'none';
            mainUI.style.display = 'flex'; 
            appStarted = true;
        }, 500);
    });

    // 1. 画像の選択
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const maxSide = 1024;
                    let width = img.width, height = img.height;
                    if (width > height) {
                        if (width > maxSide) { height *= maxSide / width; width = maxSide; }
                    } else {
                        if (height > maxSide) { width *= maxSide / height; height = maxSide; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
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

    // 2. 配置処理
    const addPhotoToSpace = (e) => {
        if (!appStarted || e.target.closest('.ui-container')) return;
        if (!selectedImgUrl || !canPlace) return;

        const cameraObj = document.getElementById('myCamera').object3D;
        const position = new THREE.Vector3();
        const direction = new THREE.Vector3();
        cameraObj.getWorldPosition(position);
        cameraObj.getWorldDirection(direction);

        const newImage = document.createElement('a-plane');
        newImage.setAttribute('material', 'side: double; shader: flat; transparent: true; opacity: 0.9;');
        
        const distance = 1.2; 
        newImage.setAttribute('position', {
            x: position.x + direction.x * -distance,
            y: position.y + direction.y * -distance,
            z: position.z + direction.z * -distance
        });
        newImage.setAttribute('look-at', '#myCamera');

        const loader = new THREE.TextureLoader();
        loader.load(selectedImgUrl, (texture) => {
            const mesh = newImage.getObject3D('mesh');
            mesh.material.map = texture;
            mesh.material.opacity = 1.0;
            mesh.material.needsUpdate = true;
const imgW = texture.image.width;
const imgH = texture.image.height;
const aspect = imgW / imgH;

const maxSize = 0.25; // 表示したい最大辺サイズ（お好み）

if (aspect >= 1) {
    // 横長 → 幅固定
    newImage.setAttribute('width', maxSize);
    newImage.setAttribute('height', maxSize / aspect);
} else {
    // 縦長 → 高さ固定
    newImage.setAttribute('height', maxSize);
    newImage.setAttribute('width', maxSize * aspect);
}

        });

        scene.appendChild(newImage);
        canPlace = false;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,0.8)";
    };

    window.addEventListener('mousedown', addPhotoToSpace);
    window.addEventListener('touchstart', addPhotoToSpace);

    // 3. 撮影機能
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
            const flash = document.createElement('div');
            flash.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:white;z-index:10001;pointer-events:none;';
            document.body.appendChild(flash);
            setTimeout(() => { flash.style.transition = 'opacity 0.4s'; flash.style.opacity = '0'; setTimeout(() => flash.remove(), 400); }, 50);

            if (navigator.share && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
                const blob = await (await fetch(dataURL)).blob();
                const file = new File([blob], `ar-capture-${Date.now()}.png`, { type: 'image/png' });
                await navigator.share({ files: [file] }).catch(() => {});
            } else {
                const link = document.createElement('a');
                link.download = `ar-capture-${Date.now()}.png`; link.href = dataURL; link.click();
            }
        } catch (err) { console.error(err); }
    });
};