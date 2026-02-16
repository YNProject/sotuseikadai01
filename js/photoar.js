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
// 4. 【動作優先】エラーを防ぎつつ保存するロジック
    shotBtn.addEventListener('click', () => {
        console.log("ボタンが押されました"); // デバッグ用
        
        try {
            const video = document.querySelector('video');
            const sceneEl = document.querySelector('a-scene'); // 直接取得
            const glCanvas = sceneEl ? sceneEl.canvas : null;

            if (!video) {
                alert("カメラ映像が見つかりません。");
                return;
            }
            if (!glCanvas) {
                alert("AR描画の準備ができていません。もう一度試してください。");
                return;
            }

            // A-Frameの描画を強制更新（バッファ読み取り用）
            sceneEl.renderer.render(sceneEl.object3D, sceneEl.camera);

            const canvas = document.createElement('canvas');
            
            // ズレを最小限にするため、一旦ビデオの表示サイズに合わせる
            const dpr = window.devicePixelRatio || 1;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');

            // 1. カメラ映像を全画面描画
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 2. AR写真を重ねる
            // glCanvasをビデオのサイズに合わせて引き伸ばして描画
            ctx.drawImage(glCanvas, 0, 0, canvas.width, canvas.height);

            const url = canvas.toDataURL('image/png');
            console.log("画像生成成功");
            saveImage(url);

        } catch (e) {
            alert("エラーが発生しました: " + e.message);
            console.error(e);
        }
    });
};