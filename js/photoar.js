window.onload = () => {
    const scene = document.querySelector('a-scene');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const shotBtn = document.getElementById('shotBtn');
    const startScreen = document.getElementById('start-screen');
    const mainUI = document.getElementById('main-ui');

    let selectedImgUrl = null;
    let selectedAspect = 1; 
    let canPlace = false;
    let appStarted = false;

    startScreen.addEventListener('click', () => {
        startScreen.style.opacity = '0';
        setTimeout(() => {
            startScreen.style.display = 'none';
            mainUI.style.display = 'flex';
            appStarted = true;
        }, 400);
    });

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
                selectedAspect = w / h;
                canPlace = true;
                fileLabel.innerText = "✅ 画面をタップ！";
                fileLabel.style.background = "#2e7d32";
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

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
            const size = 0.2;
            if (selectedAspect >= 1) {
                plane.setAttribute('width', size);
                plane.setAttribute('height', size / selectedAspect);
            } else {
                plane.setAttribute('height', size);
                plane.setAttribute('width', size * selectedAspect);
            }
            plane.object3D.lookAt(pos);
        });
        canPlace = false;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,.8)";
    }
    window.addEventListener('mousedown', addPhoto);
    window.addEventListener('touchstart', addPhoto, { passive: false });

    // --- 保存ロジック：座標と比率を物理的に一致させる ---
    shotBtn.addEventListener('click', async () => {
        try {
            const video = document.querySelector('video');
            const glCanvas = scene.canvas;
            if (!video || !glCanvas) return;

            // 1. 保存用キャンバスを「スマホ画面の見た目そのまま」のサイズで作成
            const canvas = document.createElement('canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const ctx = canvas.getContext('2d');

            // 2. ビデオ背景を描画（表示領域に合わせて中央を切り抜く）
            const vAspect = video.videoWidth / video.videoHeight;
            const sAspect = canvas.width / canvas.height;
            let sx, sy, sw, sh;
            if (vAspect > sAspect) {
                sw = video.videoHeight * sAspect;
                sh = video.videoHeight;
                sx = (video.videoWidth - sw) / 2;
                sy = 0;
            } else {
                sw = video.videoWidth;
                sh = video.videoWidth / sAspect;
                sx = 0;
                sy = (video.videoHeight - sh) / 2;
            }
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

            // 3. ARレイヤーを描画
            scene.renderer.render(scene.object3D, scene.camera);

            // 【重要】glCanvasの「画面に映っている部分だけ」を切り出す計算
            // glCanvasはAR.jsによってビデオサイズ（例: 1280x720）になっているため
            const cw = glCanvas.width;
            const ch = glCanvas.height;
            const cAspect = cw / ch;
            
            let sourceX, sourceY, sourceW, sourceH;
            if (cAspect > sAspect) {
                sourceW = ch * sAspect;
                sourceH = ch;
                sourceX = (cw - sourceW) / 2;
                sourceY = 0;
            } else {
                sourceW = cw;
                sourceH = cw / sAspect;
                sourceX = 0;
                sourceY = (ch - sourceH) / 2;
            }

            // 見えている範囲だけをコピーして重ねる（これで白枠と歪みが消えます）
            ctx.drawImage(glCanvas, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);

            const url = canvas.toDataURL('image/jpeg', 0.8);
            saveImage(url);
        } catch (e) { console.error(e); }
    });

    async function saveImage(url) {
        const f = document.createElement('div');
        f.style.cssText = 'position:fixed;inset:0;background:white;z-index:9999;pointer-events:none;';
        document.body.appendChild(f);
        setTimeout(() => {
            f.style.transition = 'opacity .4s';
            f.style.opacity = 0;
            setTimeout(() => f.remove(), 400);
        }, 50);
        const blob = await (await fetch(url)).blob();
        const file = new File([blob], `ar-${Date.now()}.jpg`, { type: 'image/jpeg' });
        if (navigator.share) {
            try { await navigator.share({ files: [file] }); } catch (e) {}
        } else {
            const a = document.createElement('a');
            a.href = url; a.download = file.name; a.click();
        }
    }
};