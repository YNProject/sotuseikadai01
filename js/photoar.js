window.onload = () => {
    const scene = document.querySelector('a-scene');
    const arWorld = document.getElementById('ar-world');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const startScreen = document.getElementById('start-screen');

    let selectedImgUrl = null;
    let selectedAspect = 1;

    // 1. 開始処理：即座にWebXR(AR)を開始
    startScreen.addEventListener('click', () => {
        // A-FrameのXRセッションを「AR」として開始
        scene.enterVR(); // WebXRではこのメソッドがAR起動を兼ねます
        startScreen.style.display = 'none';
    });

    // 2. 画像選択（変更なし）
    fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.width; c.height = img.height;
                c.getContext('2d').drawImage(img, 0, 0);
                selectedImgUrl = c.toDataURL('image/jpeg', 0.8);
                selectedAspect = img.width / img.height;
                fileLabel.innerText = "✅ 空間をタップ！";
                fileLabel.style.background = "#2e7d32";
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 3. 配置処理
    scene.addEventListener('click', (e) => {
        if (!selectedImgUrl || e.target.closest('.ui-btn')) return;

        const camObj = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        
        // カメラの正確な位置を算出
        camObj.getWorldPosition(pos);
        camObj.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        
        // 1.2m先に固定
        const dist = 1.2;
        const planePos = {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist,
            z: pos.z - dir.z * dist
        };

        plane.setAttribute('position', planePos);
        plane.setAttribute('material', 'shader:flat;side:double;transparent:true;src:' + selectedImgUrl);
        
        // 写真を直立させ、自分の方を向かせる
        plane.object3D.lookAt(new THREE.Vector3(pos.x, planePos.y, pos.z));

        const size = 0.5;
        if (selectedAspect >= 1) {
            plane.setAttribute('width', size);
            plane.setAttribute('height', size / selectedAspect);
        } else {
            plane.setAttribute('height', size);
            plane.setAttribute('width', size * selectedAspect);
        }

        arWorld.appendChild(plane);

        selectedImgUrl = null;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,0.8)";
    });
};