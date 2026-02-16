window.onload = () => {
    const scene = document.querySelector('a-scene');
    const arWorld = document.getElementById('ar-world');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const startScreen = document.getElementById('start-screen');

    let selectedImgUrl = null;
    let selectedAspect = 1;

    // 1. 開始時の処理
    scene.addEventListener('enter-vr', () => {
        startScreen.style.display = 'none';
    });

    // 2. 画像の読み込みとリサイズ
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
                selectedImgUrl = c.toDataURL('image/jpeg', 0.8);
                selectedAspect = w / h;
                fileLabel.innerText = "✅ 画面をタップ！";
                fileLabel.style.borderColor = "#4caf50";
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 3. 空間への配置
    scene.addEventListener('click', (e) => {
        // ボタン領域のクリックなら無視
        if (!selectedImgUrl || e.target.closest('.button-row')) return;

        const camObj = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        
        // カメラの現在の世界座標と向きを取得
        camObj.getWorldPosition(pos);
        camObj.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        
        // 1.2m先に配置
        const dist = 1.2;
        plane.setAttribute('position', {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist,
            z: pos.z - dir.z * dist
        });
        
        plane.setAttribute('material', 'shader:flat;side:double;transparent:true');
        
        // 写真をカメラの方へ向かせる
        plane.object3D.lookAt(pos);

        // テクスチャ適用とサイズ調整
        new THREE.TextureLoader().load(selectedImgUrl, tex => {
            const mesh = plane.getObject3D('mesh');
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
            
            const size = 0.5; // 基本サイズ（メートル単位）
            if (selectedAspect >= 1) {
                plane.setAttribute('width', size);
                plane.setAttribute('height', size / selectedAspect);
            } else {
                plane.setAttribute('height', size);
                plane.setAttribute('width', size * selectedAspect);
            }
        });

        arWorld.appendChild(plane);

        // 状態リセット
        selectedImgUrl = null;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.borderColor = "white";
    });

    // 4. 保存機能（WebXR対応版）
    document.getElementById('shotBtn').addEventListener('click', () => {
        // WebXRでの完全なキャプチャは複雑なため、まずは配置の安定を確認
        alert("配置に成功したら、次は保存機能を最適化しましょう！");
    });
};