window.onload = async () => {
    const video = document.getElementById('video-background');
    const startScreen = document.getElementById('start-screen');
    const mainUI = document.getElementById('main-ui');
    const arWorld = document.getElementById('ar-world');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');

    let selectedImgUrl = null;
    let selectedAspect = 1;

    // カメラ起動
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            video.srcObject = stream;
            startScreen.style.display = 'none';
            mainUI.style.display = 'flex';
        } catch (err) {
            alert("カメラ失敗: " + err);
        }
    }
    startScreen.addEventListener('click', startCamera);

    // 画像選択
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
                fileLabel.innerText = "✅ 画面をタップ！";
                fileLabel.style.background = "#2e7d32";
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 配置処理
    window.addEventListener('mousedown', (e) => { // touchよりも確実に拾うためmousedown
        if (!selectedImgUrl || e.target.closest('.ui-btn') || e.target.closest('#start-screen')) return;

        const cameraEntity = document.getElementById('myCamera');
        const cameraObj = cameraEntity.object3D;
        
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        cameraObj.getWorldPosition(pos);
        cameraObj.getWorldDirection(dir);

        // 写真を作成
        const plane = document.createElement('a-plane');
        
        // 1.5m先に配置（dirはカメラが向いている方向の逆ベクトルなので -dir にする）
        const dist = 1.5;
        const targetPos = {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist,
            z: pos.z - dir.z * dist
        };

        plane.setAttribute('position', targetPos);
        // マテリアルを確実に適用
        plane.setAttribute('material', {
            shader: 'flat',
            src: selectedImgUrl,
            transparent: true,
            side: 'double'
        });
        
        // 高さを固定してカメラに向ける
        plane.object3D.lookAt(new THREE.Vector3(pos.x, targetPos.y, pos.z));

        const size = 0.8; // 少し大きくして見つけやすくする
        if (selectedAspect >= 1) {
            plane.setAttribute('width', size);
            plane.setAttribute('height', size / selectedAspect);
        } else {
            plane.setAttribute('height', size);
            plane.setAttribute('width', size * selectedAspect);
        }

        arWorld.appendChild(plane);
        
        // デバッグ用：配置した瞬間に少し色を変えるなどのフィードバックがあると良い
        console.log("配置完了:", targetPos);

        selectedImgUrl = null;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,0.8)";
    });
};