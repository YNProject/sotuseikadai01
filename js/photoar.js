window.onload = () => {
    const scene = document.querySelector('a-scene');
    const arWorld = document.getElementById('ar-world');
    const mainUI = document.getElementById('main-ui');
    const startScreen = document.getElementById('start-screen');

    let selectedImgUrl = null;
    let selectedAspect = 1;

    // 1. AR開始ボタン
    startScreen.addEventListener('click', () => {
        // A-FrameにARモード開始を要求（これでカメラが起動します）
        scene.enterVR();
        startScreen.style.display = 'none';
        mainUI.style.visibility = 'visible';
    });

    // 2. 画像選択処理
    document.getElementById('fileInput').addEventListener('change', e => {
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
                document.getElementById('fileLabel').innerText = "✅ 画面タップ";
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 3. 写真配置（重要：世界の座標系に固定）
    scene.addEventListener('click', (e) => {
        if (!selectedImgUrl || e.target.closest('.ui-container')) return;

        const camObj = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        
        // カメラの現在位置と向きを取得
        camObj.getWorldPosition(pos);
        camObj.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        // 1.2m先に配置
        plane.setAttribute('position', {
            x: pos.x - dir.x * 1.2,
            y: pos.y - dir.y * 1.2,
            z: pos.z - dir.z * 1.2
        });
        
        plane.setAttribute('material', 'shader:flat;side:double;transparent:true');
        plane.object3D.lookAt(pos); // 自分の方を向かせる

        new THREE.TextureLoader().load(selectedImgUrl, tex => {
            plane.getObject3D('mesh').material.map = tex;
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
        document.getElementById('fileLabel').innerText = "① 写真選ぶ";
    });
};