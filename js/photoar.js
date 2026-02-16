window.onload = async () => {
    const video = document.getElementById('video-background');
    const startScreen = document.getElementById('start-screen');
    const mainUI = document.getElementById('main-ui');
    const arWorld = document.getElementById('ar-world');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');

    let selectedImgUrl = null;
    let selectedAspect = 1;

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                startScreen.style.display = 'none';
                mainUI.style.display = 'flex';
            };
        } catch (err) {
            alert("カメラを許可してください");
        }
    }

    startScreen.addEventListener('click', startCamera);

    fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            selectedImgUrl = ev.target.result;
            const img = new Image();
            img.onload = () => {
                selectedAspect = img.width / img.height;
                fileLabel.innerText = "✅ 空間をタップ";
                fileLabel.style.background = "#2e7d32";
            };
            img.src = selectedImgUrl;
        };
        reader.readAsDataURL(file);
    });

    // 「どこをタップしても配置」をより確実に
    window.addEventListener('touchstart', (e) => {
        if (!selectedImgUrl || e.target.closest('.ui-btn') || startScreen.style.display !== 'none') return;

        const cameraObj = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        
        cameraObj.getWorldPosition(pos);
        cameraObj.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        
        // 目の前1mに配置 (dirの逆方向に飛ばす)
        const dist = 1.0; 
        const targetPos = {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist,
            z: pos.z - dir.z * dist
        };

        plane.setAttribute('position', targetPos);
        plane.setAttribute('material', `src: ${selectedImgUrl}; shader: flat; side: double; transparent: true;`);
        
        // 自分の方を向かせる
        plane.object3D.lookAt(pos.x, targetPos.y, pos.z);

        const size = 0.5;
        if (selectedAspect >= 1) {
            plane.setAttribute('width', size);
            plane.setAttribute('height', size / selectedAspect);
        } else {
            plane.setAttribute('height', size);
            plane.setAttribute('width', size * selectedAspect);
        }

        arWorld.appendChild(plane);

        // リセット
        selectedImgUrl = null;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,0.8)";
    }, {passive: false});
};