window.onload = () => {
    const scene = document.querySelector('a-scene');
    const arWorld = document.getElementById('ar-world');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const startScreen = document.getElementById('start-screen');

    let selectedImgUrl = null;
    let selectedAspect = 1;

    // --- ここが重要：AR開始の確実なトリガー ---
    const startAR = () => {
        // A-Frameが準備完了するのを待ってからVR(AR)モードに入る
        if (scene.hasLoaded) {
            scene.enterVR();
        } else {
            scene.addEventListener('loaded', () => scene.enterVR());
        }
        startScreen.style.display = 'none';
        // iOS/Android のタップ音対策などで必要な場合があるため
        window.removeEventListener('click', startAR);
    };

    startScreen.addEventListener('click', startAR);
    // ---------------------------------------

    // 画像選択処理（ここは変更なし）
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

    // 写真配置処理
    scene.addEventListener('click', (e) => {
        // ボタン類をクリックした時は配置しない
        if (!selectedImgUrl || e.target.closest('.ui-btn')) return;

        const camObj = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        
        camObj.getWorldPosition(pos);
        camObj.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        const dist = 1.2;
        plane.setAttribute('position', {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist,
            z: pos.z - dir.z * dist
        });
        
        plane.setAttribute('material', 'shader:flat;side:double;transparent:true');
        plane.object3D.lookAt(pos);

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
        selectedImgUrl = null;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,0.8)";
    });
};