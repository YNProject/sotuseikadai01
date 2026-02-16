window.onload = () => {
    const scene = document.querySelector('a-scene');
    const arWorld = document.getElementById('ar-world');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');

    let selectedImgUrl = null;
    let selectedAspect = 1;

    // 画像選択
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

    // 写真配置
    // WebXRでは「select」イベントが画面タップに相当します
    scene.addEventListener('click', (e) => {
        // UIボタンをクリックした時は配置しない
        if (!selectedImgUrl || e.target.closest('#main-ui')) return;

        const camObj = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        
        camObj.getWorldPosition(pos);
        camObj.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        // 1.5m先に固定（これで歩いて離れられるようになります）
        const dist = 1.5;
        plane.setAttribute('position', {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist,
            z: pos.z - dir.z * dist
        });
        
        plane.setAttribute('material', 'shader:flat;side:double;transparent:true');
        plane.object3D.lookAt(pos);

        new THREE.TextureLoader().load(selectedImgUrl, tex => {
            plane.getObject3D('mesh').material.map = tex;
            const size = 0.8;
            if (selectedAspect >= 1) {
                plane.setAttribute('width', size);
                plane.setAttribute('height', size / selectedAspect);
            } else {
                plane.setAttribute('height', size);
                plane.setAttribute('width', size * selectedAspect);
            }
        });

        arWorld.appendChild(plane);
        
        // リセット
        selectedImgUrl = null;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,0.7)";
    });

    // 保存ボタン（WebXRモードでのキャプチャはブラウザ制限が厳しいため、まずは配置の成功を確認しましょう）
    document.getElementById('shotBtn').addEventListener('click', () => {
        alert("配置が安定したら、このボタンで保存できるように調整します！");
    });
};