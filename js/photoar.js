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
    shotBtn.addEventListener('click', async () => {
        try {
            const video = document.querySelector('video');
            const glCanvas = scene.canvas;
            if (!video || !glCanvas) {
                alert("カメラまたはARの準備ができていません");
                return;
            }

            // A-Frameのレンダラーに現在の状態を描画させる
            scene.renderer.render(scene.object3D, scene.camera);

            // 保存用のキャンバスを作成（表示サイズに合わせる）
            const canvas = document.createElement('canvas');
            const displayWidth = video.clientWidth;
            const displayHeight = video.clientHeight;
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            const ctx = canvas.getContext('2d');

            // --- 1. ビデオ（カメラ背景）の描画 ---
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const videoAspect = vw / vh;
            const screenAspect = displayWidth / displayHeight;

            let sx, sy, sw, sh;
            if (videoAspect > screenAspect) {
                sw = vh * screenAspect;
                sh = vh;
                sx = (vw - sw) / 2;
                sy = 0;
            } else {
                sw = vw;
                sh = vw / screenAspect;
                sx = 0;
                sy = (vh - sh) / 2;
            }
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, displayWidth, displayHeight);

            // --- 2. ARレイヤー（物体）の描画 ---
            // 画面上の見た目のサイズで合成することで「つぶれ」を防止
            ctx.drawImage(glCanvas, 0, 0, displayWidth, displayHeight);

            // --- 3. 保存実行 ---
            const url = canvas.toDataURL('image/png');
            
            // saveImage関数を呼び出す（もし関数が見つからないエラーが出る場合は、ここに直接処理を書く）
            if (typeof saveImage === 'function') {
                saveImage(url);
            } else {
                // saveImage関数がスコープ外にある場合のフォールバック
                const a = document.createElement('a');
                a.href = url;
                a.download = `ar-${Date.now()}.png`;
                a.click();
            }

        } catch (err) {
            console.error("Capture failed:", err);
            alert("保存に失敗しました: " + err.message);
        }
    });
}; // ここで全て閉じる (成功コードと同じ構造)