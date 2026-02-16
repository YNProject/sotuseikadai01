window.onload = () => {
    const scene = document.querySelector('a-scene');
    const arWorld = document.getElementById('ar-world');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const startScreen = document.getElementById('start-screen');

    let selectedImgUrl = null;
    let selectedAspect = 1;

    // スタート画面タップでAR起動（これが最も確実にカメラが動く方法です）
    startScreen.addEventListener('click', () => {
        scene.enterVR(); 
        startScreen.style.display = 'none';
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
                selectedImgUrl = c.toDataURL('image/jpeg', 0.8);
                selectedAspect = w / h;
                fileLabel.innerText = "✅ 空間をタップ！";
                fileLabel.style.background = "#2e7d32";
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    scene.addEventListener('click', (e) => {
        // ボタン類を触っている時は配置しない
        if (!selectedImgUrl || e.target.closest('.button-row')) return;

        const camObj = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        
        camObj.getWorldPosition(pos);
        camObj.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        
        // 1.5m先の座標を計算（WebXRの6DOF空間）
        const dist = 1.5;
        const targetPos = {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist, // 高さをカメラ位置に合わせる
            z: pos.z - dir.z * dist
        };

        plane.setAttribute('position', targetPos);
        plane.setAttribute('material', 'shader:flat;side:double;transparent:true');
        
        // 写真がこちらを向くように設定
        plane.object3D.lookAt(new THREE.Vector3(pos.x, targetPos.y, pos.z));

        new THREE.TextureLoader().load(selectedImgUrl, tex => {
            plane.getObject3D('mesh').material.map = tex;
            const size = 0.6;
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