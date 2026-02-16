window.onload = () => {
    const scene = document.querySelector('a-scene');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const shotBtn = document.getElementById('shotBtn');
    const startScreen = document.getElementById('start-screen');
    const mainUI = document.getElementById('main-ui');

    let selectedImgUrl = null;
    let canPlace = false;
    let appStarted = false;

    // 1. スタート画面制御
    startScreen.addEventListener('click', () => {
        startScreen.style.opacity = '0';
        setTimeout(() => {
            startScreen.style.display = 'none';
            mainUI.style.display = 'flex';
            appStarted = true;
        }, 400);
    });

    // 2. 画像選択・リサイズ
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
                selectedImgUrl = c.toDataURL('image/jpeg', 0.9);
                canPlace = true;
                fileLabel.innerText = "✅ 画面をタップ！";
                fileLabel.style.background = "#2e7d32";
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 3. AR平面の配置
    function addPhoto(e) {
        if (!appStarted || e.target.closest('.ui-container')) return;
        if (!selectedImgUrl || !canPlace) return;

        const camObj = document.getElementById('myCamera').object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();

        camObj.getWorldPosition(pos);
        camObj.getWorldDirection(dir);

        const plane = document.createElement('a-plane');
        plane.setAttribute('material', 'shader:flat;side:double;transparent:true');
        const dist = 1.2;
        plane.setAttribute('position', {
            x: pos.x - dir.x * dist,
            y: pos.y - dir.y * dist,
            z: pos.z - dir.z * dist
        });

        scene.appendChild(plane);

        new THREE.TextureLoader().load(selectedImgUrl, tex => {
            const mesh = plane.getObject3D('mesh');
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
            const a = tex.image.width / tex.image.height;
            const size = 0.5;
            if (a >= 1) { plane.setAttribute('width', size); plane.setAttribute('height', size / a); }
            else { plane.setAttribute('height', size); plane.setAttribute('width', size * a); }
            plane.object3D.lookAt(pos);
        });

        canPlace = false;
        fileLabel.innerText = "① 写真を選ぶ";
        fileLabel.style.background = "rgba(0,0,0,.8)";
    }

    window.addEventListener('mousedown', addPhoto);
    window.addEventListener('touchstart', addPhoto, {passive: false});

    // 4. 【決定版】横伸び・横潰れを修正した保存ロジック
    shotBtn.addEventListener('click', () => {
        try {
            const video = document.querySelector('video');
            const glCanvas = scene.canvas;

            // 再描画を強制して最新状態をCanvasに送る
            scene.renderer.render(scene.object3D, scene.camera);

            // 【ここがポイント】
            // window.innerWidthではなく、ビデオ要素が実際に画面を占めているサイズ(CSS)を基準にする
            const vWidth = video.clientWidth;
            const vHeight = video.clientHeight;

            // ビデオの元データ解像度
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            // 保存用のキャンバス。
            // 縦横比を「プレビューで見ているビデオの比率」に完全に合わせる
            const canvas = document.createElement('canvas');
            canvas.width = vWidth;
            canvas.height = vHeight;
            const ctx = canvas.getContext('2d');

            // クロップ計算（Cover設定）
            const videoAspect = vw / vh;
            const screenAspect = vWidth / vHeight;
            let sx, sy, sWidth, sHeight;

            if (videoAspect > screenAspect) {
                // ビデオの方が横長（左右を削る）
                sWidth = vh * screenAspect;
                sHeight = vh;
                sx = (vw - sWidth) / 2;
                sy = 0;
            } else {
                // ビデオの方が縦長（上下を削る）
                sWidth = vw;
                sHeight = vw / screenAspect;
                sx = 0;
                sy = (vh - sHeight) / 2;
            }

            // 背景（カメラ）を描画
            ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, vWidth, vHeight);
            
            // AR（ラーメンなど）を描画
            // 画面サイズ(vWidth, vHeight)に引き伸ばしてピッタリ重ねる
            ctx.drawImage(glCanvas, 0, 0, vWidth, vHeight);

            const url = canvas.toDataURL('image/png');
            saveImage(url);

        } catch (e) {
            console.error("Capture failed:", e);
        }
    });

    async function saveImage(url) {
        const f = document.createElement('div');
        f.style.cssText = 'position:fixed;inset:0;background:white;z-index:9999;pointer-events:none;';
        document.body.appendChild(f);
        setTimeout(() => { f.style.transition='opacity .4s'; f.style.opacity=0; setTimeout(()=>f.remove(),400); }, 50);

        if (navigator.share) {
            try {
                const blob = await (await fetch(url)).blob();
                const file = new File([blob], `ar-${Date.now()}.png`, { type: 'image/png' });
                await navigator.share({ files: [file] });
            } catch (e) {
                // キャンセル時などは何もしない
            }
        } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = `ar-${Date.now()}.png`;
            a.click();
        }
    }
};