window.onload = () => {
    const scene = document.querySelector('a-scene');
    const arWorld = document.getElementById('ar-world');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const shotBtn = document.getElementById('shotBtn');

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
                selectedImgUrl = ev.target.result;
                selectedAspect = img.width / img.height;
                fileLabel.innerText = "✅ 画面をタップ！";
                fileLabel.style.background = "#2e7d32";
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 空間配置
    scene.addEventListener('click', (e) => {
        if (!selectedImgUrl || e.target.closest('#main-ui')) return;

        const camera = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        
        camera.getWorldPosition(pos);
        camera.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        const dist = 1.5;
        
        plane.setAttribute('position', {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist,
            z: pos.z - dir.z * dist
        });

        plane.setAttribute('material', `src: ${selectedImgUrl}; shader: flat; side: double; transparent: true;`);
        plane.object3D.lookAt(pos);

        const size = 0.6;
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

    // 撮影機能
    shotBtn.addEventListener('click', () => {
        const video = document.querySelector('video');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        // 1. カメラ映像を描画
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 2. A-Frameのレンダラーから3Dオブジェクトを重ねる
        const sceneCanvas = scene.renderer.domElement;
        ctx.drawImage(sceneCanvas, 0, 0, canvas.width, canvas.height);

        // 3. ダウンロード
        const link = document.createElement('a');
        link.download = 'ar-photo.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
};