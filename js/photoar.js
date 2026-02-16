window.onload = () => {
    const scene = document.querySelector('a-scene');

// 追加：リサイズイベントが発生した時に、レンダラーのサイズを正しく更新する
    window.addEventListener('resize', () => {
        const camera = scene.camera;
        if (camera) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        }
    });


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

    // 4. 保存ロジック（比率修正済み）
// 4. 保存ロジック（比率修正済み）
shotBtn.addEventListener('click', () => {
    try {
        const video = document.querySelector('video');
        const glCanvas = scene.canvas;
        if (!video || !glCanvas) return;

        // 最新の状態をレンダリング
        scene.renderer.render(scene.object3D, scene.camera);

        const vWidth = video.clientWidth;
        const vHeight = video.clientHeight;
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        const canvas = document.createElement('canvas');
        canvas.width = vWidth;
        canvas.height = vHeight;
        const ctx = canvas.getContext('2d');

        // --- ビデオ背景の計算 (object-fit: cover を再現) ---
        const videoAspect = vw / vh;
        const screenAspect = vWidth / vHeight;
        let sx, sy, sWidth, sHeight;

        if (videoAspect > screenAspect) {
            sWidth = vh * screenAspect;
            sHeight = vh;
            sx = (vw - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = vw;
            sHeight = vw / screenAspect;
            sx = 0;
            sy = (vh - sHeight) / 2;
        }

        // 1. カメラ背景を描画
        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, vWidth, vHeight);
        
        // 2. ARレイヤー（Canvas）を「アスペクト比を維持して中央切り抜き」で合成
        // ★ここが修正ポイント★
        const cw = glCanvas.width;
        const ch = glCanvas.height;
        const canvasAspect = cw / ch;

        let csx, csy, csWidth, csHeight;
        if (canvasAspect > screenAspect) {
            csWidth = ch * screenAspect;
            csHeight = ch;
            csx = (cw - csWidth) / 2;
            csy = 0;
        } else {
            csWidth = cw;
            csHeight = cw / screenAspect;
            csx = 0;
            csy = (ch - csHeight) / 2;
        }

        ctx.drawImage(glCanvas, csx, csy, csWidth, csHeight, 0, 0, vWidth, vHeight);

        const url = canvas.toDataURL('image/png');
        saveImage(url);

    } catch (e) {
        console.error("Capture failed:", e);
    }
});
}; // ここで全て閉じる (成功コードと同じ構造)