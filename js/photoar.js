window.onload = () => {
    const scene = document.querySelector('a-scene');
    const arWorld = document.getElementById('ar-world');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const shotBtn = document.getElementById('shotBtn');
    const startScreen = document.getElementById('start-screen');
    const mainUI = document.getElementById('main-ui');

    let selectedImgUrl = null;
    let selectedAspect = 1; 
    let canPlace = false;
    let appStarted = false;

    // 1. スタート画面
    startScreen.addEventListener('click', () => {
        startScreen.style.opacity = '0';
        setTimeout(() => {
            startScreen.style.display = 'none';
            mainUI.style.display = 'flex';
            appStarted = true;
            // A-FrameのARモードへ移行
            scene.enterVR(); 
        }, 400);
    });

    // 2. 写真の読み込み (変更なし)
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

    // 3. WebXR 空間への写真配置
    function addPhoto(e) {
        if (!appStarted || e.target.closest('.ui-container')) return;
        if (!selectedImgUrl || !canPlace) return;

        const camObj = document.getElementById('myCamera').object3D;
        
        // カメラの現在の「世界での位置」と「向き」を取得
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        camObj.getWorldPosition(pos);
        camObj.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        
        // カメラの1.2m先に固定
        const dist = 1.2;
        const targetPos = {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist,
            z: pos.z - dir.z * dist
        };

        plane.setAttribute('position', targetPos);
        plane.setAttribute('material', 'shader:flat;side:double;transparent:true');
        
        // 配置した瞬間にカメラの方を向かせる
        plane.object3D.lookAt(pos);

        arWorld.appendChild(plane);

        new THREE.TextureLoader().load(selectedImgUrl, tex => {
            const mesh = plane.getObject3D('mesh');
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
            const size = 0.6;
            if (selectedAspect >= 1) {
                plane.setAttribute('width', size);
                plane.setAttribute('height', size / selectedAspect);
            } else {
                plane.setAttribute('height', size);
                plane.setAttribute('width', size * selectedAspect);
            }
        });

        canPlace = false;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,.8)";
    }

    window.addEventListener('mousedown', addPhoto);
    window.addEventListener('touchstart', addPhoto, { passive: false });

    // 4. 保存ロジック（WebXRは背景ビデオの取得方法が特殊なため、既存を維持しつつ調整）
    shotBtn.addEventListener('click', async () => {
        // ... (以前の保存ロジックと基本同じですが、WebXRではブラウザ側の制約により
        // カメラ映像がCanvasに直接描画されない場合があります。その場合はスクリーンショット機能を別途検討します)
        // まずはこの配置のテストを優先しましょう
    });
};