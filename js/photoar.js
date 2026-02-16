document.addEventListener("DOMContentLoaded", () => {

    const scene = document.querySelector('a-scene');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const shotBtn = document.getElementById('shotBtn');
    const startScreen = document.getElementById('start-screen');
    const mainUI = document.getElementById('main-ui');

    let selectedImgUrl = null;
    let canPlace = false;
    let appStarted = false;

    // -------------------
    // スタート画面
    // -------------------
    startScreen.addEventListener('click', () => {
        startScreen.style.opacity = '0';
        setTimeout(() => {
            startScreen.style.display = 'none';
            mainUI.style.display = 'flex';
            appStarted = true;
        }, 500);
    });

    // -------------------
    // 画像選択
    // -------------------
    fileInput.addEventListener('change', (e) => {

        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {

            const img = new Image();

            img.onload = () => {

                const maxSide = 1024;
                let w = img.width;
                let h = img.height;

                if (w > h && w > maxSide) {
                    h *= maxSide / w;
                    w = maxSide;
                } else if (h > maxSide) {
                    w *= maxSide / h;
                    h = maxSide;
                }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);

                selectedImgUrl = canvas.toDataURL('image/jpeg', 0.8);
                canPlace = true;

                fileLabel.innerText = "✅ 画面をタップ！";
                fileLabel.style.background = "#2e7d32";
            };

            img.src = event.target.result;
        };

        reader.readAsDataURL(file);
    });

    // -------------------
    // 写真配置
    // -------------------
    const addPhotoToSpace = (e) => {

        if (!appStarted || e.target.closest('.ui-container')) return;
        if (!selectedImgUrl || !canPlace) return;

        const cameraObj = document.getElementById('myCamera').object3D;

        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();

        cameraObj.getWorldPosition(pos);
        cameraObj.getWorldDirection(dir);

        const newImage = document.createElement('a-plane');

        newImage.setAttribute('material', 'side: double; shader: flat; transparent: true;');

        const distance = 1.2;

        newImage.setAttribute('position', {
            x: pos.x + dir.x * -distance,
            y: pos.y + dir.y * -distance,
            z: pos.z + dir.z * -distance
        });

        scene.appendChild(newImage);

        const loader = new THREE.TextureLoader();

        loader.load(selectedImgUrl, (texture) => {

            newImage.addEventListener('loaded', () => {

                const mesh = newImage.getObject3D('mesh');
                if (!mesh) return;

                mesh.material.map = texture;
                mesh.material.needsUpdate = true;

                const imgW = texture.image.width;
                const imgH = texture.image.height;
                const aspect = imgW / imgH;

                const maxSize = 0.25;

                if (aspect >= 1) {
                    newImage.setAttribute('width', maxSize);
                    newImage.setAttribute('height', maxSize / aspect);
                } else {
                    newImage.setAttribute('height', maxSize);
                    newImage.setAttribute('width', maxSize * aspect);
                }

                const camPos = new THREE.Vector3();
                cameraObj.getWorldPosition(camPos);
                newImage.object3D.lookAt(camPos);
            });
        });

        canPlace = false;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,0.8)";
    };

    window.addEventListener('mousedown', addPhotoToSpace);
    window.addEventListener('touchstart', addPhotoToSpace);

    // -------------------
    // 撮影
    // -------------------
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
                drawH = finalCanvas.height;
                drawW = finalCanvas.height * cAspect;
                offsetX = (finalCanvas.width - drawW) / 2;
                offsetY = 0;
            } else {
                drawW = finalCanvas.width;
                drawH = finalCanvas.width / cAspect;
                offsetX = 0;
                offsetY = (finalCanvas.height - drawH) / 2;
            }

            ctx.drawImage(sceneCanvas, offsetX, offsetY, drawW, drawH);

            const dataURL = finalCanvas.toDataURL('image/png');

            const link = document.createElement('a');
            link.download = `ar-${Date.now()}.png`;
            link.href = dataURL;
            link.click();

        } catch (err) {
            console.error(err);
        }
    });
});
