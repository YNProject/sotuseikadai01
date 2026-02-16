window.onload = () => {
    const scene = document.querySelector('a-scene');
    const arWorld = document.getElementById('ar-world');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const startScreen = document.getElementById('start-screen');
    const mainUI = document.getElementById('main-ui');

    let selectedImgUrl = null;
    let selectedAspect = 1;

    // 1. 開始処理（VRをスキップしてARを強制）
    startScreen.addEventListener('click', () => {
        // VRモードを経由せず、直接WebXRのARセッションを要求
        scene.enterVR(); 
        startScreen.style.display = 'none';
        mainUI.style.display = 'flex';
    });

    // 2. 画像選択
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

    // 3. 空間配置
    scene.addEventListener('click', (e) => {
        if (!selectedImgUrl || e.target.closest('.ui-btn')) return;

        const camera = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        camera.getWorldPosition(pos);
        camera.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        const dist = 1.2;
        const targetPos = {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist,
            z: pos.z - dir.z * dist
        };

        plane.setAttribute('position', targetPos);
        plane.setAttribute('material', 'shader:flat;side:double;transparent:true;src:' + selectedImgUrl);
        
        // 直立してカメラを向く
        plane.object3D.lookAt(new THREE.Vector3(pos.x, targetPos.y, pos.z));

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