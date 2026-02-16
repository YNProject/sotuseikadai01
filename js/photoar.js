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

    // 1. スタート画面制御
    startScreen.addEventListener('click', () => {
        startScreen.style.opacity = '0';
        setTimeout(() => {
            startScreen.style.display = 'none';
            mainUI.style.display = 'flex';
            appStarted = true;
        }, 400);
    });

    // 2. 画像選択・リサイズ
    fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                const max = 1024;
                let w = img.width, h = img.height;
                if (w > h && w > max) { h *= max / w; w = max; }
                else if (h > max) { w *= max / h; h = max; }
                c.width = w; c.height = h;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                selectedImgUrl = c.toDataURL('image/jpeg', 0.9);
                canPlace = true;
                fileLabel.innerText = "✅ 画面をタップ！";
                fileLabel.style.background = "#2e7d32";
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 3. AR平面の配置
    function addPhoto(e) {
        if (!appStarted || e.target.closest('.ui-container')) return;
        if (!selectedImgUrl || !canPlace) return;

        const camObj = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();

        camObj.getWorldPosition(pos);
        camObj.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        plane.setAttribute('material', 'shader:flat;side:double;transparent:true');
        const dist = 1.2;
        plane.setAttribute('position', {
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
            const size = 0.5;
            if (a >= 1) { plane.setAttribute('width', size); plane.setAttribute('height', size / a); }
            else { plane.setAttribute('height', size); plane.setAttribute('width', size * a); }
            plane.object3D.lookAt(pos);
        });

        canPlace = false;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,.8)";
    }

    window.addEventListener('mousedown', addPhoto);
    window.addEventListener('touchstart', addPhoto, {passive: false});

    // 4. 【決定版】横伸び・横潰れを修正した保存ロジック
// 4. 【修正版】解像度と比率を完全に維持する保存ロジック
// 4. 【修正版】動作実績のあるコードをベースに比率だけ正す
    shotBtn.addEventListener('click', () => {
        try {
            const video = document.querySelector('video');
            const glCanvas = scene.canvas;

            if (!video || !glCanvas) return;

            // 最新の状態を描画
            scene.renderer.render(scene.object3D, scene.camera);

            // 元のコードで成功していた「表示サイズ」を基準にする
            const vWidth = video.clientWidth;
            const vHeight = video.clientHeight;

            const canvas = document.createElement('canvas');
            canvas.width = vWidth;
            canvas.height = vHeight;
            const ctx = canvas.getContext('2d');

            // --- ここからが比率修正のキモ ---
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const videoAspect = vw / vh;
            const screenAspect = vWidth / vHeight;

            let sx, sy, sw, sh;

            // object-fit: cover と同じ計算を手動で行う
            if (videoAspect > screenAspect) {
                // ビデオが横長すぎる場合：左右をカット
                sw = vh * screenAspect;
                sh = vh;
                sx = (vw - sw) / 2;
                sy = 0;
            } else {
                // ビデオが縦長すぎる場合：上下をカット
                sw = vw;
                sh = vw / screenAspect;
                sx = 0;
                sy = (vh - sh) / 2;
            }

            // 1. カメラ映像を描画（計算した sx, sy を使う）
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, vWidth, vHeight);
            
            // 2. AR写真を重ねる（これは表示サイズそのままでOK）
            ctx.drawImage(glCanvas, 0, 0, vWidth, vHeight);

            const url = canvas.toDataURL('image/png');
            saveImage(url);

        } catch (e) {
            console.error("Capture failed:", e);
        }
    });
};