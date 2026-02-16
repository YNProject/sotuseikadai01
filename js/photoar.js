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

    // スタート画面
    startScreen.addEventListener('click', () => {
        startScreen.style.opacity = '0';
        setTimeout(() => {
            startScreen.style.display = 'none';
            mainUI.style.display = 'flex';
            appStarted = true;
        }, 400);
    });

    // 画像選択
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

    // AR配置
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

    // 【修正版】真っ暗にならない保存ロジック
    shotBtn.addEventListener('click', () => {
        try {
            const video = document.querySelector('video');
            const glCanvas = scene.canvas; // scene.components.screenshotを使わず直接Canvasを取得

            // A-Frameに現在のフレームを強制描画（真っ黒回避）
            scene.renderer.render(scene.object3D, scene.camera);

            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const sw = window.innerWidth;
            const sh = window.innerHeight;

            const canvas = document.createElement('canvas');
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext('2d');

            // 1. カメラ映像のクロップ計算
            const videoAspect = vw / vh;
            const screenAspect = sw / sh;
            let sx, sy, sWidth, sHeight;

            if (videoAspect > screenAspect) {
                sWidth = vh * screenAspect; sHeight = vh;
                sx = (vw - sWidth) / 2; sy = 0;
            } else {
                sWidth = vw; sHeight = vw / screenAspect;
                sx = 0; sy = (vh - sHeight) / 2;
            }

            // カメラを描画
            ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, sw, sh);
            // ARを描画 (scene.canvasをそのまま使用)
            ctx.drawImage(glCanvas, 0, 0, sw, sh);

            const url = canvas.toDataURL('image/png');
            
            // 保存・共有
            saveImage(url);

        } catch (e) { console.error(e); }
    });

    async function saveImage(url) {
        // フラッシュ演出
        const f = document.createElement('div');
        f.style.cssText = 'position:fixed;inset:0;background:white;z-index:9999;pointer-events:none;';
        document.body.appendChild(f);
        setTimeout(() => { f.style.transition='opacity .4s'; f.style.opacity=0; setTimeout(()=>f.remove(),400); }, 50);

        if (navigator.share) {
            const blob = await (await fetch(url)).blob();
            const file = new File([blob], `ar-${Date.now()}.png`, { type: 'image/png' });
            await navigator.share({ files: [file] }).catch(() => {});
        } else {
            const a = document.createElement('a');
            a.href = url; a.download = `ar-${Date.now()}.png`; a.click();
        }
    }
};