window.onload = () => {
    const scene = document.querySelector('a-scene');
    const arWorld = document.getElementById('ar-world');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const startScreen = document.getElementById('start-screen');

    let selectedImgUrl = null;
    let selectedAspect = 1;

    // 1. スタート画面をタップしてAR開始（ARボタンの代わり）
    startScreen.addEventListener('click', () => {
        scene.enterVR(); // これでカメラとWebXRが起動
        startScreen.style.display = 'none';
    });

    // 2. 画像選択処理
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
                fileLabel.style.background = "#2e7d32";
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 3. 写真配置（移動検知対応）
    scene.addEventListener('click', (e) => {
        // UIボタンのクリック時は配置しない
        if (!selectedImgUrl || e.target.closest('.ui-btn')) return;

        const camObj = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        
        // カメラの現在の位置と向きを世界座標で取得
        camObj.getWorldPosition(pos);
        camObj.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        
        // カメラの1.2m前方。WebXRなのでこの座標に「固定」されます
        const dist = 1.2;
        plane.setAttribute('position', {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist,
            z: pos.z - dir.z * dist
        });
        
        plane.setAttribute('material', 'shader:flat;side:double;transparent:true');
        plane.object3D.lookAt(pos); // 常に自分の方向を向かせる

        new THREE.TextureLoader().load(selectedImgUrl, tex => {
            const mesh = plane.getObject3D('mesh');
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
            
            const size = 0.5;
            if (selectedAspect >= 1) {
                plane.setAttribute('width', size);
                plane.setAttribute('height', size / selectedAspect);
            } else {
                plane.setAttribute('height', size);
                plane.setAttribute('width', size * selectedAspect);
            }
        });

        arWorld.appendChild(plane);

        // 状態を戻す
        selectedImgUrl = null;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,0.8)";
    });

    // 4. 保存（撮影）ボタン
    document.getElementById('shotBtn').addEventListener('click', () => {
        alert("配置が成功したら、保存機能もWebXR用に復活させましょう！");
    });
};